import { agentGenerate } from './agentLlmClient'
import {
  buildDecisionSystemPrompt,
  buildFinalResponseSystemPrompt,
  buildToolArgsSystemPrompt,
  buildUserPrompt,
} from './agent.prompt'
import type { BaseTool } from './tools/base.tool'
import { parseDecisionResponse, parseFinalResponse } from './types'
import type {
  AgentMessage,
  AgentRunResult,
  AgentRunOptions,
  ToolExecution,
  DecisionResponse,
  FinalResponse,
} from './types'

const MAX_ITERATIONS = 16
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 500

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim()
}

async function callLlmWithRetry<T>(
  parse: (text: string) => T,
  input: { system: string; prompt: string },
): Promise<T> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const text = await agentGenerate(input)
      const cleaned = stripCodeFences(text)
      return parse(cleaned)
    } catch (error) {
      lastError = error as Error
      console.warn(`[Agent] LLM attempt ${attempt + 1}/${MAX_RETRIES} failed:`, (error as Error).message)
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)))
      }
    }
  }
  throw lastError || new Error('LLM call failed after retries')
}

export class Agent {
  private history: AgentMessage[] = []
  private tools: BaseTool[]
  private toolRecord: Record<string, BaseTool> = {}

  constructor(tools: BaseTool[] = []) {
    this.tools = tools
    for (const tool of tools) {
      this.toolRecord[tool.name] = tool
    }
  }

  getHistory(): AgentMessage[] {
    return [...this.history]
  }

  clearHistory(): void {
    this.history = []
  }

  async run(userInput: string, options?: AgentRunOptions): Promise<AgentRunResult> {
    console.info(`[Agent] Starting with input (${userInput.length} chars)`)

    this.history.push({ type: 'user', content: userInput })

    const toolExecutions: ToolExecution[] = []
    const decisionSystemPrompt = buildDecisionSystemPrompt(this.tools)

    const buildCurrentPrompt = (): string => {
      if (toolExecutions.length === 0) return userInput

      const toolsSummary = toolExecutions
        .map(
          (t) =>
            `- ${t.name} [${t.didSucceed ? 'SUCCESS' : 'FAILED'}]: ${JSON.stringify(t.output)}`,
        )
        .join('\n')

      return `${userInput}\n\n## Tools Already Called\n${toolsSummary}\n\nIMPORTANT: If a tool succeeded, the task for that tool is COMPLETE. Do NOT call the same tool again. Choose "respond" to finish.`
    }

    try {
      for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        const userPrompt = buildUserPrompt(this.history, buildCurrentPrompt())

        const decision = await callLlmWithRetry<DecisionResponse>(
          (text) => parseDecisionResponse(text),
          { system: decisionSystemPrompt, prompt: userPrompt },
        )

        console.info(`[Agent] Iteration ${iteration}: choice=${decision.choice}`)

        const lastTool = toolExecutions.at(-1)
        const isLooping = lastTool?.didSucceed && lastTool.name === decision.choice

        if (decision.choice === 'respond' || isLooping) {
          const reasoning = isLooping
            ? `Task complete — ${lastTool?.name} succeeded`
            : decision.reasoning

          const response = await this.callFinalResponseLLM(userPrompt, reasoning)

          this.history.push({
            type: 'assistant',
            tools: toolExecutions,
            response,
            isError: false,
          })

          return { response, history: this.getHistory(), isError: false }
        }

        const tool = this.toolRecord[decision.choice]
        if (!tool) throw new Error(`Tool not found: ${decision.choice}`)

        let toolArgs: Record<string, unknown> = {}
        if (tool.parameters) {
          toolArgs = await this.callToolArgsLLM(tool, userPrompt, decision.reasoning)
        }

        const toolResult = await tool.execute(toolArgs)

        const execution: ToolExecution = {
          name: tool.name,
          displayName: tool.displayName,
          input: toolArgs,
          output: toolResult.output,
          didSucceed: toolResult.success,
        }
        toolExecutions.push(execution)
        options?.onToolExecuted?.(execution)

        console.info(`[Agent] Tool ${tool.name}: ${toolResult.success ? 'SUCCESS' : 'FAILED'}`)

        const stopTool = this.toolRecord['stop'] as any
        if (stopTool?.getShouldStop?.()) {
          const hasWritten = toolExecutions.some(
            (t) => t.name === 'write_to_text_field' && t.didSucceed,
          )
          const response = hasWritten ? 'Done!' : ''
          this.history.push({
            type: 'assistant',
            tools: toolExecutions,
            response,
            isError: false,
          })
          return { response, history: this.getHistory(), isError: false }
        }
      }

      throw new Error('Maximum iterations reached without completing the task.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.'
      console.error(`[Agent] Error: ${message}`)
      this.history.push({
        type: 'assistant',
        tools: toolExecutions,
        response: message,
        isError: true,
      })
      return { response: message, history: this.getHistory(), isError: true }
    }
  }

  private async callFinalResponseLLM(prompt: string, reasoning: string): Promise<string> {
    const system = buildFinalResponseSystemPrompt(reasoning)
    const result = await callLlmWithRetry<FinalResponse>(
      (text) => parseFinalResponse(text),
      { system, prompt },
    )
    return result.response
  }

  private async callToolArgsLLM(
    tool: BaseTool,
    prompt: string,
    reasoning: string,
  ): Promise<Record<string, unknown>> {
    const system = buildToolArgsSystemPrompt(tool, reasoning)
    return callLlmWithRetry<Record<string, unknown>>(
      (text) => JSON.parse(text),
      { system, prompt },
    )
  }
}

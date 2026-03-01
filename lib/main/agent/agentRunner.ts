import { agentGenerate } from './agentLlmClient'
import {
  buildDecisionSystemPrompt,
  buildFinalResponseSystemPrompt,
  buildToolArgsSystemPrompt,
  formatPromptWithHistory,
} from './prompts'
import { TOOL_DEFINITIONS, executeTool, getShouldStop, resetToolState } from './tools'
import { parseDecisionResponse, parseFinalResponse } from './types'
import type { AgentRunResult, ToolExecution } from './types'

const MAX_ITERATIONS = 8
const MAX_RETRIES = 2

function stripCodeFences(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
}

async function callLlmWithRetry<T>(
  parse: (text: string) => T,
  input: { system: string; prompt: string },
): Promise<T> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const text = await agentGenerate(input)
      const cleaned = stripCodeFences(text)
      return parse(cleaned)
    } catch (error) {
      lastError = error as Error
      console.warn(`[AgentRunner] LLM attempt ${attempt + 1} failed:`, error)
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
      }
    }
  }
  throw lastError || new Error('LLM call failed after retries')
}

export async function runAgent(userInput: string): Promise<AgentRunResult> {
  console.info(`[AgentRunner] Starting agent with input (${userInput.length} chars)`)
  resetToolState()

  const toolExecutions: ToolExecution[] = []
  const decisionSystem = buildDecisionSystemPrompt()

  try {
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      const currentPrompt = formatPromptWithHistory(toolExecutions, userInput)

      const decision = await callLlmWithRetry(
        (text) => parseDecisionResponse(text),
        { system: decisionSystem, prompt: currentPrompt },
      )

      console.info(`[AgentRunner] Iteration ${iteration}: choice=${decision.choice}`)

      const lastTool = toolExecutions.at(-1)
      const isLooping = lastTool?.didSucceed && lastTool.name === decision.choice

      if (decision.choice === 'respond' || isLooping) {
        const reasoning = isLooping ? `Task complete — ${lastTool?.name} succeeded` : decision.reasoning
        const responseSystem = buildFinalResponseSystemPrompt(reasoning)

        const finalResponse = await callLlmWithRetry(
          (text) => parseFinalResponse(text),
          { system: responseSystem, prompt: currentPrompt },
        )

        return {
          response: finalResponse.response,
          isError: false,
          textWritten: toolExecutions.some(t => t.name === 'write_to_text_field' && t.didSucceed),
        }
      }

      const toolDef = TOOL_DEFINITIONS.find(t => t.name === decision.choice)
      if (!toolDef) throw new Error(`Unknown tool: ${decision.choice}`)

      let toolArgs: Record<string, unknown> = {}
      if (toolDef.parameters) {
        const argsSystem = buildToolArgsSystemPrompt(
          toolDef.name, toolDef.description, toolDef.parameters, decision.reasoning,
        )
        toolArgs = await callLlmWithRetry(
          (text) => JSON.parse(text),
          { system: argsSystem, prompt: currentPrompt },
        )
      }

      const result = await executeTool(toolDef.name, toolArgs)
      toolExecutions.push({
        name: toolDef.name,
        input: toolArgs,
        output: result.output,
        didSucceed: result.success,
      })
      console.info(`[AgentRunner] Tool ${toolDef.name}: ${result.success ? 'SUCCESS' : 'FAILED'}`)

      if (getShouldStop()) {
        return {
          response: '',
          isError: false,
          textWritten: toolExecutions.some(t => t.name === 'write_to_text_field' && t.didSucceed),
        }
      }
    }

    throw new Error('Maximum iterations reached without completing the task.')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.'
    console.error(`[AgentRunner] Error: ${message}`)
    return { response: message, isError: true, textWritten: false }
  }
}

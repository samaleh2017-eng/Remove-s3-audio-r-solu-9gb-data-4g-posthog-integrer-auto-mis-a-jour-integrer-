import { TOOL_DEFINITIONS } from './tools'
import type { ToolExecution } from './types'

export function buildDecisionSystemPrompt(): string {
  const toolNames = TOOL_DEFINITIONS.map(t => t.name)
  const toolDescriptions = TOOL_DEFINITIONS.map(
    t => `- ${t.name}: ${t.description}`
  ).join('\n')

  return `You are a helpful assistant that decides how to respond to user requests.

## Available Tools
${toolDescriptions}

## Your Task
Analyze the user's request, then decide what to do next.

## Response Format
Respond with JSON only:
{
  "reasoning": "Brief explanation of why you chose this action",
  "choice": "respond" | "${toolNames.join('" | "')}"
}

## Rules
- If the user asks you to write, reply, or compose something, ALWAYS call get_context first.
- After getting context, call draft with your text, then immediately call write_to_text_field.
- Use "respond" only when there's nothing to write (e.g., answering a factual question).
- If a tool succeeded, do NOT call the same tool again.
- The current date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`
}

export function buildFinalResponseSystemPrompt(reasoning: string): string {
  return `You are a helpful assistant. You are responding because: ${reasoning}

## Response Format
Respond with JSON only:
{
  "response": "What you want to say to the user"
}

## Rules
- Be concise and helpful.
- If you just wrote text to a field, confirm briefly (e.g., "Done!").
- NEVER repeat draft content in your response.`
}

export function buildToolArgsSystemPrompt(
  toolName: string,
  toolDescription: string,
  parametersSchema: Record<string, { type: string; description: string }> | undefined,
  reasoning: string,
): string {
  return `You need to provide arguments for the "${toolName}" tool.
Reason: ${reasoning}

## Tool Description
${toolDescription}

## Parameters
${parametersSchema ? JSON.stringify(parametersSchema, null, 2) : 'No parameters needed. Respond with: {}'}

## Response Format
Respond with JSON matching the parameters above.`
}

export function formatPromptWithHistory(
  toolExecutions: ToolExecution[],
  originalInput: string,
): string {
  if (toolExecutions.length === 0) return originalInput

  const toolsSummary = toolExecutions
    .map(t => `- ${t.name} [${t.didSucceed ? 'SUCCESS' : 'FAILED'}]: ${JSON.stringify(t.output)}`)
    .join('\n')

  return `${originalInput}\n\n## Tools Already Called\n${toolsSummary}\n\nIMPORTANT: If a tool succeeded, do NOT call the same tool again. Choose "respond" to finish.`
}

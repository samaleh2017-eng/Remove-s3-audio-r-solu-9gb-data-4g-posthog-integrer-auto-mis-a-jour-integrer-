import type { BaseTool } from './tools/base.tool'
import type { AgentMessage } from './types'

const getCommonPromptContext = (): string => {
  const now = new Date()
  const timezoneAbbr = now
    .toLocaleTimeString('en-US', { timeZoneName: 'short' })
    .split(' ')
    .pop()
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  return `
CRITICAL CONTEXT:
The current date is ${dateStr} at ${timeStr} ${timezoneAbbr}.
`
}

export const buildDecisionSystemPrompt = (tools: BaseTool[]): string => {
  const toolNames = tools.map((t) => t.name)
  const toolDescriptions = tools.map((t) => `- ${t.name}: ${t.description}`).join('\n')

  return `You are a helpful assistant that decides how to respond to user requests.

## Available Tools
${toolDescriptions}

## Your Task
Analyze the user's request and conversation history, then decide what to do next.

## Response Format
Respond with JSON only:
{
  "reasoning": "Brief explanation of why you chose this action",
  "choice": "respond" | "${toolNames.join('" | "')}"
}

## Rules
- For ANY request involving writing, replying, composing, or drafting text: ALWAYS follow this sequence: get_context → draft → write_to_text_field. Never skip steps.
- Use "respond" ONLY when the user asks a pure factual question that requires no text to be inserted (e.g., "What's 2+2?"). When in doubt, prefer writing to the text field.
- If you're not sure what the user is referring to, use get_context to gather more information.
- After ANY tool succeeds, do NOT call the same tool again — choose "respond" or the next logical tool.
- If a tool FAILED, try an alternative approach or choose "stop".

${getCommonPromptContext()}
`
}

export const buildFinalResponseSystemPrompt = (reasoning: string): string => {
  return `You are a helpful assistant that responds to the user.
You are responding to the user because of this reason: ${reasoning}

## Response Format
Respond with JSON only:
{
  "response": "What you want to say to the user"
}

## Rules
- Be concise and helpful.
- If you just executed a tool, briefly confirm what you did or ask for next steps as appropriate.
- If you're answering a question, provide the answer directly.
- CRITICAL: You must NEVER include draft content in your responses. Drafts are displayed separately by the system. Your response should only contain a brief message like "Done!" — never the draft text itself.

${getCommonPromptContext()}
`
}

export const buildToolArgsSystemPrompt = (
  tool: BaseTool,
  reasoning: string,
): string => {
  const params = tool.parameters
  return `You are a helpful assistant. You need to provide arguments for the "${tool.name}" tool.
The reason for calling this tool is: ${reasoning}

## Tool Description
${tool.description}

## Parameters
${params ? JSON.stringify(params, null, 2) : 'No parameters needed. Respond with: {}'}

## Response Format
Respond with JSON matching the parameters above.

## Rules
- Provide all required parameters.
- Use appropriate values based on the conversation context.

${getCommonPromptContext()}
`
}

export const formatHistory = (messages: AgentMessage[]): string => {
  return messages
    .map((msg) => {
      if (msg.type === 'user') return `User: ${msg.content}`
      const toolsSummary =
        msg.tools.length > 0
          ? `[Tools used: ${msg.tools.map((t) => `${t.name}(${JSON.stringify(t.input)}) → ${JSON.stringify(t.output)}`).join(', ')}]\n`
          : ''
      return `Assistant: ${toolsSummary}${msg.response}`
    })
    .join('\n\n')
}

export const buildUserPrompt = (
  history: AgentMessage[],
  currentInput: string,
): string => {
  const historyText =
    history.length > 0
      ? `## Conversation History\n${formatHistory(history)}\n\n`
      : ''
  return `${historyText}## Current User Input\n${currentInput}`
}

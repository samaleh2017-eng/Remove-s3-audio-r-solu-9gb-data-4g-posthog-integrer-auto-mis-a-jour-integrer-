export type DecisionResponse = {
  reasoning: string
  choice: string
}

export type FinalResponse = {
  response: string
}

export type ToolResult = {
  success: boolean
  output: Record<string, unknown>
}

export type ToolExecution = {
  name: string
  displayName: string
  input: Record<string, unknown>
  output?: Record<string, unknown>
  didSucceed: boolean
}

export type UserMessage = {
  type: 'user'
  content: string
}

export type AssistantMessage = {
  type: 'assistant'
  tools: ToolExecution[]
  response: string
  isError: boolean
}

export type AgentMessage = UserMessage | AssistantMessage

export type AgentRunResult = {
  response: string
  isError: boolean
  history: AgentMessage[]
}

export type AgentRunOptions = {
  onToolExecuted?: (tool: ToolExecution) => void
}

export type AgentWindowMessageSender = 'me' | 'agent'

export type AgentWindowMessage = {
  text: string
  sender: AgentWindowMessageSender
  isError?: boolean
  tools?: string[]
  draft?: string
}

export type AgentWindowState = {
  messages: AgentWindowMessage[]
}

export function parseDecisionResponse(text: string): DecisionResponse {
  const obj = JSON.parse(text)
  if (typeof obj.reasoning !== 'string' || typeof obj.choice !== 'string') {
    throw new Error('Invalid decision response: missing reasoning or choice')
  }
  return { reasoning: obj.reasoning, choice: obj.choice }
}

export function parseFinalResponse(text: string): FinalResponse {
  const obj = JSON.parse(text)
  if (typeof obj.response !== 'string') {
    throw new Error('Invalid final response: missing response field')
  }
  return { response: obj.response }
}

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
  input: Record<string, unknown>
  output?: Record<string, unknown>
  didSucceed: boolean
}

export type AgentRunResult = {
  response: string
  isError: boolean
  textWritten: boolean
}

export function parseDecisionResponse(text: string): DecisionResponse {
  const obj = JSON.parse(text)
  if (typeof obj.reasoning !== 'string' || typeof obj.choice !== 'string') {
    throw new Error(`Invalid decision response: missing reasoning or choice`)
  }
  return { reasoning: obj.reasoning, choice: obj.choice }
}

export function parseFinalResponse(text: string): FinalResponse {
  const obj = JSON.parse(text)
  if (typeof obj.response !== 'string') {
    throw new Error(`Invalid final response: missing response field`)
  }
  return { response: obj.response }
}

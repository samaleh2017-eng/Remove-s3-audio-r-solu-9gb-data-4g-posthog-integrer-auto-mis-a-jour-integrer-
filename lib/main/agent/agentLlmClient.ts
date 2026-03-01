import { itoHttpClient } from '../../clients/itoHttpClient'
import { getAdvancedSettings } from '../store'

export interface AgentLlmInput {
  system: string
  prompt: string
  jsonSchema?: Record<string, unknown>
}

export async function agentGenerate(input: AgentLlmInput): Promise<string> {
  const { llm } = getAdvancedSettings()

  const response = await itoHttpClient.post('/agent/generate', {
    system: input.system,
    prompt: input.prompt,
    jsonResponse: input.jsonSchema ? {
      name: 'agent_response',
      description: 'Agent structured response',
      schema: input.jsonSchema,
    } : null,
    llmSettings: {
      llmProvider: llm?.llmProvider,
      llmModel: llm?.llmModel,
      llmTemperature: 0.3,
    },
  }, { requireAuth: true })

  if (!response.success) {
    throw new Error(response.error || 'Agent LLM call failed')
  }

  return response.text
}

import { itoHttpClient } from '../../clients/itoHttpClient'
import { getAdvancedSettings } from '../store'
import { DEFAULT_ADVANCED_SETTINGS } from '../../constants/generated-defaults'

export interface AgentLlmInput {
  system: string
  prompt: string
}

export async function agentGenerate(input: AgentLlmInput): Promise<string> {
  const { llm } = getAdvancedSettings()

  const llmProvider = llm?.llmProvider || DEFAULT_ADVANCED_SETTINGS.llmProvider
  const llmModel = llm?.llmModel || DEFAULT_ADVANCED_SETTINGS.llmModel

  console.info(`[AgentLLM] Calling /agent/generate (provider=${llmProvider}, model=${llmModel})`)

  const response = await itoHttpClient.post(
    '/agent/generate',
    {
      system: input.system,
      prompt: input.prompt,
      jsonResponse: {
        name: 'agent_response',
        description: 'Agent structured response',
        schema: {},
      },
      llmSettings: {
        llmProvider,
        llmModel,
        llmTemperature: 0.3,
      },
    },
    { requireAuth: true },
  )

  if (!response.success) {
    const errorMsg = response.error || 'Agent LLM call failed'
    console.error(`[AgentLLM] Server error: ${errorMsg}`)
    throw new Error(errorMsg)
  }

  if (!response.text || typeof response.text !== 'string') {
    throw new Error('Agent LLM returned empty or invalid text')
  }

  return response.text
}

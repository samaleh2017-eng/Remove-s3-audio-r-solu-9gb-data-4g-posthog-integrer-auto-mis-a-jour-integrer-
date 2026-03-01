import type { FastifyInstance } from 'fastify'
import { getLlmProvider } from '../clients/providerUtils.js'
import { DEFAULT_ADVANCED_SETTINGS } from '../constants/generated-defaults.js'
import type { SupabaseJwtPayload } from '../auth/supabaseJwt.js'

interface AgentGenerateBody {
  system?: string | null
  prompt: string
  jsonResponse?: {
    name: string
    description: string
    schema: Record<string, unknown>
  } | null
  llmSettings?: {
    llmProvider?: string
    llmModel?: string
    llmTemperature?: number
  } | null
}

export const registerAgentRoutes = async (
  fastify: FastifyInstance,
  options: { requireAuth: boolean },
) => {
  const { requireAuth } = options

  fastify.post('/agent/generate', async (request, reply) => {
    try {
      const user = (request as any).user as SupabaseJwtPayload | undefined
      if (requireAuth && !user?.sub) {
        reply.code(401).send({ success: false, error: 'Unauthorized' })
        return
      }

      const body = request.body as AgentGenerateBody
      if (!body?.prompt || typeof body.prompt !== 'string') {
        reply.code(400).send({ success: false, error: 'Missing prompt field' })
        return
      }

      const llmProviderName = body.llmSettings?.llmProvider || DEFAULT_ADVANCED_SETTINGS.llmProvider
      const llmModel = body.llmSettings?.llmModel || DEFAULT_ADVANCED_SETTINGS.llmModel
      const llmTemperature = body.llmSettings?.llmTemperature ?? 0.3

      const llmProvider = getLlmProvider(llmProviderName)

      let systemPrompt = body.system || 'You are a helpful assistant.'
      if (body.jsonResponse) {
        systemPrompt += `\n\nYou MUST respond with valid JSON only. No markdown, no code fences, no explanation outside the JSON object.\nExpected JSON schema: ${JSON.stringify(body.jsonResponse.schema)}`
      }

      const result = await llmProvider.adjustTranscript(body.prompt, {
        temperature: llmTemperature,
        model: llmModel,
        prompt: systemPrompt,
      })

      reply.send({
        success: true,
        text: result,
      })
    } catch (error: any) {
      console.error('Agent generate failed:', error)
      reply.code(500).send({
        success: false,
        error: error?.message || 'Failed to generate text',
      })
    }
  })
}

import type { FastifyInstance } from 'fastify'
import { getLlmProvider, getAvailableLlmProviders } from '../clients/providerUtils.js'
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

const GENERATE_TIMEOUT_MS = 60_000

export const registerAgentRoutes = async (
  fastify: FastifyInstance,
  options: { requireAuth: boolean },
) => {
  const { requireAuth } = options

  fastify.post('/agent/generate', async (request, reply) => {
    const startMs = Date.now()
    const requestId = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    try {
      const user = (request as any).user as SupabaseJwtPayload | undefined
      console.info(`[AgentRoute] ${requestId} — POST /agent/generate (user=${user?.sub || 'anon'})`)

      if (requireAuth && !user?.sub) {
        console.warn(`[AgentRoute] ${requestId} — Unauthorized`)
        reply.code(401).send({ success: false, error: 'Unauthorized' })
        return
      }

      const body = request.body as AgentGenerateBody
      if (!body?.prompt || typeof body.prompt !== 'string') {
        console.warn(`[AgentRoute] ${requestId} — Missing or invalid prompt`)
        reply.code(400).send({ success: false, error: 'Missing prompt field' })
        return
      }

      let llmProviderName = body.llmSettings?.llmProvider || DEFAULT_ADVANCED_SETTINGS.llmProvider
      const llmModel = body.llmSettings?.llmModel || DEFAULT_ADVANCED_SETTINGS.llmModel
      const llmTemperature = body.llmSettings?.llmTemperature ?? 0.3

      console.info(
        `[AgentRoute] ${requestId} — Config: provider="${llmProviderName}", model="${llmModel}", temp=${llmTemperature}`,
      )
      console.info(
        `[AgentRoute] ${requestId} — Prompt: system=${body.system?.length ?? 0} chars, user=${body.prompt.length} chars`,
      )

      let llmProvider
      try {
        llmProvider = getLlmProvider(llmProviderName)
      } catch (providerError: any) {
        console.warn(
          `[AgentRoute] ${requestId} — Provider "${llmProviderName}" unavailable: ${providerError.message}`,
        )

        const available = getAvailableLlmProviders()
        console.info(`[AgentRoute] ${requestId} — Available providers: [${available.join(', ')}]`)

        if (available.length > 0) {
          const fallback = available[0]
          console.info(`[AgentRoute] ${requestId} — Falling back to provider "${fallback}"`)
          llmProviderName = fallback
          llmProvider = getLlmProvider(fallback)
        } else {
          console.error(`[AgentRoute] ${requestId} — No LLM providers available`)
          reply.code(503).send({
            success: false,
            error: 'No LLM providers are currently available. Check server configuration.',
          })
          return
        }
      }

      let systemPrompt = body.system || 'You are a helpful assistant.'
      if (body.jsonResponse) {
        systemPrompt += `\n\nYou MUST respond with valid JSON only. No markdown, no code fences, no explanation outside the JSON object.\nExpected JSON schema: ${JSON.stringify(body.jsonResponse.schema)}`
      }

      const llmStartMs = Date.now()
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null
      const result = await Promise.race([
        llmProvider.adjustTranscript(body.prompt, {
          temperature: llmTemperature,
          model: llmModel,
          prompt: systemPrompt,
        }),
        new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(
            () => reject(new Error(`LLM call timed out after ${GENERATE_TIMEOUT_MS / 1000}s`)),
            GENERATE_TIMEOUT_MS,
          )
        }),
      ]).finally(() => {
        if (timeoutHandle) clearTimeout(timeoutHandle)
      })
      const llmElapsed = Date.now() - llmStartMs

      const totalElapsed = Date.now() - startMs
      console.info(
        `[AgentRoute] ${requestId} — OK (llm=${llmElapsed}ms, total=${totalElapsed}ms, result=${typeof result === 'string' ? result.length : 0} chars)`,
      )

      reply.send({
        success: true,
        text: result,
      })
    } catch (error: any) {
      const totalElapsed = Date.now() - startMs
      console.error(`[AgentRoute] ${requestId} — FAILED (${totalElapsed}ms):`, error?.message || error)

      const isTimeout = error?.message?.includes('timed out')
      reply.code(isTimeout ? 504 : 500).send({
        success: false,
        error: error?.message || 'Failed to generate text',
      })
    }
  })
}

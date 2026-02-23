import type { FastifyInstance } from 'fastify'
import { sonioxClient } from '../clients/sonioxClient.js'
import { getLlmProvider } from '../clients/providerUtils.js'
import { DEFAULT_ADVANCED_SETTINGS } from '../constants/generated-defaults.js'
import { ItoMode } from '../generated/ito_pb.js'
import { getPromptForMode, createUserPromptWithContext } from './ito/helpers.js'
import { applyReplacements, filterLeakedContext } from './ito/llmUtils.js'
import type { ItoContext } from './ito/types.js'
import type { SupabaseJwtPayload } from '../auth/supabaseJwt.js'

interface AdjustTranscriptBody {
  transcript: string
  mode: 'transcribe' | 'edit'
  context?: {
    windowTitle?: string
    appName?: string
    contextText?: string
    browserUrl?: string
    browserDomain?: string
    tonePrompt?: string
    userDetailsContext?: string
  }
  llmSettings?: {
    llmProvider?: string
    llmModel?: string
    llmTemperature?: number
    transcriptionPrompt?: string
    editingPrompt?: string
  }
  replacements?: Array<{
    fromText: string
    toText: string
  }>
}

export const registerSonioxRoutes = async (
  fastify: FastifyInstance,
  options: { requireAuth: boolean },
) => {
  const { requireAuth } = options

  fastify.post('/soniox/temp-key', async (request, reply) => {
    try {
      const user = (request as any).user as SupabaseJwtPayload | undefined
      if (requireAuth && !user?.sub) {
        reply.code(401).send({ success: false, error: 'Unauthorized' })
        return
      }

      if (!sonioxClient || !sonioxClient.isAvailable) {
        reply.code(503).send({ success: false, error: 'Soniox not configured' })
        return
      }

      const tempKey = await sonioxClient.createTemporaryKey(3600)

      reply.send({
        success: true,
        key: tempKey,
        expires_in_seconds: 3600,
      })
    } catch (error: any) {
      fastify.log.error({ err: error }, 'Failed to generate Soniox temp key')
      reply.code(500).send({
        success: false,
        error: error?.message || 'Failed to generate temporary key',
      })
    }
  })

  fastify.post('/adjust-transcript', async (request, reply) => {
    try {
      const user = (request as any).user as SupabaseJwtPayload | undefined
      if (requireAuth && !user?.sub) {
        reply.code(401).send({ success: false, error: 'Unauthorized' })
        return
      }

      const body = request.body as AdjustTranscriptBody
      if (!body?.transcript || typeof body.transcript !== 'string') {
        reply.code(400).send({ success: false, error: 'Missing transcript field' })
        return
      }

      const trimmedTranscript = body.transcript.trim()
      if (trimmedTranscript.length < 2) {
        reply.send({ success: true, transcript: trimmedTranscript })
        return
      }

      const mode = body.mode === 'edit' ? ItoMode.EDIT : ItoMode.TRANSCRIBE

      const windowContext: ItoContext = {
        windowTitle: body.context?.windowTitle || '',
        appName: body.context?.appName || '',
        contextText: body.context?.contextText || '',
        browserUrl: body.context?.browserUrl || '',
        browserDomain: body.context?.browserDomain || '',
        tonePrompt: body.context?.tonePrompt || '',
        userDetailsContext: body.context?.userDetailsContext || '',
      }

      const advancedSettings = {
        asrModel: DEFAULT_ADVANCED_SETTINGS.asrModel,
        asrProvider: DEFAULT_ADVANCED_SETTINGS.asrProvider,
        asrPrompt: DEFAULT_ADVANCED_SETTINGS.asrPrompt,
        llmProvider: body.llmSettings?.llmProvider || DEFAULT_ADVANCED_SETTINGS.llmProvider,
        llmModel: body.llmSettings?.llmModel || DEFAULT_ADVANCED_SETTINGS.llmModel,
        llmTemperature: body.llmSettings?.llmTemperature ?? DEFAULT_ADVANCED_SETTINGS.llmTemperature,
        transcriptionPrompt: body.llmSettings?.transcriptionPrompt || DEFAULT_ADVANCED_SETTINGS.transcriptionPrompt,
        editingPrompt: body.llmSettings?.editingPrompt || DEFAULT_ADVANCED_SETTINGS.editingPrompt,
        noSpeechThreshold: DEFAULT_ADVANCED_SETTINGS.noSpeechThreshold,
      }

      const hasTonePrompt = windowContext.tonePrompt && windowContext.tonePrompt.trim() !== ''
      const basePrompt = getPromptForMode(mode, advancedSettings)

      const systemPrompt = hasTonePrompt
        ? windowContext.tonePrompt
        : basePrompt

      const userPrompt = createUserPromptWithContext(trimmedTranscript, windowContext)

      const llmProvider = getLlmProvider(advancedSettings.llmProvider)
      let adjustedTranscript = await llmProvider.adjustTranscript(userPrompt, {
        temperature: advancedSettings.llmTemperature,
        model: advancedSettings.llmModel,
        prompt: systemPrompt,
      })

      adjustedTranscript = filterLeakedContext(adjustedTranscript)

      const replacements = body.replacements || []
      if (replacements.length > 0) {
        adjustedTranscript = applyReplacements(adjustedTranscript, replacements)
      }

      reply.send({
        success: true,
        transcript: adjustedTranscript,
      })
    } catch (error: any) {
      fastify.log.error({ err: error }, 'Failed to adjust transcript')
      reply.code(500).send({
        success: false,
        error: error?.message || 'Failed to adjust transcript',
      })
    }
  })
}

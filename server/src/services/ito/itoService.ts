import type { ConnectRouter } from '@connectrpc/connect'
import {
  AudioChunk,
  ItoService as ItoServiceDesc,
  Note,
  NoteSchema,
  Interaction,
  InteractionSchema,
  DictionaryItem,
  DictionaryItemSchema,
  AdvancedSettings,
  AdvancedSettingsSchema,
  LlmSettingsSchema,
  TranscribeStreamRequest,
} from '../../generated/ito_pb.js'
import { create } from '@bufbuild/protobuf'
import type { HandlerContext } from '@connectrpc/connect'
import { getStorageClient } from '../../clients/s3storageClient.js'
import {
  DictionaryRepository,
  InteractionsRepository,
  NotesRepository,
  AdvancedSettingsRepository,
} from '../../db/repo.js'
import {
  Note as DbNote,
  Interaction as DbInteraction,
  DictionaryItem as DbDictionaryItem,
  AdvancedSettings as DbAdvancedSettings,
} from '../../db/models.js'
import { ConnectError, Code } from '@connectrpc/connect'
import { kUser } from '../../auth/userContext.js'
import { transcribeStreamV2Handler } from './transcribeStreamV2Handler.js'
import { transcribeStreamHandler } from './transcribeStreamHandler.js'
import { DEFAULT_ADVANCED_SETTINGS_STRUCT } from './constants.js'

function dbToNotePb(dbNote: DbNote): Note {
  return create(NoteSchema, {
    id: dbNote.id,
    userId: dbNote.user_id,
    interactionId: dbNote.interaction_id ?? '',
    content: dbNote.content,
    createdAt: dbNote.created_at.toISOString(),
    updatedAt: dbNote.updated_at.toISOString(),
    deletedAt: dbNote.deleted_at?.toISOString() ?? '',
  })
}

function dbToInteractionPb(dbInteraction: DbInteraction): Interaction {
  return create(InteractionSchema, {
    id: dbInteraction.id,
    userId: dbInteraction.user_id ?? '',
    title: dbInteraction.title ?? '',
    asrOutput: dbInteraction.asr_output
      ? JSON.stringify(dbInteraction.asr_output)
      : '',
    llmOutput: dbInteraction.llm_output
      ? JSON.stringify(dbInteraction.llm_output)
      : '',
    rawAudio: undefined, // Never send audio bytes over the wire
    rawAudioId: dbInteraction.raw_audio_id ?? '',
    durationMs: dbInteraction.duration_ms ?? 0,
    createdAt: dbInteraction.created_at.toISOString(),
    updatedAt: dbInteraction.updated_at.toISOString(),
    deletedAt: dbInteraction.deleted_at?.toISOString() ?? '',
  })
}

function dbToDictionaryItemPb(
  dbDictionaryItem: DbDictionaryItem,
): DictionaryItem {
  return create(DictionaryItemSchema, {
    id: dbDictionaryItem.id,
    userId: dbDictionaryItem.user_id,
    word: dbDictionaryItem.word,
    pronunciation: dbDictionaryItem.pronunciation ?? '',
    createdAt: dbDictionaryItem.created_at.toISOString(),
    updatedAt: dbDictionaryItem.updated_at.toISOString(),
    deletedAt: dbDictionaryItem.deleted_at?.toISOString() ?? '',
  })
}

function dbToAdvancedSettingsPb(
  dbAdvancedSettings: DbAdvancedSettings,
): AdvancedSettings {
  return create(AdvancedSettingsSchema, {
    id: dbAdvancedSettings.id,
    userId: dbAdvancedSettings.user_id,
    createdAt: dbAdvancedSettings.created_at.toISOString(),
    updatedAt: dbAdvancedSettings.updated_at.toISOString(),
    llm: create(LlmSettingsSchema, {
      // Convert null to undefined so protobuf omits unset optional fields
      asrModel: dbAdvancedSettings.llm.asr_model ?? undefined,
      asrPrompt: dbAdvancedSettings.llm.asr_prompt ?? undefined,
      asrProvider: dbAdvancedSettings.llm.asr_provider ?? undefined,
      llmProvider: dbAdvancedSettings.llm.llm_provider ?? undefined,
      llmTemperature: dbAdvancedSettings.llm.llm_temperature ?? undefined,
      llmModel: dbAdvancedSettings.llm.llm_model ?? undefined,
      transcriptionPrompt:
        dbAdvancedSettings.llm.transcription_prompt ?? undefined,
      editingPrompt: dbAdvancedSettings.llm.editing_prompt ?? undefined,
      noSpeechThreshold:
        dbAdvancedSettings.llm.no_speech_threshold ?? undefined,
      lowQualityThreshold:
        dbAdvancedSettings.llm.low_quality_threshold ?? undefined,
    }),
    default: DEFAULT_ADVANCED_SETTINGS_STRUCT,
  })
}

// Export the service implementation as a function that takes a ConnectRouter
export default (router: ConnectRouter) => {
  router.service(ItoServiceDesc, {
    async transcribeStreamV2(
      requests: AsyncIterable<TranscribeStreamRequest>,
      context: HandlerContext,
    ) {
      return transcribeStreamV2Handler.process(requests, context)
    },

    /**
     * @deprecated Legacy endpoint maintained for backwards compatibility.
     * New clients should use transcribeStreamV2.
     */
    async transcribeStream(
      requests: AsyncIterable<AudioChunk>,
      context: HandlerContext,
    ) {
      return transcribeStreamHandler.process(requests, context)
    },
    async createNote(request, context: HandlerContext) {
      const user = context.values.get(kUser)
      const userId = user?.sub
      if (!userId) {
        throw new ConnectError('User not authenticated', Code.Unauthenticated)
      }
      const noteRequest = { ...request, userId }
      const newNote = await NotesRepository.create(noteRequest)
      return dbToNotePb(newNote)
    },

    async getNote(request) {
      const note = await NotesRepository.findById(request.id)
      if (!note) {
        throw new ConnectError('Note not found', Code.NotFound)
      }
      return dbToNotePb(note)
    },

    async listNotes(request, context: HandlerContext) {
      const user = context.values.get(kUser)
      const userId = user?.sub
      if (!userId) {
        throw new ConnectError('User not authenticated', Code.Unauthenticated)
      }
      const since = request.sinceTimestamp
        ? new Date(request.sinceTimestamp)
        : undefined
      const notes = await NotesRepository.findByUserId(userId, since)
      return { notes: notes.map(dbToNotePb) }
    },

    async updateNote(request) {
      const updatedNote = await NotesRepository.update(request)
      if (!updatedNote) {
        throw new ConnectError('Note not found', Code.NotFound)
      }
      return dbToNotePb(updatedNote)
    },

    async deleteNote(request) {
      await NotesRepository.softDelete(request.id)
      return {}
    },

    async createInteraction(request, context: HandlerContext) {
      const user = context.values.get(kUser)
      const userId = user?.sub
      if (!userId) {
        throw new ConnectError('User not authenticated', Code.Unauthenticated)
      }

      // Audio is no longer stored — transcription happens in real-time via streaming only
      const interactionRequest = { ...request, userId, rawAudio: undefined }
      const newInteraction = await InteractionsRepository.create(interactionRequest)
      return dbToInteractionPb(newInteraction)
    },

    async getInteraction(request) {
      const interaction = await InteractionsRepository.findById(request.id)
      if (!interaction) {
        throw new ConnectError('Interaction not found', Code.NotFound)
      }
      return dbToInteractionPb(interaction)
    },

    async listInteractions(request, context: HandlerContext) {
      const user = context.values.get(kUser)
      const userId = user?.sub
      if (!userId) {
        throw new ConnectError('User not authenticated', Code.Unauthenticated)
      }

      const since = request.sinceTimestamp
        ? new Date(request.sinceTimestamp)
        : undefined

      const interactions = await InteractionsRepository.findByUserId(userId, since)

      return {
        interactions: interactions.map(dbInteraction =>
          dbToInteractionPb(dbInteraction)
        ),
      }
    },

    async updateInteraction(request) {
      const updatedInteraction = await InteractionsRepository.update(request)
      if (!updatedInteraction) {
        throw new ConnectError(
          'Interaction not found or was deleted',
          Code.NotFound,
        )
      }
      return dbToInteractionPb(updatedInteraction)
    },

    async deleteInteraction(request) {
      await InteractionsRepository.softDelete(request.id)
      return {}
    },

    async createDictionaryItem(request, context: HandlerContext) {
      const user = context.values.get(kUser)
      const userId = user?.sub
      if (!userId) {
        throw new ConnectError('User not authenticated', Code.Unauthenticated)
      }
      const dictionaryRequest = { ...request, userId }
      const newItem = await DictionaryRepository.create(dictionaryRequest)
      return dbToDictionaryItemPb(newItem)
    },

    async listDictionaryItems(request, context: HandlerContext) {
      const user = context.values.get(kUser)
      const userId = user?.sub
      if (!userId) {
        throw new ConnectError('User not authenticated', Code.Unauthenticated)
      }
      const since = request.sinceTimestamp
        ? new Date(request.sinceTimestamp)
        : undefined
      const items = await DictionaryRepository.findByUserId(userId, since)
      return { items: items.map(dbToDictionaryItemPb) }
    },

    async updateDictionaryItem(request) {
      const updatedItem = await DictionaryRepository.update(request)
      if (!updatedItem) {
        throw new ConnectError(
          'Dictionary item not found or was deleted',
          Code.NotFound,
        )
      }
      return dbToDictionaryItemPb(updatedItem)
    },

    async deleteDictionaryItem(request) {
      await DictionaryRepository.softDelete(request.id)
      return {}
    },

    async deleteUserData(_request, context: HandlerContext) {
      const user = context.values.get(kUser)
      const userId = user?.sub
      if (!userId) {
        throw new ConnectError('User not authenticated', Code.Unauthenticated)
      }

      console.log(`Deleting all data for authenticated user: ${userId}`)

      const storageClient = getStorageClient()
      const audioPrefix = `raw-audio/${userId}/`

      await Promise.all([
        storageClient.hardDeletePrefix(audioPrefix),
        NotesRepository.hardDeleteAllUserData(userId),
        InteractionsRepository.hardDeleteAllUserData(userId),
        DictionaryRepository.hardDeleteAllUserData(userId),
        AdvancedSettingsRepository.hardDeleteByUserId(userId),
      ])

      console.log(`Successfully deleted all data for user: ${userId}`)
      return {}
    },

    async getAdvancedSettings(_request, context: HandlerContext) {
      const user = context.values.get(kUser)
      const userId = user?.sub

      // If no auth, return defaults for self-hosted/no-auth mode
      if (!userId) {
        return create(AdvancedSettingsSchema, {
          id: 'default',
          userId: 'anonymous',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          llm: create(LlmSettingsSchema, {}),
          default: DEFAULT_ADVANCED_SETTINGS_STRUCT,
        })
      }

      const settings = await AdvancedSettingsRepository.findByUserId(userId)
      if (!settings) {
        // Return default settings if none exist
        return create(AdvancedSettingsSchema, {
          id: '',
          userId: userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          llm: create(LlmSettingsSchema, {}),
          default: DEFAULT_ADVANCED_SETTINGS_STRUCT,
        })
      }

      return dbToAdvancedSettingsPb(settings)
    },

    async updateAdvancedSettings(request, context: HandlerContext) {
      const user = context.values.get(kUser)
      const userId = user?.sub

      // If no auth, just return the request as-is (no persistence in no-auth mode)
      if (!userId) {
        return create(AdvancedSettingsSchema, {
          id: 'default',
          userId: 'anonymous',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          llm: request.llm ?? create(LlmSettingsSchema, {}),
          default: DEFAULT_ADVANCED_SETTINGS_STRUCT,
        })
      }

      const updatedSettings = await AdvancedSettingsRepository.upsert(
        userId,
        request,
      )
      return dbToAdvancedSettingsPb(updatedSettings)
    },
  })
}

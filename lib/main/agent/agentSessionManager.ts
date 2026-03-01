import { ItoMode } from '@/app/generated/ito_pb'
import { recordingStateNotifier } from '../recordingStateNotifier'
import { voiceInputService } from '../voiceInputService'
import { itoStreamController } from '../itoStreamController'
import { interactionManager } from '../interactions/InteractionManager'
import { preventAppNap, allowAppNap } from '../appNap'
import { getAdvancedSettings } from '../store'
import { audioRecorderService } from '../../media/audio'
import { SonioxStreamingService } from '../soniox/SonioxStreamingService'
import { sonioxTempKeyManager } from '../soniox/SonioxTempKeyManager'
import { runAgent } from './agentRunner'
import { resetToolState } from './tools'

const MINIMUM_AUDIO_DURATION_MS = 100

class AgentSessionManager {
  private streamResponsePromise: Promise<{
    response: any
    audioBuffer: Buffer
    sampleRate: number
  }> | null = null
  private isSonioxMode = false
  private sonioxService: SonioxStreamingService | null = null
  private sonioxAudioHandler: ((chunk: Buffer) => void) | null = null

  public async startSession() {
    console.info('[AgentSession] Starting agent session')

    let interactionId = interactionManager.getCurrentInteractionId()
    if (interactionId) {
      interactionManager.adoptInteractionId(interactionId)
    } else {
      interactionId = interactionManager.initialize()
    }

    const { llm } = getAdvancedSettings()
    const isSoniox = llm?.asrProvider === 'soniox'

    if (isSoniox) {
      await this.startSonioxAgentSession()
    } else {
      await this.startGrpcAgentSession()
    }

    return interactionId
  }

  private async startGrpcAgentSession() {
    this.isSonioxMode = false

    const started = await itoStreamController.initialize(ItoMode.TRANSCRIBE)
    if (!started) {
      console.error('[AgentSession] Failed to initialize stream controller')
      return
    }

    this.streamResponsePromise = itoStreamController.startGrpcStream()
    voiceInputService.startAudioRecording()
    recordingStateNotifier.notifyRecordingStarted(ItoMode.TRANSCRIBE)
    preventAppNap()
  }

  private async startSonioxAgentSession() {
    this.isSonioxMode = true

    this.sonioxAudioHandler = (chunk: Buffer) => {
      if (this.sonioxService) {
        this.sonioxService.sendAudio(chunk)
      }
    }
    audioRecorderService.on('audio-chunk', this.sonioxAudioHandler)

    voiceInputService.startAudioRecording()
    recordingStateNotifier.notifyRecordingStarted(ItoMode.TRANSCRIBE)
    preventAppNap()

    try {
      const tempKey = await sonioxTempKeyManager.getKey()
      this.sonioxService = new SonioxStreamingService()
      await this.sonioxService.start(tempKey, undefined)
    } catch (error) {
      console.error('[AgentSession] Soniox connect failed:', error)
      this.cleanupSoniox()
    }
  }

  public async completeSession() {
    if (this.isSonioxMode) {
      await this.completeSonioxAgentSession()
      return
    }
    await this.completeGrpcAgentSession()
  }

  private async completeGrpcAgentSession() {
    const responsePromise = this.streamResponsePromise
    this.streamResponsePromise = null

    await voiceInputService.stopAudioRecording()

    const audioDurationMs = itoStreamController.getAudioDurationMs()
    if (audioDurationMs < MINIMUM_AUDIO_DURATION_MS) {
      console.info(`[AgentSession] Audio too short (${audioDurationMs}ms), cancelling`)
      itoStreamController.cancelTranscription()
      itoStreamController.clearInteractionAudio()
      recordingStateNotifier.notifyRecordingStopped()
      if (responsePromise) {
        try { await responsePromise } catch { /* expected */ }
      }
      allowAppNap()
      return
    }

    itoStreamController.endInteraction()
    recordingStateNotifier.notifyProcessingStarted(true)
    recordingStateNotifier.notifyRecordingStopped()

    if (responsePromise) {
      try {
        const result = await responsePromise
        const transcript = result.response?.transcript?.trim()

        if (!transcript || transcript.length < 2) {
          console.info('[AgentSession] Transcript too short, skipping agent')
        } else {
          console.info(`[AgentSession] Transcript: "${transcript}" (${transcript.length} chars)`)
          await this.runAgentWithTranscript(transcript)
        }
      } catch (error) {
        console.error('[AgentSession] gRPC stream error:', error)
      } finally {
        recordingStateNotifier.notifyProcessingStopped()
        allowAppNap()
        itoStreamController.clearInteractionAudio()
        resetToolState()
      }
    } else {
      recordingStateNotifier.notifyProcessingStopped()
      allowAppNap()
    }
  }

  private async completeSonioxAgentSession() {
    await voiceInputService.stopAudioRecording()

    if (this.sonioxAudioHandler) {
      audioRecorderService.off('audio-chunk', this.sonioxAudioHandler)
      this.sonioxAudioHandler = null
    }

    recordingStateNotifier.notifyProcessingStarted(true)
    recordingStateNotifier.notifyRecordingStopped()

    const service = this.sonioxService
    this.sonioxService = null

    let rawTranscript = ''
    if (service) {
      try {
        rawTranscript = await service.stop()
      } catch (error) {
        console.error('[AgentSession] Soniox stop error:', error)
        rawTranscript = service.getAccumulatedText() || ''
      }
    }

    if (!rawTranscript || rawTranscript.trim().length < 2) {
      console.info('[AgentSession] No speech from Soniox, skipping agent')
      recordingStateNotifier.notifyProcessingStopped()
      allowAppNap()
      return
    }

    try {
      await this.runAgentWithTranscript(rawTranscript.trim())
    } catch (error) {
      console.error('[AgentSession] Agent error:', error)
    } finally {
      recordingStateNotifier.notifyProcessingStopped()
      allowAppNap()
      resetToolState()
    }
  }

  private async runAgentWithTranscript(transcript: string) {
    const result = await runAgent(transcript)
    if (result.isError) {
      console.error(`[AgentSession] Agent error: ${result.response}`)
    } else if (result.textWritten) {
      console.info('[AgentSession] Agent wrote text to field')
    } else {
      console.info(`[AgentSession] Agent response: ${result.response}`)
    }
  }

  public cancelSession() {
    console.info('[AgentSession] Cancelling')
    voiceInputService.stopAudioRecording()

    if (this.isSonioxMode) {
      this.cleanupSoniox()
    } else {
      itoStreamController.cancelTranscription()
      itoStreamController.clearInteractionAudio()
    }

    recordingStateNotifier.notifyRecordingStopped()
    recordingStateNotifier.notifyProcessingStopped()
    allowAppNap()
    this.streamResponsePromise = null
    resetToolState()
  }

  private cleanupSoniox() {
    if (this.sonioxAudioHandler) {
      audioRecorderService.off('audio-chunk', this.sonioxAudioHandler)
      this.sonioxAudioHandler = null
    }
    if (this.sonioxService) {
      this.sonioxService.cancel()
      this.sonioxService = null
    }
  }
}

export const agentSessionManager = new AgentSessionManager()

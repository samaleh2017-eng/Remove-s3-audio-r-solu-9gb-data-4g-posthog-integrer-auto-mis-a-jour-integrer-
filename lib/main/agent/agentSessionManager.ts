import { ItoMode } from '@/app/generated/ito_pb'
import { Notification, BrowserWindow } from 'electron'
import { recordingStateNotifier } from '../recordingStateNotifier'
import { voiceInputService } from '../voiceInputService'
import { itoStreamController } from '../itoStreamController'
import { interactionManager } from '../interactions/InteractionManager'
import { preventAppNap, allowAppNap } from '../appNap'
import { getAdvancedSettings } from '../store'
import { audioRecorderService } from '../../media/audio'
import { SonioxStreamingService } from '../soniox/SonioxStreamingService'
import { sonioxTempKeyManager } from '../soniox/SonioxTempKeyManager'
import { setFocusedText } from '../../media/text-writer'
import { Agent } from './agent'
import { GetContextTool, DraftTool, WriteToTextFieldTool, StopTool } from './tools'
import type { AgentWindowMessage, AgentWindowState } from './types'

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

  private agent: Agent | null = null
  private stopTool: StopTool | null = null
  private draftTool: DraftTool | null = null
  private writeToTextFieldTool: WriteToTextFieldTool | null = null
  private uiMessages: AgentWindowMessage[] = []
  private currentDraft: string | null = null

  private initAgent(): Agent {
    console.info('[AgentSession] Initializing agent with tools')

    this.stopTool = new StopTool()
    this.draftTool = new DraftTool()
    this.writeToTextFieldTool = new WriteToTextFieldTool()

    this.draftTool.setOnDraftUpdated((draft) => {
      this.currentDraft = draft
      this.broadcastWindowState()
    })

    this.writeToTextFieldTool.setStopTool(this.stopTool)
    this.writeToTextFieldTool.setDraftTool(this.draftTool)

    const tools = [
      new GetContextTool(),
      this.draftTool,
      this.writeToTextFieldTool,
      this.stopTool,
    ]

    return new Agent(tools)
  }

  private broadcastWindowState(): void {
    const state: AgentWindowState = {
      messages: this.uiMessages.map((m) => ({
        ...m,
        tools: m.tools ? [...m.tools] : undefined,
      })),
    }
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.webContents.isDestroyed()) {
        window.webContents.send('agent-window-update', state)
      }
    })
  }

  public async startSession() {
    console.info('[AgentSession] Starting agent session')
    interactionManager.initialize()

    if (!this.agent) {
      this.agent = this.initAgent()
    }

    this.uiMessages = []
    this.currentDraft = null
    this.broadcastWindowState()

    const { llm } = getAdvancedSettings()
    const isSoniox = llm?.asrProvider === 'soniox'

    if (isSoniox) {
      await this.startSonioxAgentSession()
    } else {
      await this.startGrpcAgentSession()
    }
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
        try {
          await responsePromise
        } catch {
          /* expected */
        }
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
        this.resetToolState()
      }
    } else {
      recordingStateNotifier.notifyProcessingStopped()
      allowAppNap()
      this.resetToolState()
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
      this.resetToolState()
    }
  }

  private async runAgentWithTranscript(transcript: string) {
    if (!this.agent) {
      this.agent = this.initAgent()
    }

    this.uiMessages.push({ text: transcript, sender: 'me' })
    this.broadcastWindowState()

    const liveTools: string[] = []
    this.uiMessages.push({ text: '', sender: 'agent', tools: liveTools })

    console.info(`[AgentSession] Running agent with transcript (${transcript.length} chars)`)

    const result = await this.agent.run(transcript, {
      onToolExecuted: (tool) => {
        console.info(`[AgentSession] Tool executed: ${tool.displayName}`)
        liveTools.push(tool.displayName)
        this.broadcastWindowState()
      },
    })

    console.info(
      `[AgentSession] Agent response: ${result.response?.length ?? 0} chars, history=${result.history.length} turns`,
    )

    this.uiMessages.pop()

    if (result.isError) {
      this.uiMessages.push({
        text: result.response || 'An unexpected error occurred.',
        sender: 'agent',
        isError: true,
      })
      this.broadcastWindowState()

      new Notification({
        title: 'Agent error',
        body: result.response || 'An unexpected error occurred.',
      }).show()
      return
    }

    const hasWritten = result.history.some(
      (m) =>
        m.type === 'assistant' &&
        m.tools.some((t) => t.name === 'write_to_text_field' && t.didSucceed),
    )

    if (hasWritten) {
      const lastMsg = result.history[result.history.length - 1]
      const toolDisplayNames =
        lastMsg?.type === 'assistant' ? lastMsg.tools.map((t) => t.displayName) : []

      this.uiMessages.push({
        text: result.response || 'Done!',
        sender: 'agent',
        tools: toolDisplayNames,
        draft: this.currentDraft ?? undefined,
      })
      this.currentDraft = null
      this.broadcastWindowState()
      console.info('[AgentSession] Agent wrote text to field')
      return
    }

    if (result.response) {
      const lastMsg = result.history[result.history.length - 1]
      const toolDisplayNames =
        lastMsg?.type === 'assistant' ? lastMsg.tools.map((t) => t.displayName) : []

      this.uiMessages.push({
        text: result.response,
        sender: 'agent',
        tools: toolDisplayNames,
      })
      this.broadcastWindowState()

      const typed = await setFocusedText(result.response).catch(() => false)
      if (!typed) {
        new Notification({
          title: 'Agent',
          body: result.response,
        }).show()
      }
    } else {
      this.uiMessages.push({
        text: 'Done — nothing to write.',
        sender: 'agent',
      })
      this.broadcastWindowState()

      new Notification({
        title: 'Agent',
        body: 'Done — nothing to write.',
      }).show()
    }
  }

  private resetToolState() {
    this.stopTool?.reset()
    this.draftTool?.clearDraft()
    this.currentDraft = null
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
    this.resetToolState()
  }

  public async cleanup() {
    console.info('[AgentSession] Full cleanup')
    this.agent?.clearHistory()
    this.uiMessages = []
    this.agent = null
    this.stopTool = null
    this.draftTool = null
    this.writeToTextFieldTool = null
    this.currentDraft = null

    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.webContents.isDestroyed()) {
        window.webContents.send('agent-window-update', null)
      }
    })
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

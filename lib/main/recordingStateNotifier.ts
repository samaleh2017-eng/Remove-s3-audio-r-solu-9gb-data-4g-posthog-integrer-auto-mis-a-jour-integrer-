import { ItoMode } from '@/app/generated/ito_pb'
import { getPillWindow, mainWindow } from './app'
import {
  IPC_EVENTS,
  RecordingStatePayload,
  ProcessingStatePayload,
} from '../types/ipc'
import { getActiveWindowWithIcon } from '../media/active-application'
import { getBrowserUrl } from '../media/browser-url'
import { persistentContextDetector } from './context/PersistentContextDetector'
import { AppTargetTable } from './sqlite/appTargetRepo'
import { getCurrentUserId } from './store'
import { normalizeAppTargetId } from '../utils/appTargetUtils'

const DEFAULT_LOCAL_USER_ID = 'local-user'
const DETECTION_TIMEOUT_MS = 200

export class RecordingStateNotifier {
  private generation = 0

  public notifyRecordingStarted(
    mode: ItoMode,
    contextSource?: 'screen' | 'selection' | null,
  ) {
    const gen = ++this.generation

    this.resolveAppTargetWithIcon()
      .then(result => {
        if (gen !== this.generation) return
        this.sendToWindows(IPC_EVENTS.RECORDING_STATE_UPDATE, {
          isRecording: true,
          mode,
          appTargetName: result?.name ?? undefined,
          appTargetIconBase64: result?.iconBase64 ?? undefined,
          contextSource: contextSource ?? undefined,
        })
      })
      .catch(() => {
        if (gen !== this.generation) return
        this.sendToWindows(IPC_EVENTS.RECORDING_STATE_UPDATE, {
          isRecording: true,
          mode,
          contextSource: contextSource ?? undefined,
        })
      })
  }

  public notifyRecordingStopped() {
    ++this.generation
    this.sendToWindows(IPC_EVENTS.RECORDING_STATE_UPDATE, {
      isRecording: false,
    })
  }

  public notifyProcessingStarted() {
    this.sendToWindows(IPC_EVENTS.PROCESSING_STATE_UPDATE, {
      isProcessing: true,
    })
  }

  public notifyProcessingStopped() {
    this.sendToWindows(IPC_EVENTS.PROCESSING_STATE_UPDATE, {
      isProcessing: false,
    })
  }

  private async resolveAppTargetWithIcon(): Promise<{
    name: string
    iconBase64: string | null
  } | null> {
    const windowPromise = getActiveWindowWithIcon()
    const timeoutPromise = new Promise<null>(resolve =>
      setTimeout(() => resolve(null), DETECTION_TIMEOUT_MS),
    )
    const window = await Promise.race([windowPromise, timeoutPromise])

    if (!window?.appName) return null

    const lowerName = window.appName.toLowerCase()
    const blockedApps = new Set([
      'electron',
      'ito',
      'ito-dev',
      'explorer',
      'finder',
      'desktop',
      'shell',
    ])
    if (blockedApps.has(lowerName)) {
      return null
    }

    const browserInfo = await getBrowserUrl(window)
    const resolved = await persistentContextDetector.resolveForWindow(
      window,
      browserInfo.domain,
    )

    if (resolved.target) {
      return {
        name: resolved.target.name,
        iconBase64: window.iconBase64 || resolved.target.iconBase64,
      }
    }

    this.autoRegisterApp(window, browserInfo.domain).catch(err => {
      console.warn('[RecordingStateNotifier] Auto-register failed:', err)
    })

    return {
      name: window.appName,
      iconBase64: window.iconBase64 || null,
    }
  }

  private async autoRegisterApp(
    window: {
      appName: string
      iconBase64?: string | null
      bundleId?: string | null
      exePath?: string | null
    },
    browserDomain: string | null,
  ): Promise<void> {
    const userId = getCurrentUserId() || DEFAULT_LOCAL_USER_ID
    const appId = normalizeAppTargetId(window.appName)

    const existing = await AppTargetTable.findById(appId, userId)
    if (existing) return

    await AppTargetTable.upsert({
      id: appId,
      userId,
      name: window.appName,
      matchType: 'app',
      domain: browserDomain,
      toneId: null,
      iconBase64: window.iconBase64 || null,
    })

    await persistentContextDetector.registerSignaturesForTarget(
      appId,
      window.bundleId || null,
      window.exePath || null,
      browserDomain,
    )

    console.log(
      `[RecordingStateNotifier] Auto-registered app: ${window.appName} (${appId})`,
    )
  }

  private sendToWindows(
    event: string,
    payload: RecordingStatePayload | ProcessingStatePayload,
  ) {
    getPillWindow()?.webContents.send(event, payload)

    if (
      mainWindow &&
      !mainWindow.isDestroyed() &&
      !mainWindow.webContents.isDestroyed()
    ) {
      mainWindow.webContents.send(event, payload)
    }
  }
}

export const recordingStateNotifier = new RecordingStateNotifier()

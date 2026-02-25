import { ItoMode } from '@/app/generated/ito_pb'
import { getPillWindow, mainWindow } from './app'
import {
  IPC_EVENTS,
  RecordingStatePayload,
  ProcessingStatePayload,
} from '../types/ipc'
import { getActiveWindow } from '../media/active-application'
import { getBrowserUrl } from '../media/browser-url'
import { persistentContextDetector } from './context/PersistentContextDetector'

export class RecordingStateNotifier {
  private generation = 0

  public notifyRecordingStarted(mode: ItoMode) {
    const gen = ++this.generation

    this.sendToWindows(IPC_EVENTS.RECORDING_STATE_UPDATE, {
      isRecording: true,
      mode,
    })

    this.resolveAppTarget()
      .then(target => {
        if (gen !== this.generation) return
        if (target) {
          this.sendToWindows(IPC_EVENTS.RECORDING_STATE_UPDATE, {
            isRecording: true,
            mode,
            appTargetName: target.name,
            appTargetIconBase64: target.iconBase64,
          })
        }
      })
      .catch(() => {})
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

  private async resolveAppTarget() {
    const window = await getActiveWindow()
    if (!window) return null

    const browserInfo = await getBrowserUrl(window)
    const resolved = await persistentContextDetector.resolveForWindow(
      window,
      browserInfo.domain,
    )
    return resolved.target
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

import { app } from 'electron'
import log from 'electron-log'
import { autoUpdater } from 'electron-updater'
import { mainWindow } from './app'
import { hardKillAll, teardown } from './teardown'

export interface UpdateStatus {
  updateAvailable: boolean
  updateDownloaded: boolean
  availableVersion?: string
}

let updateStatus: UpdateStatus = {
  updateAvailable: false,
  updateDownloaded: false,
}

let updateCheckTimer: NodeJS.Timeout | null = null

export function getUpdateStatus(): UpdateStatus {
  return { ...updateStatus }
}

export function initializeAutoUpdater() {
  updateStatus = {
    updateAvailable: false,
    updateDownloaded: false,
  }

  const enableDevUpdater = import.meta.env.VITE_DEV_AUTO_UPDATE === 'true'

  if (app.isPackaged || enableDevUpdater) {
    try {
      console.log(
        app.isPackaged
          ? 'App is packaged, initializing auto updater...'
          : 'Development auto-updater enabled, initializing...',
      )

      if (!app.isPackaged) {
        autoUpdater.forceDevUpdateConfig = true
      }

      autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'samaleh2017-eng',
        repo: 'Remove-s3-audio-r-solu-9gb-data-4g-posthog-integrer-auto-mis-a-jour-integrer-',
      })

      log.transports.file.level = 'debug'
      autoUpdater.logger = log

      autoUpdater.autoRunAppAfterInstall = true
      autoUpdater.autoDownload = false
      autoUpdater.autoInstallOnAppQuit = false

      setupAutoUpdaterEvents()
      autoUpdater.checkForUpdates()

      updateCheckTimer = setInterval(
        () => {
          autoUpdater.checkForUpdates()
        },
        10 * 60 * 1000,
      )
    } catch (e) {
      console.error('Failed to check for auto updates:', e)
    }
  }
}

function sendToMainWindow(event: string, ...args: any[]) {
  if (
    mainWindow &&
    !mainWindow.isDestroyed() &&
    !mainWindow.webContents.isDestroyed()
  ) {
    mainWindow.webContents.send(event, ...args)
  }
}

function setupAutoUpdaterEvents() {
  autoUpdater.on('update-available', info => {
    console.log('[Updater] Update available:', info.version)
    updateStatus.updateAvailable = true
    updateStatus.availableVersion = info.version
    sendToMainWindow('update-available')
  })

  autoUpdater.on('update-not-available', info => {
    console.log('[Updater] No update available. Latest:', info.version)
    sendToMainWindow('update-not-available')
  })

  autoUpdater.on('update-downloaded', () => {
    console.log('[Updater] Update downloaded successfully')
    updateStatus.updateDownloaded = true
    sendToMainWindow('update-downloaded')
  })

  autoUpdater.on('error', error => {
    console.error('[Updater] Error:', error)
    sendToMainWindow('update-error', error?.message || String(error))
  })

  autoUpdater.on('download-progress', progressObj => {
    console.log(
      `[Updater] Download: ${progressObj.percent.toFixed(2)}% (${progressObj.transferred}/${progressObj.total})`,
    )
    sendToMainWindow('update-download-progress', progressObj.percent)
  })
}

export function stopAutoUpdater() {
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer)
    updateCheckTimer = null
  }
}

export async function checkForUpdates(): Promise<void> {
  try {
    await autoUpdater.checkForUpdates()
  } catch (e) {
    console.error('[Updater] checkForUpdates error:', e)
  }
}

let installing = false

export function downloadUpdate() {
  return autoUpdater.downloadUpdate()
}

export async function installUpdateNow() {
  if (installing) return
  installing = true
  console.log('[Updater] Preparing to install update...')

  try {
    teardown()
    await new Promise(resolve => setTimeout(resolve, 1_500))

    console.log('[Updater] Forcibly kill all straggler processes')
    await hardKillAll()

    console.log('[Updater] Calling autoUpdater.quitAndInstall (silent)')
    autoUpdater.quitAndInstall(true, true)

    setTimeout(() => {
      console.log('[Updater] Force exit fallback')
      app.exit(0)
    }, 3_000)
  } catch (e) {
    log.error('[Updater] installUpdateNow error', e)
    try {
      await hardKillAll()
      autoUpdater.quitAndInstall(true, true)
      setTimeout(() => app.exit(0), 3_000)
    } catch {
      app.exit(0)
    }
  }
}

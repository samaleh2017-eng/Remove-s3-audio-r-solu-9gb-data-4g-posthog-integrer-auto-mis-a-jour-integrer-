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
import { fetchFavicon } from './faviconFetcher'

const DEFAULT_LOCAL_USER_ID = 'local-user'
const DETECTION_TIMEOUT_MS = 200

/** Timeout for getBrowserUrl() to prevent slow URL detection from blocking the Pill */
const BROWSER_URL_TIMEOUT_MS = 200

/**
 * Known browser process names (lowercase). Used to detect when the active app is a web browser.
 * Must match the app names returned by the native active-application binary on both macOS and Windows.
 */
const KNOWN_BROWSERS = new Set([
  'google chrome',
  'chrome',
  'chromium',
  'firefox',
  'mozilla firefox',
  'safari',
  'microsoft edge',
  'edge',
  'brave',
  'brave browser',
  'opera',
  'opera gx',
  'vivaldi',
  'arc',
  'zen',
  'orion',
  'waterfox',
  'thorium',
])

/**
 * Browser "home" domains (NORMALIZED — no www. prefix).
 * When a browser is on one of these, treat it as "browser app" not "website".
 * The user should see the browser icon + name, not the domain.
 *
 * All domains here are WITHOUT www. because normalizeDomain() strips it before checking.
 */
const BROWSER_HOME_DOMAINS = new Set([
  'google.com',
  'bing.com',
  'duckduckgo.com',
  'start.duckduckgo.com',
  'search.yahoo.com',
  'startpage.com',
])

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

  private normalizeDomain(domain: string): string {
    return domain.toLowerCase().replace(/^www\./, '')
  }

  private isBrowserApp(appName: string): boolean {
    return KNOWN_BROWSERS.has(appName.toLowerCase())
  }

  private isBrowserHomeDomain(domain: string): boolean {
    return BROWSER_HOME_DOMAINS.has(this.normalizeDomain(domain))
  }

  private async resolveAppTargetWithIcon(): Promise<{
    name: string
    iconBase64: string | null
  } | null> {
    // Step 1: Get active window with OS icon (50-100ms typical, 200ms max)
    const windowPromise = getActiveWindowWithIcon()
    const windowTimeout = new Promise<null>(resolve =>
      setTimeout(() => resolve(null), DETECTION_TIMEOUT_MS),
    )
    const window = await Promise.race([windowPromise, windowTimeout])

    if (!window?.appName) return null

    // Step 2: Filter blocked system processes
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

    // Step 3: Detect browser URL and domain (with safety timeout)
    const browserInfoPromise = getBrowserUrl(window)
    const browserUrlTimeout = new Promise<{ url: null; domain: null; browser: null }>(resolve =>
      setTimeout(() => resolve({ url: null, domain: null, browser: null }), BROWSER_URL_TIMEOUT_MS),
    )
    const browserInfo = await Promise.race([browserInfoPromise, browserUrlTimeout])

    // Step 4: SMART BROWSER/WEBSITE DIFFERENTIATION
    const isBrowser = this.isBrowserApp(window.appName)
    const hasDomain = !!browserInfo.domain
    const isRealWebsite = hasDomain && !this.isBrowserHomeDomain(browserInfo.domain!)

    if (isBrowser && isRealWebsite) {
      // ── BROWSER ON A REAL WEBSITE ──
      // Skip resolveForWindow() to avoid matching the browser's bundle_id/exe_path.
      // Do direct domain lookup instead.
      return this.resolveDomainTarget(browserInfo.domain!, window)
    }

    // ── BROWSER ON HOME PAGE / EMPTY TAB, OR NON-BROWSER APP ──
    // Use existing flow: check PersistentContextDetector for registered targets
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

    // No registered target → auto-register the app (not domain) for future lookups
    this.autoRegisterApp(window, browserInfo.domain).catch(err => {
      console.warn('[RecordingStateNotifier] Auto-register failed:', err)
    })

    return {
      name: window.appName,
      iconBase64: window.iconBase64 || null,
    }
  }

  private async resolveDomainTarget(
    rawDomain: string,
    window: { appName: string; iconBase64?: string | null; bundleId?: string | null; exePath?: string | null },
  ): Promise<{ name: string; iconBase64: string | null }> {
    const userId = getCurrentUserId() || DEFAULT_LOCAL_USER_ID
    const domain = this.normalizeDomain(rawDomain)

    // Check for existing domain target in the database (using NORMALIZED domain)
    const existingTarget = await AppTargetTable.findByDomain(domain, userId)

    if (existingTarget) {
      if (existingTarget.iconBase64) {
        return {
          name: existingTarget.name,
          iconBase64: existingTarget.iconBase64,
        }
      }

      // Domain registered but no favicon yet → return with browser icon, re-fetch in background
      this.fetchAndUpdateFavicon(existingTarget.id, domain).catch(err => {
        console.warn('[RecordingStateNotifier] Favicon re-fetch failed:', err)
      })

      return {
        name: existingTarget.name,
        iconBase64: window.iconBase64 || null,
      }
    }

    // No domain target exists → auto-register in background (with favicon fetch)
    this.autoRegisterDomainTarget(domain, window).catch(err => {
      console.warn('[RecordingStateNotifier] Auto-register domain failed:', err)
    })

    return {
      name: domain,
      iconBase64: window.iconBase64 || null,
    }
  }

  private async autoRegisterDomainTarget(
    domain: string,
    window: { appName: string; iconBase64?: string | null; bundleId?: string | null; exePath?: string | null },
  ): Promise<void> {
    const userId = getCurrentUserId() || DEFAULT_LOCAL_USER_ID
    const appId = normalizeAppTargetId(`domain_${domain}`)

    const existing = await AppTargetTable.findById(appId, userId)
    if (existing) return

    const favicon = await fetchFavicon(domain)

    await AppTargetTable.upsert({
      id: appId,
      userId,
      name: domain,
      matchType: 'domain',
      domain: domain,
      toneId: null,
      iconBase64: favicon || null,
    })

    await persistentContextDetector.registerSignaturesForTarget(
      appId,
      null,
      null,
      domain,
    )

    console.log(
      `[RecordingStateNotifier] Auto-registered domain: ${domain} (${appId})${favicon ? ' with favicon' : ' without favicon'}`,
    )
  }

  private async fetchAndUpdateFavicon(targetId: string, domain: string): Promise<void> {
    const favicon = await fetchFavicon(domain)
    if (!favicon) return

    const userId = getCurrentUserId() || DEFAULT_LOCAL_USER_ID
    const target = await AppTargetTable.findById(targetId, userId)
    if (!target) return

    await AppTargetTable.upsert({
      id: target.id,
      userId: target.userId,
      name: target.name,
      matchType: target.matchType,
      domain: target.domain,
      toneId: target.toneId,
      iconBase64: favicon,
    })

    console.log(`[RecordingStateNotifier] Updated favicon for domain: ${domain}`)
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

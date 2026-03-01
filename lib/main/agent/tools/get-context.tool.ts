import type { ToolResult } from '../types'
import { macOSAccessibilityContextProvider } from '../../../media/macOSAccessibilityContextProvider'
import { getActiveWindow } from '../../../media/active-application'
import { getBrowserUrl } from '../../../media/browser-url'
import { getSelectedTextString } from '../../../media/selected-text-reader'
import { activeWindowMonitor } from '../../ActiveWindowMonitor'
import { BaseTool } from './base.tool'

export class GetContextTool extends BaseTool<Record<string, unknown>> {
  readonly name = 'get_context'
  readonly displayName = 'Get Context'
  readonly description =
    'Get the text field content and surrounding screen context. ALWAYS call this first when the user asks you to write, reply, or respond to something — you need to see what they are looking at. Also use it when you need to understand the user\'s current context.'
  readonly parameters = undefined

  protected async execInternal(): Promise<ToolResult> {
    const cached = activeWindowMonitor.getCachedState()
    const activeWindow = cached?.window || (await getActiveWindow().catch(() => null))

    let textContent: string | null = null
    let selectedText: string | null = null

    if (process.platform === 'darwin' && macOSAccessibilityContextProvider.isRunning()) {
      try {
        const result = await macOSAccessibilityContextProvider.getCursorContext({
          maxCharsBefore: 2000,
          maxCharsAfter: 1000,
          timeout: 800,
          debug: false,
        })
        if (result.success && result.context) {
          textContent =
            [result.context.textBefore, result.context.textAfter]
              .filter(Boolean)
              .join('[CURSOR]') || null
          selectedText = result.context.selectedText || null
        }
      } catch (e) {
        console.warn('[GetContextTool] Accessibility context failed:', e)
      }
    }

    if (!textContent && !selectedText) {
      try {
        selectedText = await getSelectedTextString()
      } catch {
        /* ignore */
      }
    }

    let browserUrl: string | null = null
    if (cached?.browserInfo?.url) {
      browserUrl = cached.browserInfo.url
    } else if (activeWindow) {
      const urlInfo = await getBrowserUrl(activeWindow).catch(() => ({
        url: null,
        domain: null,
        browser: null,
      }))
      browserUrl = urlInfo.url
    }

    if (!textContent && !selectedText && !activeWindow) {
      return {
        success: false,
        output: {
          error:
            'Could not get context. No text field is focused and no window info available. Accessibility permissions may be required.',
        },
      }
    }

    return {
      success: true,
      output: {
        appName: activeWindow?.appName || null,
        windowTitle: activeWindow?.title || null,
        browserUrl,
        textContent,
        selectedText,
      },
    }
  }
}

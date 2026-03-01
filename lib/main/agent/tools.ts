import type { ToolResult } from './types'
import { macOSAccessibilityContextProvider } from '../../media/macOSAccessibilityContextProvider'
import { getActiveWindow } from '../../media/active-application'
import { getBrowserUrl } from '../../media/browser-url'
import { setFocusedText } from '../../media/text-writer'
import { getSelectedTextString } from '../../media/selected-text-reader'
import { activeWindowMonitor } from '../ActiveWindowMonitor'

export interface ToolDefinition {
  name: string
  description: string
  parameters?: Record<string, { type: string; description: string }>
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'get_context',
    description: 'Get the text field content and surrounding screen context. ALWAYS call this first when the user asks you to write, reply, or respond to something. Also use it when you need to understand what the user is looking at.',
  },
  {
    name: 'draft',
    description: 'Store a draft of the text you want to write. After drafting, you MUST call write_to_text_field immediately to paste it. The user will not see the draft separately.',
    parameters: {
      text: { type: 'string', description: 'The draft text to store' },
    },
  },
  {
    name: 'write_to_text_field',
    description: 'Pastes the current draft into the focused text field. Requires a draft to be stored first via the draft tool. Call this right after drafting — do not ask for confirmation.',
  },
  {
    name: 'stop',
    description: 'Signal that you are done with the task. Use when the task is complete or you cannot proceed.',
    parameters: {
      reason: { type: 'string', description: 'Brief explanation for stopping' },
    },
  },
]

let currentDraft: string | null = null
let shouldStop = false

export function resetToolState() {
  currentDraft = null
  shouldStop = false
}

export function getShouldStop(): boolean {
  return shouldStop
}

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case 'get_context':
        return await executeGetContext()
      case 'draft':
        return executeDraft(args)
      case 'write_to_text_field':
        return await executeWriteToTextField()
      case 'stop':
        return executeStop(args)
      default:
        return { success: false, output: { error: `Unknown tool: ${toolName}` } }
    }
  } catch (error) {
    console.error(`[AgentTools] Error executing ${toolName}:`, error)
    return { success: false, output: { error: String(error) } }
  }
}

async function executeGetContext(): Promise<ToolResult> {
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
        textContent = [result.context.textBefore, result.context.textAfter]
          .filter(Boolean)
          .join('[CURSOR]') || null
        selectedText = result.context.selectedText || null
      }
    } catch (e) {
      console.warn('[AgentTools] Accessibility context failed:', e)
    }
  }

  if (!textContent && !selectedText) {
    try {
      selectedText = await getSelectedTextString()
    } catch { /* ignore */ }
  }

  let browserUrl: string | null = null
  if (cached?.browserInfo?.url) {
    browserUrl = cached.browserInfo.url
  } else if (activeWindow) {
    const urlInfo = await getBrowserUrl(activeWindow).catch(() => ({ url: null, domain: null, browser: null }))
    browserUrl = urlInfo.url
  }

  if (!textContent && !selectedText && !activeWindow) {
    return { success: false, output: { error: 'Could not get context. No text field focused and no window info available.' } }
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

function executeDraft(args: Record<string, unknown>): ToolResult {
  const text = args.text as string
  if (!text || typeof text !== 'string') {
    return { success: false, output: { error: 'Missing text parameter for draft' } }
  }
  currentDraft = text
  return { success: true, output: { stored: true, text } }
}

async function executeWriteToTextField(): Promise<ToolResult> {
  if (currentDraft === null) {
    return { success: false, output: { error: 'No draft stored. Call draft tool first.' } }
  }
  const text = currentDraft
  currentDraft = null
  const success = await setFocusedText(text)
  if (success) {
    shouldStop = true
    return { success: true, output: { written: true, text } }
  }
  return { success: false, output: { error: 'Failed to paste text into focused field' } }
}

function executeStop(args: Record<string, unknown>): ToolResult {
  shouldStop = true
  return { success: true, output: { stopped: true, reason: args.reason || 'Task complete' } }
}

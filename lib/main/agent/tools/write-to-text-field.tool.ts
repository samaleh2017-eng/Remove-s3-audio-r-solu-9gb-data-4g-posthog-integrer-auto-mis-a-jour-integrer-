import type { ToolResult } from '../types'
import { setFocusedText } from '../../../media/text-writer'
import { BaseTool } from './base.tool'
import type { DraftTool } from './draft.tool'
import type { StopTool } from './stop.tool'

export class WriteToTextFieldTool extends BaseTool<Record<string, unknown>> {
  readonly name = 'write_to_text_field'
  readonly displayName = 'Write to Text Field'
  readonly description =
    'Pastes the current draft into the focused text field. Requires a draft to be stored first via the draft tool. Call this right after drafting — do not ask for confirmation.'
  readonly parameters = undefined

  private stopTool: StopTool | null = null
  private draftTool: DraftTool | null = null

  setStopTool(stopTool: StopTool): void {
    this.stopTool = stopTool
  }

  setDraftTool(draftTool: DraftTool): void {
    this.draftTool = draftTool
  }

  protected async execInternal(): Promise<ToolResult> {
    if (!this.draftTool) {
      return { success: false, output: { error: 'Internal error: Draft tool not configured.' } }
    }

    const draft = this.draftTool.getDraft()
    if (draft === null) {
      return {
        success: false,
        output: { error: 'Unable to write text, you must write a draft first using the draft tool.' },
      }
    }

    const success = await setFocusedText(draft)
    this.draftTool.clearDraft()

    if (success) {
      this.stopTool?.stop()
      return { success: true, output: { written: true, text: draft } }
    }

    return { success: false, output: { error: 'Failed to paste text into focused field' } }
  }
}

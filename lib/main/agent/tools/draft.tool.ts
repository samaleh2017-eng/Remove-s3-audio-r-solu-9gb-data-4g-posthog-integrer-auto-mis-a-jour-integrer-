import type { ToolResult } from '../types'
import { BaseTool } from './base.tool'

export class DraftTool extends BaseTool<{ text: string }> {
  readonly name = 'draft'
  readonly displayName = 'Draft'
  readonly description =
    'Store a draft of the text you want to write. After drafting, you MUST call write_to_text_field immediately to paste it. The user will not see the draft separately.'
  readonly parameters = {
    text: { type: 'string', description: 'The draft text to store' },
  }

  private draft: string | null = null
  private onDraftUpdated: ((draft: string) => void) | null = null

  setOnDraftUpdated(callback: (draft: string) => void): void {
    this.onDraftUpdated = callback
  }

  getDraft(): string | null {
    return this.draft
  }

  clearDraft(): void {
    this.draft = null
  }

  protected async execInternal(args: { text: string }): Promise<ToolResult> {
    const { text } = args
    if (!text || typeof text !== 'string') {
      return { success: false, output: { error: 'Missing text parameter for draft' } }
    }
    this.draft = text
    if (this.onDraftUpdated) {
      this.onDraftUpdated(text)
    }
    return { success: true, output: { stored: true, text } }
  }
}

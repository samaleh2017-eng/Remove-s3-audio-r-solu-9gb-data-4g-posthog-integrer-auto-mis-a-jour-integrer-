import type { ToolResult } from '../types'
import { BaseTool } from './base.tool'

export class StopTool extends BaseTool<{ reason: string }> {
  readonly name = 'stop'
  readonly displayName = 'Stop'
  readonly description =
    'Signal that you are done with the task. Use when the task is complete or you cannot proceed.'
  readonly parameters = {
    reason: { type: 'string', description: 'Brief explanation for stopping' },
  }

  private shouldStop = false

  getShouldStop(): boolean {
    return this.shouldStop
  }

  stop(): void {
    this.shouldStop = true
  }

  reset(): void {
    this.shouldStop = false
  }

  protected async execInternal(args: { reason: string }): Promise<ToolResult> {
    this.stop()
    return { success: true, output: { stopped: true, reason: args.reason || 'Task complete' } }
  }
}

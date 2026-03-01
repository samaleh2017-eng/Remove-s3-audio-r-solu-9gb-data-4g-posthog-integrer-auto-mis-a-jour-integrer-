import type { ToolResult } from '../types'

export abstract class BaseTool<TInput = Record<string, unknown>> {
  abstract readonly name: string
  abstract readonly displayName: string
  abstract readonly description: string
  abstract readonly parameters?: Record<string, { type: string; description: string }>

  protected abstract execInternal(args: TInput): Promise<ToolResult>

  async execute(args: unknown): Promise<ToolResult> {
    try {
      const result = await this.execInternal(args as TInput)
      console.log(`[AgentTool] ${this.name} executed:`, result.success ? 'SUCCESS' : 'FAILED')
      return result
    } catch (error) {
      console.error(`[AgentTool] ${this.name} error:`, error)
      return { success: false, output: { error: `Tool execution error: ${String(error)}` } }
    }
  }

  toPromptString(): string {
    const params = this.parameters
      ? `\nParameters: ${JSON.stringify(this.parameters, null, 2)}`
      : ''
    return `- ${this.name}: ${this.description}${params}`
  }
}

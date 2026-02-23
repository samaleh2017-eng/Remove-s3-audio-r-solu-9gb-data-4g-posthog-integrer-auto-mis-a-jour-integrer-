import { SonioxNodeClient, RealtimeSttSession } from '@soniox/node'
import { EventEmitter } from 'events'

interface SonioxToken {
  text: string
  is_final: boolean
}

export interface SonioxEvents {
  token: (token: SonioxToken) => void
  'final-text': (text: string) => void
  finished: () => void
  error: (error: Error) => void
}

export class SonioxStreamingService extends EventEmitter {
  private client: SonioxNodeClient | null = null
  private session: RealtimeSttSession | null = null
  private isActive = false
  private accumulatedText = ''
  private hasErrored = false

  async start(tempApiKey: string): Promise<void> {
    if (this.isActive) {
      console.warn(
        '[SonioxStreaming] Already active, stopping previous session',
      )
      await this.stop()
    }

    this.accumulatedText = ''
    this.hasErrored = false
    this.client = new SonioxNodeClient({ api_key: tempApiKey })

    this.session = this.client.realtime.stt({
      model: 'stt-rt-v4',
      audio_format: 'pcm_s16le',
      sample_rate: 16000,
      num_channels: 1,
      enable_endpoint_detection: true,
      language_hints: ['fr'],
    })

    this.session.on('result', result => {
      try {
        if (result.tokens && result.tokens.length > 0) {
          for (const token of result.tokens) {
            this.emit('token', {
              text: token.text,
              is_final: token.is_final,
            })
            if (token.is_final) {
              this.accumulatedText += token.text
            }
          }
          this.emit('final-text', this.accumulatedText)
        }
      } catch (error) {
        console.error('[SonioxStreaming] Error processing result:', error)
      }
    })

    this.session.on('finished', () => {
      console.log('[SonioxStreaming] Session finished')
      this.emit('finished')
    })

    this.session.on('error', (error: Error) => {
      console.error('[SonioxStreaming] Session error:', error.message)
      this.hasErrored = true
      this.isActive = false
      this.safeEmitError(error)
    })

    await this.session.connect()
    this.isActive = true
    console.log('[SonioxStreaming] Session started')
  }

  private safeEmitError(error: Error): void {
    if (this.listenerCount('error') > 0) {
      this.emit('error', error)
    } else {
      console.error(
        '[SonioxStreaming] Unhandled error (no listener):',
        error.message,
      )
    }
  }

  sendAudio(chunk: Buffer): void {
    if (!this.isActive || !this.session || this.hasErrored) return
    try {
      this.session.sendAudio(chunk)
    } catch (error) {
      console.error('[SonioxStreaming] Error sending audio chunk:', error)
      this.hasErrored = true
      this.isActive = false
      this.safeEmitError(
        error instanceof Error
          ? error
          : new Error('Failed to send audio chunk'),
      )
    }
  }

  async stop(): Promise<string> {
    if (!this.session) {
      return this.accumulatedText
    }

    try {
      if (this.isActive && !this.hasErrored) {
        await this.session.finish()
      }
      this.session.close()
    } catch (error) {
      console.error('[SonioxStreaming] Error during stop:', error)
    }

    this.isActive = false
    this.session = null
    this.client = null

    const finalText = this.accumulatedText
    console.log(
      '[SonioxStreaming] Session stopped, final text length:',
      finalText.length,
    )
    return finalText
  }

  cancel(): void {
    if (!this.session) return
    try {
      this.session.close()
    } catch (error) {
      console.error('[SonioxStreaming] Error during cancel:', error)
    }
    this.isActive = false
    this.hasErrored = false
    this.session = null
    this.client = null
    this.accumulatedText = ''
  }

  getAccumulatedText(): string {
    return this.accumulatedText
  }

  isCurrentlyActive(): boolean {
    return this.isActive
  }

  hasEncounteredError(): boolean {
    return this.hasErrored
  }
}

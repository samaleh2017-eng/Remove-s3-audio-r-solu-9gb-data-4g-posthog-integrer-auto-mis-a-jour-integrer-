import { itoHttpClient } from '../../clients/itoHttpClient'

export class SonioxTempKeyManager {
  private cachedKey: string | null = null
  private keyExpiresAt: number = 0
  private readonly REFRESH_MARGIN_MS = 5 * 60 * 1000

  async getKey(): Promise<string> {
    if (
      this.cachedKey &&
      Date.now() < this.keyExpiresAt - this.REFRESH_MARGIN_MS
    ) {
      return this.cachedKey
    }

    console.log('[SonioxTempKey] Fetching new temporary key from server')
    const response = await itoHttpClient.post('/soniox/temp-key', undefined, {
      requireAuth: true,
    })

    if (!response.success || !response.key) {
      throw new Error(
        `Failed to get Soniox temp key: ${response.error || 'Unknown error'}`,
      )
    }

    this.cachedKey = response.key
    this.keyExpiresAt = Date.now() + response.expires_in_seconds * 1000

    console.log(
      '[SonioxTempKey] Got new key, expires in',
      response.expires_in_seconds,
      'seconds',
    )
    return this.cachedKey
  }

  invalidate(): void {
    this.cachedKey = null
    this.keyExpiresAt = 0
  }

  async warmup(): Promise<void> {
    try {
      await this.getKey()
      console.log('[SonioxTempKey] Key pre-warmed successfully')
    } catch (error) {
      console.warn('[SonioxTempKey] Warmup failed (will retry on use):', error)
    }
  }
}

export const sonioxTempKeyManager = new SonioxTempKeyManager()

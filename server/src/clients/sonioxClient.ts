import { SonioxNodeClient } from '@soniox/node'
import * as dotenv from 'dotenv'
import { ClientProvider } from './providers.js'

dotenv.config()

class SonioxClientWrapper {
  private readonly _client: SonioxNodeClient
  private readonly _isValid: boolean

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error(`${ClientProvider.SONIOX} API key not provided`)
    }
    this._client = new SonioxNodeClient({ api_key: apiKey })
    this._isValid = true
  }

  public get isAvailable(): boolean {
    return this._isValid
  }

  public get client(): SonioxNodeClient {
    return this._client
  }

  public async createTemporaryKey(expiresInSeconds: number = 3600): Promise<string> {
    const result = await this._client.auth.createTemporaryKey({
      usage_type: 'transcribe_websocket',
      expires_in_seconds: expiresInSeconds,
    })
    return result.api_key
  }
}

const apiKey = process.env.SONIOX_API_KEY

let sonioxClient: SonioxClientWrapper | null = null

if (apiKey) {
  try {
    sonioxClient = new SonioxClientWrapper(apiKey)
    console.log('Soniox client initialized successfully')
  } catch (error) {
    console.error('Failed to initialize Soniox client:', error)
    sonioxClient = null
  }
} else {
  console.log('SONIOX_API_KEY not set - Soniox client will not be available')
}

export { sonioxClient }

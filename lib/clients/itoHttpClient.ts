import store from '../main/store'
import { STORE_KEYS } from '../constants/store-keys'

interface RequestOptions {
  requireAuth?: boolean
  headers?: Record<string, string>
  timeoutMs?: number
  retries?: number
}

const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_RETRIES = 0
const RETRY_DELAY_MS = 1_000

class ItoHttpClient {
  private getBaseUrl(): string {
    return import.meta.env.VITE_GRPC_BASE_URL
  }

  private getAccessToken(): string {
    return (store.get(STORE_KEYS.ACCESS_TOKEN) as string | null) || ''
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number,
  ): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetch(url, { ...init, signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
  }

  private async executeWithRetry(
    fn: () => Promise<any>,
    retries: number,
    path: string,
  ): Promise<any> {
    let lastError: any = null
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn()
      } catch (error: any) {
        lastError = error
        const isAbort = error?.name === 'AbortError'
        const label = isAbort ? 'timeout' : 'network error'
        console.warn(
          `[ItoHttp] ${path} attempt ${attempt + 1}/${retries + 1} failed (${label}): ${error?.message}`,
        )
        if (attempt < retries) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt)
          console.info(`[ItoHttp] Retrying ${path} in ${delay}ms...`)
          await new Promise((r) => setTimeout(r, delay))
        }
      }
    }
    const isAbort = lastError?.name === 'AbortError'
    return {
      success: false,
      error: isAbort
        ? `Server did not respond within timeout (${path})`
        : lastError?.message || 'Network error',
      isTimeout: isAbort,
    }
  }

  async get(path: string, options: RequestOptions = {}) {
    const {
      requireAuth = false,
      headers = {},
      timeoutMs = DEFAULT_TIMEOUT_MS,
      retries = DEFAULT_RETRIES,
    } = options
    const token = this.getAccessToken()

    if (requireAuth && !token) {
      console.warn(`[ItoHttp] GET ${path} — no access token`)
      return { success: false, error: 'Access token not available' }
    }

    const baseUrl = this.getBaseUrl()
    if (!baseUrl) {
      console.error(`[ItoHttp] GET ${path} — VITE_GRPC_BASE_URL is not set`)
      return { success: false, error: 'Server URL not configured' }
    }

    console.info(`[ItoHttp] GET ${path} (timeout=${timeoutMs}ms, retries=${retries})`)

    return this.executeWithRetry(
      async () => {
        const url = new URL(path, baseUrl)
        const response = await this.fetchWithTimeout(
          url.toString(),
          {
            headers: {
              ...headers,
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
          timeoutMs,
        )

        const data: any = await response.json().catch(() => undefined)

        if (!response.ok) {
          const errMsg = data?.error || `Request failed (${response.status})`
          console.warn(`[ItoHttp] GET ${path} → ${response.status}: ${errMsg}`)
          return {
            success: false,
            error: errMsg,
            status: response.status,
          }
        }

        console.info(`[ItoHttp] GET ${path} → OK`)
        return data
      },
      retries,
      `GET ${path}`,
    )
  }

  async post(path: string, body?: any, options: RequestOptions = {}) {
    const {
      requireAuth = false,
      headers = {},
      timeoutMs = DEFAULT_TIMEOUT_MS,
      retries = DEFAULT_RETRIES,
    } = options
    const token = this.getAccessToken()

    if (requireAuth && !token) {
      console.warn(`[ItoHttp] POST ${path} — no access token`)
      return { success: false, error: 'Access token not available' }
    }

    const baseUrl = this.getBaseUrl()
    if (!baseUrl) {
      console.error(`[ItoHttp] POST ${path} — VITE_GRPC_BASE_URL is not set`)
      return { success: false, error: 'Server URL not configured' }
    }

    console.info(`[ItoHttp] POST ${path} (timeout=${timeoutMs}ms, retries=${retries})`)

    return this.executeWithRetry(
      async () => {
        const url = new URL(path, baseUrl)
        const response = await this.fetchWithTimeout(
          url.toString(),
          {
            method: 'POST',
            headers: {
              ...(body && { 'content-type': 'application/json' }),
              ...headers,
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            ...(body && { body: JSON.stringify(body) }),
          },
          timeoutMs,
        )

        const data: any = await response.json().catch(() => undefined)

        if (!response.ok) {
          const errMsg = data?.error || `Request failed (${response.status})`
          console.warn(`[ItoHttp] POST ${path} → ${response.status}: ${errMsg}`)
          return {
            success: false,
            error: errMsg,
            status: response.status,
          }
        }

        console.info(`[ItoHttp] POST ${path} → OK`)
        return data
      },
      retries,
      `POST ${path}`,
    )
  }
}

export const itoHttpClient = new ItoHttpClient()

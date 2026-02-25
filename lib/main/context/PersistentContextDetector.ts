import {
  AppTargetTable,
  ToneTable,
  type Tone,
  type AppTarget,
} from '../sqlite/appTargetRepo'
import {
  AppTargetSignatureTable,
  type SignatureType,
} from '../sqlite/appTargetSignatureRepo'
import type { ActiveWindow } from '../../media/active-application'
import { getCurrentUserId } from '../store'
import { normalizeAppTargetId } from '../../utils/appTargetUtils'

const DEFAULT_LOCAL_USER_ID = 'local-user'
const DEFAULT_TONE_ID = 'disabled'

export interface ResolvedTarget {
  target: AppTarget | null
  tone: Tone | null
  signature: string | null
  signatureType: SignatureType | null
}

const NULL_RESULT: ResolvedTarget = {
  target: null,
  tone: null,
  signature: null,
  signatureType: null,
}

export class PersistentContextDetector {
  private resultCache = new Map<string, ResolvedTarget>()

  public clearCache(): void {
    this.resultCache.clear()
  }

  public invalidateTarget(targetId: string): void {
    for (const [key, cached] of this.resultCache) {
      if (cached.target?.id === targetId) {
        this.resultCache.delete(key)
      }
    }
    console.log(
      `[PersistentContextDetector] Invalidated cache for target: ${targetId}`,
    )
  }

  public async resolveForWindow(
    window: ActiveWindow | null,
    browserDomain: string | null,
  ): Promise<ResolvedTarget> {
    if (!window?.appName) return NULL_RESULT

    const userId = getCurrentUserId() || DEFAULT_LOCAL_USER_ID

    const appSignature = window.bundleId || window.exePath || null
    const appSignatureType: SignatureType | null = window.bundleId
      ? 'bundle_id'
      : window.exePath
        ? 'exe_path'
        : null

    if (browserDomain) {
      const domainSig = `domain:${browserDomain}`

      const domainResult = await this.lookupSignature(
        domainSig,
        'domain',
        userId,
      )
      if (domainResult) return domainResult

      if (!this.resultCache.has(domainSig)) {
        const domainTarget = await AppTargetTable.findByDomain(
          browserDomain,
          userId,
        )
        if (domainTarget) {
          await AppTargetSignatureTable.upsert(
            userId,
            domainTarget.id,
            domainSig,
            'domain',
          )
          console.log(
            `[PersistentContextDetector] Auto-learned domain: ${domainSig} -> ${domainTarget.id}`,
          )
          return this.buildAndCache(domainTarget, domainSig, 'domain')
        }
        this.resultCache.set(domainSig, NULL_RESULT)
      }
    }

    if (appSignature && appSignatureType) {
      const appResult = await this.lookupSignature(
        appSignature,
        appSignatureType,
        userId,
      )
      if (appResult) return appResult
    }

    const appId = normalizeAppTargetId(window.appName)
    const legacyTarget = await AppTargetTable.findById(appId, userId)
    if (legacyTarget) {
      if (appSignature && appSignatureType) {
        await AppTargetSignatureTable.upsert(
          userId,
          legacyTarget.id,
          appSignature,
          appSignatureType,
        )
        console.log(
          `[PersistentContextDetector] Auto-learned: ${appSignature} -> ${legacyTarget.id}`,
        )
      }
      return this.buildAndCache(legacyTarget, appSignature, appSignatureType)
    }

    if (appSignature) {
      this.resultCache.set(appSignature, NULL_RESULT)
    }
    return NULL_RESULT
  }

  private async lookupSignature(
    signature: string,
    signatureType: SignatureType,
    userId: string,
  ): Promise<ResolvedTarget | null> {
    const cached = this.resultCache.get(signature)
    if (cached !== undefined) {
      if (!cached.target) return null
      AppTargetSignatureTable.touchLastSeen(signature, userId).catch(() => {})
      return cached
    }

    const sigRecord = await AppTargetSignatureTable.findBySignature(
      signature,
      userId,
    )
    if (!sigRecord) return null

    const target = await AppTargetTable.findById(sigRecord.targetId, userId)
    if (!target) return null

    AppTargetSignatureTable.touchLastSeen(signature, userId).catch(() => {})
    return this.buildAndCache(target, signature, signatureType)
  }

  private async buildAndCache(
    target: AppTarget,
    signature: string | null,
    signatureType: SignatureType | null,
  ): Promise<ResolvedTarget> {
    const toneId = target.toneId || DEFAULT_TONE_ID
    const tone = await ToneTable.findById(toneId)
    const result: ResolvedTarget = { target, tone, signature, signatureType }
    if (signature) {
      this.resultCache.set(signature, result)
    }
    return result
  }

  public async registerSignaturesForTarget(
    targetId: string,
    bundleId: string | null,
    exePath: string | null,
    domain: string | null,
  ): Promise<void> {
    const userId = getCurrentUserId() || DEFAULT_LOCAL_USER_ID

    if (bundleId) {
      await AppTargetSignatureTable.upsert(
        userId,
        targetId,
        bundleId,
        'bundle_id',
      )
      this.resultCache.delete(bundleId)
      console.log(
        `[PersistentContextDetector] Registered bundle_id: ${bundleId} -> ${targetId}`,
      )
    }

    if (exePath) {
      await AppTargetSignatureTable.upsert(
        userId,
        targetId,
        exePath,
        'exe_path',
      )
      this.resultCache.delete(exePath)
      console.log(
        `[PersistentContextDetector] Registered exe_path: ${exePath} -> ${targetId}`,
      )
    }

    if (domain) {
      const domainSig = `domain:${domain}`
      await AppTargetSignatureTable.upsert(
        userId,
        targetId,
        domainSig,
        'domain',
      )
      this.resultCache.delete(domainSig)
      console.log(
        `[PersistentContextDetector] Registered domain: ${domain} -> ${targetId}`,
      )
    }
  }

  public async removeSignaturesForTarget(targetId: string): Promise<void> {
    const userId = getCurrentUserId() || DEFAULT_LOCAL_USER_ID
    const sigs = await AppTargetSignatureTable.findAllByTarget(
      targetId,
      userId,
    )
    for (const sig of sigs) {
      this.resultCache.delete(sig.signature)
    }
    await AppTargetSignatureTable.deleteByTarget(targetId, userId)
    this.invalidateTarget(targetId)
  }
}

export const persistentContextDetector = new PersistentContextDetector()

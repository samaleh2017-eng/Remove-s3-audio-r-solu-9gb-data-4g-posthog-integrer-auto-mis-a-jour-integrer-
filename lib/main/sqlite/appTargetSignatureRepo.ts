import { run, get, all } from './utils'

export type SignatureType = 'bundle_id' | 'exe_path' | 'domain'

export type AppTargetSignature = {
  id: number
  userId: string
  targetId: string
  signature: string
  signatureType: SignatureType
  createdAt: string
  lastSeenAt: string
}

type SignatureRow = {
  id: number
  user_id: string
  target_id: string
  signature: string
  signature_type: string
  created_at: string
  last_seen_at: string
}

function mapRow(row: SignatureRow): AppTargetSignature {
  return {
    id: row.id,
    userId: row.user_id,
    targetId: row.target_id,
    signature: row.signature,
    signatureType: row.signature_type as SignatureType,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
  }
}

export const AppTargetSignatureTable = {
  async findBySignature(
    signature: string,
    userId: string,
  ): Promise<AppTargetSignature | null> {
    const row = await get<SignatureRow>(
      `SELECT id, user_id, target_id, signature, signature_type, created_at, last_seen_at
       FROM app_target_signatures
       WHERE signature = ? AND user_id = ?`,
      [signature, userId],
    )
    return row ? mapRow(row) : null
  },

  async findAllByTarget(
    targetId: string,
    userId: string,
  ): Promise<AppTargetSignature[]> {
    const rows = await all<SignatureRow>(
      `SELECT id, user_id, target_id, signature, signature_type, created_at, last_seen_at
       FROM app_target_signatures
       WHERE target_id = ? AND user_id = ?`,
      [targetId, userId],
    )
    return rows.map(mapRow)
  },

  async upsert(
    userId: string,
    targetId: string,
    signature: string,
    signatureType: SignatureType,
  ): Promise<void> {
    const now = new Date().toISOString()
    await run(
      `INSERT INTO app_target_signatures (user_id, target_id, signature, signature_type, created_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(signature, user_id) DO UPDATE SET
         target_id = excluded.target_id,
         signature_type = excluded.signature_type,
         last_seen_at = excluded.last_seen_at`,
      [userId, targetId, signature, signatureType, now, now],
    )
  },

  async touchLastSeen(signature: string, userId: string): Promise<void> {
    const now = new Date().toISOString()
    await run(
      `UPDATE app_target_signatures SET last_seen_at = ? WHERE signature = ? AND user_id = ?`,
      [now, signature, userId],
    )
  },

  async deleteByTarget(targetId: string, userId: string): Promise<void> {
    await run(
      `DELETE FROM app_target_signatures WHERE target_id = ? AND user_id = ?`,
      [targetId, userId],
    )
  },

  async deleteAllUserData(userId: string): Promise<void> {
    await run(`DELETE FROM app_target_signatures WHERE user_id = ?`, [userId])
  },
}

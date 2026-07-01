import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 32

function getEncryptionKey(salt?: string): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error("ENCRYPTION_KEY or AUTH_SECRET (min 32 chars) required for encryption")
  }
  return scryptSync(secret, salt || "invoice-saas-salt", 32)
}

export function encrypt(plaintext: string, salt?: string): string {
  const key = getEncryptionKey(salt)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return Buffer.concat([iv, authTag, encrypted]).toString("base64")
}

export function decrypt(ciphertext: string, salt?: string): string {
  const data = Buffer.from(ciphertext, "base64")

  const iv = data.subarray(0, IV_LENGTH)
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  try {
    const key = getEncryptionKey(salt)
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
  } catch (err) {
    if (salt) {
      try {
        const legacyKey = getEncryptionKey(undefined)
        const decipher = createDecipheriv(ALGORITHM, legacyKey, iv)
        decipher.setAuthTag(authTag)
        return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
      } catch {}
    }
    throw err
  }
}

export function hashToken(token: string): string {
  return scryptSync(token, "token-salt", 32).toString("hex")
}

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 32

function getEncryptionKey(salt?: string, overrideKey?: string): Buffer {
  const secret = overrideKey || process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error("ENCRYPTION_KEY or AUTH_SECRET (min 32 chars) required for encryption")
  }
  return scryptSync(secret, salt || "invoice-saas-salt", 32)
}

export function encrypt(plaintext: string, salt?: string, overrideKey?: string): string {
  const key = getEncryptionKey(salt, overrideKey)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return Buffer.concat([iv, authTag, encrypted]).toString("base64")
}

export function decrypt(ciphertext: string, salt?: string, overrideKey?: string): string {
  const data = Buffer.from(ciphertext, "base64")

  const iv = data.subarray(0, IV_LENGTH)
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  try {
    const key = getEncryptionKey(salt, overrideKey)
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
  } catch (err) {
    if (salt) {
      try {
        const legacyKey = getEncryptionKey(undefined, overrideKey)
        const decipher = createDecipheriv(ALGORITHM, legacyKey, iv)
        decipher.setAuthTag(authTag)
        return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
      } catch {}
    }
    throw err
  }
}

export async function decryptAndMigrate(
  cipherText: string,
  salt: string | undefined,
  onMigrate: (newCipherText: string) => Promise<void>
): Promise<string> {
  try {
    return decrypt(cipherText, salt)
  } catch (primaryErr) {
    const prevKeysStr = process.env.PREVIOUS_ENCRYPTION_KEYS
    if (prevKeysStr) {
      const prevKeys = prevKeysStr.split(",").map(k => k.trim()).filter(Boolean)
      for (const prevKey of prevKeys) {
        try {
          const decrypted = decrypt(cipherText, salt, prevKey)
          const newCipherText = encrypt(decrypted, salt)
          
          onMigrate(newCipherText).catch(err => {
            console.error("[Key Rotation] Failed to save migrated key in background:", err)
          })
          
          return decrypted
        } catch {
          // Keep searching
        }
      }
    }
    throw primaryErr
  }
}

export function hashToken(token: string): string {
  return scryptSync(token, "token-salt", 32).toString("hex")
}

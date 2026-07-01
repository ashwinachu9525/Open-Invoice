import crypto from "crypto"

function getEncryptionKey(salt?: string, overrideKey?: string): Buffer {
  const keyStr = overrideKey || process.env.ENCRYPTION_KEY
  if (!keyStr) {
    throw new Error("ENCRYPTION_KEY environment variable is missing")
  }
  
  if (salt) {
    // Derive a unique 32-byte key specifically for this tenant using HKDF
    const derivedKey = crypto.hkdfSync(
      "sha256",
      keyStr,
      Buffer.from(salt),
      Buffer.from("open-invoice-tenant-key-derivation"),
      32
    )
    return Buffer.from(derivedKey)
  }
  
  // Backwards compatibility legacy key parsing
  return Buffer.from(keyStr.padEnd(32, "0").slice(0, 32), "utf-8")
}

export function encrypt(text: string, salt?: string, overrideKey?: string): string {
  const iv = crypto.randomBytes(12)
  const key = getEncryptionKey(salt, overrideKey)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  
  let encrypted = cipher.update(text, "utf8", "base64")
  encrypted += cipher.final("base64")
  
  const authTag = cipher.getAuthTag().toString("base64")
  
  return `${iv.toString("base64")}:${authTag}:${encrypted}`
}

export function decrypt(cipherText: string, salt?: string, overrideKey?: string): string {
  const parts = cipherText.split(":")
  if (parts.length !== 3) {
    throw new Error("Invalid cipher text format")
  }
  
  const [ivBase64, authTagBase64, encryptedBase64] = parts
  const iv = Buffer.from(ivBase64, "base64")
  const authTag = Buffer.from(authTagBase64, "base64")
  
  // Try decrypting with derived key (if salt is provided)
  try {
    const key = getEncryptionKey(salt, overrideKey)
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encryptedBase64, "base64", "utf8")
    decrypted += decipher.final("utf8")
    return decrypted
  } catch (err) {
    // Fallback: if salt-derived decryption fails, try decrypting using the legacy raw key (for backwards compatibility)
    if (salt) {
      try {
        const legacyKey = getEncryptionKey(undefined, overrideKey)
        const decipher = crypto.createDecipheriv("aes-256-gcm", legacyKey, iv)
        decipher.setAuthTag(authTag)
        
        let decrypted = decipher.update(encryptedBase64, "base64", "utf8")
        decrypted += decipher.final("utf8")
        return decrypted
      } catch {
        // rethrow original decryption error if fallback fails
      }
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

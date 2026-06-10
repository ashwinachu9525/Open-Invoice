import crypto from "crypto"

function getEncryptionKey() {
  const keyStr = process.env.ENCRYPTION_KEY
  if (!keyStr) {
    throw new Error("ENCRYPTION_KEY environment variable is missing")
  }
  // Convert 32-character string to 32-byte buffer
  const key = Buffer.from(keyStr.padEnd(32, "0").slice(0, 32), "utf-8")
  return key
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv)
  
  let encrypted = cipher.update(text, "utf8", "base64")
  encrypted += cipher.final("base64")
  
  const authTag = cipher.getAuthTag().toString("base64")
  
  return `${iv.toString("base64")}:${authTag}:${encrypted}`
}

export function decrypt(cipherText: string): string {
  const parts = cipherText.split(":")
  if (parts.length !== 3) {
    throw new Error("Invalid cipher text format")
  }
  
  const [ivBase64, authTagBase64, encryptedBase64] = parts
  const iv = Buffer.from(ivBase64, "base64")
  const authTag = Buffer.from(authTagBase64, "base64")
  
  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encryptedBase64, "base64", "utf8")
  decrypted += decipher.final("utf8")
  
  return decrypted
}

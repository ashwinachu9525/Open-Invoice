import DOMPurify from "isomorphic-dompurify"

/**
 * Sanitizes a string input by stripping all HTML tags.
 * This is extremely aggressive to prevent any possible XSS payloads.
 */
export function sanitizeInput(input: string | undefined | null): string {
  if (typeof input !== "string") return ""
  
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Strip all tags (no <b>, <i>, <script>, etc.)
    ALLOWED_ATTR: [], // Strip all attributes
  }).trim()
}

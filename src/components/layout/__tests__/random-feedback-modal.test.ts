import { describe, it, expect } from "vitest"
import { shouldTriggerFeedback } from "../random-feedback-modal"

describe("Feedback Trigger Logic", () => {
  it("should trigger if no last prompt and random value is low enough", () => {
    // low random value < 0.10
    expect(shouldTriggerFeedback(null, Date.now(), 0.05)).toBe(true)
  })

  it("should NOT trigger if no last prompt but random value is high", () => {
    // high random value >= 0.10
    expect(shouldTriggerFeedback(null, Date.now(), 0.15)).toBe(false)
  })

  it("should NOT trigger if prompted within 30 days regardless of random value", () => {
    const now = Date.now()
    const fiveDaysAgo = (now - 5 * 24 * 60 * 60 * 1000).toString()
    
    // low random value but still blocked by 30-day guard
    expect(shouldTriggerFeedback(fiveDaysAgo, now, 0.01)).toBe(false)
  })

  it("should trigger if prompted more than 30 days ago and random value is low", () => {
    const now = Date.now()
    const thirtyOneDaysAgo = (now - 31 * 24 * 60 * 60 * 1000).toString()
    
    expect(shouldTriggerFeedback(thirtyOneDaysAgo, now, 0.05)).toBe(true)
  })
})

import { SleepSession } from './supabase'

interface SleepPrediction {
  nextBedtime: string
  timeUntilBedtime: string
  expectedDuration: string
  confidence: number
  summary: string
  reasoning: string
}

// Simple in-memory cache for sleep predictions
interface CacheEntry {
  prediction: SleepPrediction
  timestamp: number
  expiresAt: number
}

class PredictionCache {
  private cache = new Map<string, CacheEntry>()
  private readonly DEFAULT_TTL = 10 * 60 * 1000 // 10 minutes

  generateKey(childAge: number, sleepHistory: SleepSession[], childGender: string, childName: string): string {
    // Create cache key based on relevant data that affects prediction
    const lastSleepTime = sleepHistory.length > 0 ? sleepHistory[0].end_time : null
    const sessionCount = sleepHistory.length
    
    // Round age to nearest month and time to nearest 30 minutes for better cache hits
    const roundedAge = Math.round(childAge)
    const roundedTime = lastSleepTime ? Math.floor(new Date(lastSleepTime).getTime() / (30 * 60 * 1000)) : 0
    
    return `${roundedAge}-${childGender}-${childName}-${sessionCount}-${roundedTime}`
  }

  get(key: string): SleepPrediction | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    
    return entry.prediction
  }

  set(key: string, prediction: SleepPrediction, ttl = this.DEFAULT_TTL): void {
    const entry: CacheEntry = {
      prediction,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    }
    
    this.cache.set(key, entry)
    
    // Clean up expired entries periodically
    this.cleanup()
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }

  clear(): void {
    this.cache.clear()
  }

  // Check if prediction is still fresh enough to avoid recalculation
  isFresh(key: string, maxAge = 5 * 60 * 1000): boolean { // 5 minutes default
    const entry = this.cache.get(key)
    if (!entry) return false
    
    return (Date.now() - entry.timestamp) < maxAge
  }
}

// Singleton instance
export const predictionCache = new PredictionCache()
import { SleepSession, SleepContext, Prediction, supabase } from './supabase'

/**
 * Enhanced prediction cache service that works with the new database schema
 * Handles sleep context tracking, prediction caching, and usage analytics
 */

interface SleepPrediction {
  nextBedtime: string
  timeUntilBedtime: string
  expectedDuration: string
  confidence: number
  summary: string
  reasoning: string
  provider?: string
  model?: string
}

class PredictionCacheService {
  /**
   * Parse session IDs from JSON string (helper for simple schema)
   */
  private parseSessionIds(sessionIdsJson: string): string[] {
    try {
      return JSON.parse(sessionIdsJson)
    } catch {
      return []
    }
  }

  /**
   * Generate a hash for sleep context based on sleep sessions
   */
  private generateSleepContextHash(sessions: SleepSession[], childAgeMonths: number): string {
    // Create a stable hash based on:
    // - Session IDs and their end times
    // - Child age (rounded to nearest month)
    // - Total sessions count
    const sessionData = sessions
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .map(s => `${s.id}:${s.end_time || 'active'}:${s.duration_minutes || 0}`)
      .join('|')
    
    const contextString = `age:${Math.round(childAgeMonths)}|sessions:${sessions.length}|data:${sessionData}`
    
    // Simple hash function (in production, consider using crypto.subtle.digest)
    let hash = 0
    for (let i = 0; i < contextString.length; i++) {
      const char = contextString.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16)
  }

  /**
   * Calculate context metadata from sleep sessions
   */
  private calculateContextMetadata(sessions: SleepSession[]) {
    const completedSessions = sessions.filter(s => s.duration_minutes)
    const totalSleepMinutes = completedSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
    const totalSleepHours = totalSleepMinutes / 60
    const averageSessionDuration = completedSessions.length > 0 
      ? Math.round(totalSleepMinutes / completedSessions.length)
      : null

    return {
      total_sleep_hours: totalSleepHours,
      average_session_duration: averageSessionDuration
    }
  }

  /**
   * Find existing active prediction for given sleep context
   */
  async findActivePrediction(childId: string, contextHash: string): Promise<Prediction | null> {
    try {
      const { data: contexts } = await supabase
        .from('sleep_contexts')
        .select(`
          id,
          predictions!inner(*)
        `)
        .eq('child_id', childId)
        .eq('context_hash', contextHash)
        .eq('predictions.is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)

      if (contexts && contexts.length > 0 && contexts[0].predictions && contexts[0].predictions.length > 0) {
        return contexts[0].predictions[0] as Prediction
      }

      return null
    } catch (error) {
      console.error('Error finding active prediction:', error)
      return null
    }
  }

  /**
   * Create or find sleep context for given sessions
   */
  async createOrFindSleepContext(
    childId: string, 
    sessions: SleepSession[], 
    childAgeMonths: number
  ): Promise<SleepContext> {
    const contextHash = this.generateSleepContextHash(sessions, childAgeMonths)
    const metadata = this.calculateContextMetadata(sessions)
    
    // Try to find existing context
    const { data: existingContext } = await supabase
      .from('sleep_contexts')
      .select('*')
      .eq('child_id', childId)
      .eq('context_hash', contextHash)
      .single()

    if (existingContext) {
      return existingContext as SleepContext
    }

    // Create new context - find the most recent completed session
    const completedSessions = sessions.filter(s => s.end_time)
    const lastSleepSession = completedSessions.length > 0 
      ? completedSessions.reduce((latest, current) => 
          new Date(current.end_time!).getTime() > new Date(latest.end_time!).getTime() 
            ? current 
            : latest
        )
      : null
    
    const { data: newContext, error } = await supabase
      .from('sleep_contexts')
      .insert({
        child_id: childId,
        context_hash: contextHash,
        sessions_count: sessions.length,
        session_ids: JSON.stringify(sessions.map(s => s.id)), // Store as JSON string
        last_sleep_session_id: lastSleepSession?.id || null,
        child_age_months: Math.round(childAgeMonths),
        ...metadata
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create sleep context: ${error.message}`)
    }

    return newContext as SleepContext
  }

  /**
   * Save prediction linked to sleep context
   */
  async savePrediction(
    childId: string,
    sleepContextId: string,
    prediction: SleepPrediction,
    metadata: {
      llm_provider: string
      model_used?: string
      generation_time_ms?: number
    }
  ): Promise<Prediction> {
    const { data: savedPrediction, error } = await supabase
      .from('predictions')
      .insert({
        child_id: childId,
        sleep_context_id: sleepContextId,
        next_bedtime: prediction.nextBedtime,
        time_until_bedtime: prediction.timeUntilBedtime,
        expected_duration: prediction.expectedDuration,
        confidence: prediction.confidence,
        summary: prediction.summary,
        reasoning: prediction.reasoning,
        llm_provider: metadata.llm_provider,
        model_used: metadata.model_used,
        generation_time_ms: metadata.generation_time_ms,
        is_active: true,
        used_count: 0
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to save prediction: ${error.message}`)
    }

    return savedPrediction as Prediction
  }

  /**
   * Track prediction usage
   */
  async trackPredictionUsage(
    predictionId: string,
    childId: string,
    options: {
      was_from_cache: boolean
      user_action?: string
    }
  ): Promise<void> {
    try {
      // Get current usage count and increment it
      const { data: currentPrediction } = await supabase
        .from('predictions')
        .select('used_count')
        .eq('id', predictionId)
        .single()
      
      const newCount = (currentPrediction?.used_count || 0) + 1
      
      // Update prediction usage count
      await supabase
        .from('predictions')
        .update({ 
          used_count: newCount,
          last_served_at: new Date().toISOString()
        })
        .eq('id', predictionId)

      // Record usage event
      await supabase
        .from('prediction_usage')
        .insert({
          prediction_id: predictionId,
          child_id: childId,
          was_from_cache: options.was_from_cache,
          user_action: options.user_action
        })
    } catch (error) {
      console.error('Error tracking prediction usage:', error)
      // Don't throw - usage tracking shouldn't break the main flow
    }
  }

  /**
   * Invalidate predictions for a child (called when new sleep data is added)
   */
  async invalidatePredictions(childId: string, excludeContextId?: string): Promise<void> {
    try {
      const query = supabase
        .from('predictions')
        .update({ is_active: false })
        .eq('child_id', childId)
        .eq('is_active', true)

      if (excludeContextId) {
        query.neq('sleep_context_id', excludeContextId)
      }

      await query
    } catch (error) {
      console.error('Error invalidating predictions:', error)
      // Don't throw - invalidation shouldn't break the main flow
    }
  }

  /**
   * Get cached prediction if available, otherwise return null
   */
  async getCachedPrediction(
    childId: string, 
    sessions: SleepSession[], 
    childAgeMonths: number
  ): Promise<Prediction | null> {
    const contextHash = this.generateSleepContextHash(sessions, childAgeMonths)
    const prediction = await this.findActivePrediction(childId, contextHash)
    
    if (prediction) {
      await this.trackPredictionUsage(prediction.id, childId, { was_from_cache: true })
    }
    
    return prediction
  }

  /**
   * Main method: Get prediction from cache or indicate new prediction needed
   */
  async getPredictionFromCache(
    childId: string,
    sessions: SleepSession[],
    childAgeMonths: number
  ): Promise<{
    prediction: Prediction | null
    sleepContext: SleepContext
    fromCache: boolean
  }> {
    // Always create/find the sleep context
    const sleepContext = await this.createOrFindSleepContext(childId, sessions, childAgeMonths)
    
    // Look for existing active prediction
    const cachedPrediction = await this.findActivePrediction(childId, sleepContext.context_hash)
    
    if (cachedPrediction) {
      await this.trackPredictionUsage(cachedPrediction.id, childId, { was_from_cache: true })
      return {
        prediction: cachedPrediction,
        sleepContext,
        fromCache: true
      }
    }

    return {
      prediction: null,
      sleepContext,
      fromCache: false
    }
  }

  /**
   * Submit feedback for a prediction
   */
  async submitPredictionFeedback(
    predictionId: string,
    feedback: 'helpful' | 'not_helpful' | 'inaccurate',
    notes?: string
  ): Promise<void> {
    try {
      await supabase
        .from('predictions')
        .update({
          user_feedback: feedback,
          feedback_notes: notes
        })
        .eq('id', predictionId)
    } catch (error) {
      console.error('Error submitting prediction feedback:', error)
      throw new Error('Failed to submit feedback')
    }
  }
}

// Export singleton instance
export const predictionCacheService = new PredictionCacheService()
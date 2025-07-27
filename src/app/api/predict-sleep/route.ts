import { NextRequest, NextResponse } from 'next/server'
import { predictNextSleep } from '@/lib/orchestrator'
import { predictionCache } from '@/lib/cache'
import { predictionCacheService } from '@/lib/prediction-cache'

export async function POST(request: NextRequest) {
  try {
    const { childId, childAge, childGender, sleepHistory, childName } = await request.json()


    // Check database cache for LLM predictions only (3+ sessions)
    const shouldCheckLLMCache = sleepHistory?.length >= 3 && childId
    
    if (shouldCheckLLMCache) {
      try {
        // Check database cache for existing LLM predictions only
        const cacheResult = await predictionCacheService.getPredictionFromCache(
          childId, 
          sleepHistory, 
          childAge
        )
        
        // Only return cached prediction if it's from an LLM (not general)
        if (cacheResult.prediction && cacheResult.prediction.llm_provider !== 'general') {
          
          // Convert database prediction to API format
          const apiPrediction = {
            nextBedtime: cacheResult.prediction.next_bedtime,
            timeUntilBedtime: cacheResult.prediction.time_until_bedtime,
            expectedDuration: cacheResult.prediction.expected_duration,
            confidence: cacheResult.prediction.confidence,
            summary: cacheResult.prediction.summary,
            reasoning: cacheResult.prediction.reasoning,
            provider: cacheResult.prediction.llm_provider,
            model: cacheResult.prediction.model_used,
            fromCache: true,
            cacheData: {
              usedCount: cacheResult.prediction.used_count,
              lastServed: cacheResult.prediction.last_served_at
            }
          }
          
          return NextResponse.json(apiPrediction)
        }
      } catch (cacheError) {
        console.warn('Database cache error, falling back to generation:', cacheError)
      }
    } else {
      // Fallback to in-memory cache for backwards compatibility or non-LLM predictions
      const cacheKey = predictionCache.generateKey(childAge, sleepHistory, childGender || 'unknown', childName || 'Baby')
      const cachedPrediction = predictionCache.get(cacheKey)
      if (cachedPrediction) {
        return NextResponse.json({ ...cachedPrediction, fromCache: true })
      }
    }

    // Use orchestrator to handle LLM provider selection and prediction
    const startTime = Date.now()
    const prediction = await predictNextSleep(childAge, sleepHistory, childGender || 'unknown', childName || 'Baby')
    const generationTime = Date.now() - startTime
    
    // Save ALL predictions to database (both LLM and general recommendations)
    if (childId) {
      try {
        
        // Always get or create sleep context (works for both LLM and general predictions)
        const cacheResult = await predictionCacheService.getPredictionFromCache(
          childId, 
          sleepHistory, 
          childAge
        )
        
        // Save prediction to database (both LLM and general recommendations)
        const savedPrediction = await predictionCacheService.savePrediction(
          childId,
          cacheResult.sleepContext.id,
          {
            nextBedtime: prediction.nextBedtime,
            timeUntilBedtime: prediction.timeUntilBedtime,
            expectedDuration: prediction.expectedDuration,
            confidence: prediction.confidence,
            summary: prediction.summary,
            reasoning: prediction.reasoning
          },
          {
            llm_provider: prediction.provider || 'general',
            model_used: prediction.model || undefined,
            generation_time_ms: generationTime
          }
        )
        
        // Track the usage immediately
        await predictionCacheService.trackPredictionUsage(
          savedPrediction.id,
          childId,
          { was_from_cache: false }
        )
        
      } catch (saveError) {
        console.warn('Failed to save to database cache:', saveError)
        // Continue without database caching
      }
    } else {
      // Fallback to in-memory cache
      const cacheKey = predictionCache.generateKey(childAge, sleepHistory, childGender || 'unknown', childName || 'Baby')
      predictionCache.set(cacheKey, prediction)
    }
    
    // Add metadata for client-side saving
    prediction.generationTime = generationTime
    prediction.sessionCount = sleepHistory?.length || 0
    prediction.childAge = childAge
    
    return NextResponse.json(prediction)
  } catch (error) {
    console.error('Error in API route:', error)
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json({ 
      error: 'Failed to generate sleep prediction',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
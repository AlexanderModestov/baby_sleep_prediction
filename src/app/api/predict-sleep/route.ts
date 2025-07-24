import { NextRequest, NextResponse } from 'next/server'
import { predictNextSleep } from '@/lib/orchestrator'
import { predictionCache } from '@/lib/cache'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { childAge, childGender, sleepHistory, childName, childId } = await request.json()

    console.log('=== API ROUTE CALLED ===')
    console.log(`Child Age: ${childAge}`)
    console.log(`Child Gender: ${childGender}`)
    console.log(`Sleep History Length: ${sleepHistory?.length || 0}`)

    // Only cache LLM predictions (3+ sessions), not general recommendations
    const shouldCache = sleepHistory?.length >= 3
    let cacheKey = ''
    
    if (shouldCache) {
      cacheKey = predictionCache.generateKey(childAge, sleepHistory, childGender || 'unknown', childName || 'Baby')
      
      // Check cache first for LLM predictions only
      const cachedPrediction = predictionCache.get(cacheKey)
      if (cachedPrediction) {
        console.log('=== RETURNING CACHED LLM PREDICTION ===')
        return NextResponse.json(cachedPrediction)
      }
    }

    console.log('=== CALLING ORCHESTRATOR ===')

    // Use orchestrator to handle LLM provider selection and prediction
    const startTime = Date.now()
    const prediction = await predictNextSleep(childAge, sleepHistory, childGender || 'unknown', childName || 'Baby')
    const generationTime = Date.now() - startTime
    
    // Cache only LLM predictions (not general recommendations)
    if (shouldCache) {
      predictionCache.set(cacheKey, prediction)
    }
    
    // Save prediction to database if childId is provided
    if (childId && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        )
        
        // Generate hash of input sessions for deduplication
        const inputHash = crypto
          .createHash('sha256')
          .update(JSON.stringify(sleepHistory))
          .digest('hex')
        
        await supabase
          .from('predictions')
          .insert([{
            child_id: childId,
            next_bedtime: prediction.nextBedtime,
            time_until_bedtime: prediction.timeUntilBedtime,
            expected_duration: prediction.expectedDuration,
            confidence: prediction.confidence,
            summary: prediction.summary,
            reasoning: prediction.reasoning,
            llm_provider: prediction.provider || 'general',
            model_used: prediction.model || null,
            session_count: sleepHistory?.length || 0,
            generation_time_ms: generationTime,
            child_age_months: childAge,
            input_sessions_hash: inputHash
          }])
        
        console.log('=== PREDICTION SAVED TO DATABASE ===')
      } catch (dbError) {
        console.error('Failed to save prediction to database:', dbError)
        // Don't fail the request if database save fails
      }
    }
    
    console.log('=== API ROUTE PREDICTION SUCCESS ===')
    console.log(JSON.stringify(prediction, null, 2))
    
    return NextResponse.json(prediction)
  } catch (error) {
    console.error('=== API ROUTE ERROR ===')
    console.error('Error in API route:', error)
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    console.log('=== ERROR IN PREDICTION ===')
    return NextResponse.json({ 
      error: 'Failed to generate sleep prediction',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
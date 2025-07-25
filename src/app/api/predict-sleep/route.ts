import { NextRequest, NextResponse } from 'next/server'
import { predictNextSleep } from '@/lib/orchestrator'
import { predictionCache } from '@/lib/cache'

export async function POST(request: NextRequest) {
  try {
    const { childAge, childGender, sleepHistory, childName } = await request.json()

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
    
    // Add metadata for client-side saving
    prediction.generationTime = generationTime
    prediction.sessionCount = sleepHistory?.length || 0
    prediction.childAge = childAge
    
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
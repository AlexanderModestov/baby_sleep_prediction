import { NextRequest, NextResponse } from 'next/server'
import { predictNextSleep } from '@/lib/orchestrator'

export async function POST(request: NextRequest) {
  try {
    const { childAge, childGender, sleepHistory, childName } = await request.json()

    console.log('=== API ROUTE CALLED ===')
    console.log(`Child Age: ${childAge}`)
    console.log(`Child Gender: ${childGender}`)
    console.log(`Sleep History Length: ${sleepHistory?.length || 0}`)
    console.log('=== CALLING ORCHESTRATOR ===')

    // Use orchestrator to handle LLM provider selection and prediction
    const prediction = await predictNextSleep(childAge, sleepHistory, childGender || 'unknown', childName || 'Baby')
    
    console.log('=== API ROUTE PREDICTION SUCCESS ===')
    console.log(JSON.stringify(prediction, null, 2))
    
    return NextResponse.json(prediction)
  } catch (error) {
    console.error('=== API ROUTE ERROR ===')
    console.error('Error in API route:', error)
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    // Return fallback prediction
    const fallback = {
      nextBedtime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      timeUntilBedtime: '2 hours 0 minutes',
      expectedDuration: '2 hours 0 minutes',
      confidence: 0.5,
      summary: 'Baby should be ready for sleep in about 2 hours based on typical patterns.',
      reasoning: 'Using default prediction due to API service unavailability'
    }
    
    console.log('=== RETURNING FALLBACK ===')
    return NextResponse.json(fallback)
  }
}
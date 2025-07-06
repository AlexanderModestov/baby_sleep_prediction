import { NextRequest, NextResponse } from 'next/server'
import { predictNextSleep } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  try {
    const { childAge, sleepHistory } = await request.json()

    if (!childAge || !Array.isArray(sleepHistory)) {
      return NextResponse.json(
        { error: 'Missing required fields: childAge and sleepHistory' },
        { status: 400 }
      )
    }

    const prediction = await predictNextSleep(childAge, sleepHistory)
    
    return NextResponse.json(prediction)
  } catch (error) {
    console.error('Prediction API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate prediction' },
      { status: 500 }
    )
  }
}
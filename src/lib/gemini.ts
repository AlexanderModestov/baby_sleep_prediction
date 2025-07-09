import { SleepSession } from './supabase'
import type { SleepPrediction } from './llm-providers'

export type { SleepPrediction }

export async function predictNextSleep(
  childAge: number,
  sleepHistory: SleepSession[]
): Promise<SleepPrediction> {
  try {
    const response = await fetch('/api/predict-sleep', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        childAge,
        sleepHistory
      })
    })

    if (!response.ok) {
      throw new Error('Failed to get prediction from API')
    }

    const prediction = await response.json()
    return prediction
  } catch (error) {
    console.error('Error predicting sleep:', error)
    // Return fallback prediction
    return {
      nextBedtime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      timeUntilBedtime: '2 hours 0 minutes',
      expectedDuration: '2 hours 0 minutes',
      confidence: 0.5,
      summary: 'Baby should be ready for sleep in about 2 hours based on typical patterns.',
      reasoning: 'Using default prediction due to AI service unavailability'
    }
  }
}
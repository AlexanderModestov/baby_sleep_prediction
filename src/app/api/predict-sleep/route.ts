import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { SleepSession } from '@/lib/supabase'

const apiKey = process.env.GOOGLE_API_KEY
const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash'

if (!apiKey) {
  console.error('GOOGLE_API_KEY environment variable is not set')
}

const genAI = new GoogleGenerativeAI(apiKey!)

// Age-appropriate wake windows and sleep recommendations
function getAgeBasedRecommendations(ageInMonths: number) {
  if (ageInMonths <= 3) {
    return { wakeWindow: 45, sleepDuration: 120, description: 'newborn (0-3 months)' }
  } else if (ageInMonths <= 6) {
    return { wakeWindow: 90, sleepDuration: 90, description: 'infant (3-6 months)' }
  } else if (ageInMonths <= 12) {
    return { wakeWindow: 120, sleepDuration: 90, description: 'older infant (6-12 months)' }
  } else if (ageInMonths <= 24) {
    return { wakeWindow: 180, sleepDuration: 120, description: 'toddler (12-24 months)' }
  } else {
    return { wakeWindow: 240, sleepDuration: 90, description: 'young child (2+ years)' }
  }
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours === 0) {
    return `${mins} minutes`
  } else if (mins === 0) {
    return `${hours} hours`
  } else {
    return `${hours} hours ${mins} minutes`
  }
}

function getGeneralRecommendation(childAge: number, sleepHistory: SleepSession[]) {
  const recommendations = getAgeBasedRecommendations(childAge)
  const now = new Date()
  
  // Calculate time since last sleep
  let timeSinceLastSleep = 0
  let lastSleepEnd = null
  
  if (sleepHistory.length > 0) {
    const lastSession = sleepHistory[0]
    if (lastSession.end_time) {
      lastSleepEnd = new Date(lastSession.end_time)
      timeSinceLastSleep = Math.floor((now.getTime() - lastSleepEnd.getTime()) / (1000 * 60))
    }
  }
  
  // Calculate recommended next bedtime
  const timeUntilBedtime = Math.max(0, recommendations.wakeWindow - timeSinceLastSleep)
  const nextBedtime = new Date(now.getTime() + timeUntilBedtime * 60 * 1000)
  
  const recommendation = {
    nextBedtime: nextBedtime.toISOString(),
    timeUntilBedtime: formatTime(timeUntilBedtime),
    expectedDuration: formatTime(recommendations.sleepDuration),
    confidence: 0.7,
    summary: `Based on general guidelines for ${recommendations.description}, your baby should be ready for sleep ${timeUntilBedtime > 0 ? `in ${formatTime(timeUntilBedtime)}` : 'now'}.`,
    reasoning: `This is a general recommendation based on typical sleep patterns for ${recommendations.description}. ${recommendations.description.charAt(0).toUpperCase() + recommendations.description.slice(1)} typically need ${formatTime(recommendations.wakeWindow)} wake windows between sleeps and sleep for about ${formatTime(recommendations.sleepDuration)}. ${sleepHistory.length === 0 ? 'Start tracking more sleep sessions to get personalized AI predictions based on your baby\'s unique patterns.' : `We need at least 3 sleep sessions to provide personalized predictions. You currently have ${sleepHistory.length} session${sleepHistory.length === 1 ? '' : 's'} recorded.`}`
  }
  
  return NextResponse.json(recommendation)
}

export async function POST(request: NextRequest) {
  try {
    const { childAge, sleepHistory } = await request.json()

    // Check if there's insufficient sleep history for personalized predictions
    if (sleepHistory.length < 3) {
      return getGeneralRecommendation(childAge, sleepHistory)
    }

    // Check if API key is available
    if (!apiKey) {
      throw new Error('Google API key is not configured')
    }

    const model = genAI.getGenerativeModel({ model: modelName })

    const prompt = `
You are a pediatric sleep expert. Based on the following sleep data for a ${childAge}-month-old baby, predict their next optimal sleep time.

Sleep History (last 7 days):
${sleepHistory.map((session: SleepSession) => `
- Start: ${session.start_time}
- End: ${session.end_time || 'Still sleeping'}
- Duration: ${session.duration_minutes ? Math.round(session.duration_minutes / 60 * 100) / 100 : 'N/A'} hours
- Quality: ${session.quality || 'Not rated'}
- Type: ${session.session_type}
`).join('\n')}

Please provide a prediction in the following JSON format:
{
  "nextBedtime": "ISO timestamp",
  "timeUntilBedtime": "human readable time in format 'X hours Y minutes' (e.g., '2 hours 30 minutes', '1 hour 15 minutes', or '45 minutes')",
  "expectedDuration": "expected sleep duration in format 'X hours Y minutes' (e.g., '2 hours', '1 hour 30 minutes')",
  "confidence": 0.85,
  "summary": "2-3 sentence clear and concise recommendation for parents",
  "reasoning": "Detailed explanation of the prediction including analysis of sleep patterns, age considerations, and specific recommendations"
}

Consider:
- Age-appropriate sleep patterns
- Recent sleep history
- Time of day
- Sleep quality trends
- Typical wake windows for this age

For the summary field: Provide a brief, parent-friendly recommendation in 2-3 sentences.
For the reasoning field: Provide a comprehensive analysis including sleep pattern trends, age-appropriate considerations, and detailed recommendations.
`

    // Add retry logic for rate limiting
    let result
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount < maxRetries) {
      try {
        result = await model.generateContent(prompt)
        break // Success, exit retry loop
      } catch (error: unknown) {
        const isRateLimitError = error && typeof error === 'object' && 'status' in error && error.status === 429
        if (isRateLimitError && retryCount < maxRetries - 1) {
          // Rate limited, wait and retry
          const waitTime = Math.pow(2, retryCount) * 1000 // Exponential backoff: 1s, 2s, 4s
          console.log(`Rate limited, retrying in ${waitTime}ms...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
          retryCount++
        } else {
          throw error // Re-throw if not rate limit or max retries reached
        }
      }
    }
    
    if (!result) {
      throw new Error('Failed to generate content after retries')
    }
    
    const response = await result.response
    const text = response.text()

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const prediction = JSON.parse(jsonMatch[0])
      return NextResponse.json(prediction)
    }

    throw new Error('Could not parse prediction from AI response')
  } catch (error) {
    console.error('Error predicting sleep:', error)
    
    // Return fallback prediction
    const fallback = {
      nextBedtime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      timeUntilBedtime: '2 hours 0 minutes',
      expectedDuration: '2 hours 0 minutes',
      confidence: 0.5,
      summary: 'Baby should be ready for sleep in about 2 hours based on typical patterns.',
      reasoning: 'Using default prediction due to AI service unavailability'
    }
    
    return NextResponse.json(fallback)
  }
}
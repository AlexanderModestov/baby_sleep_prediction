import { NextRequest, NextResponse } from 'next/server'
import { SleepSession } from '@/lib/supabase'
import { createLLMProvider, createPrompt, getLLMConfig } from '@/lib/llm-providers'

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

    // Get LLM configuration and create provider
    const llmConfig = getLLMConfig()
    const provider = createLLMProvider(llmConfig)
    
    // Create prompt using the template
    const prompt = createPrompt(childAge, sleepHistory)
    
    // Generate prediction using the selected provider
    const prediction = await provider.generateSleepPrediction(prompt)
    
    return NextResponse.json(prediction)
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
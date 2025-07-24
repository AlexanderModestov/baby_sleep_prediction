import { SleepSession } from './supabase'
import { getLLMConfig } from './llm-providers/config'
import { ClaudeProvider } from './llm-providers/claude-provider'
import { GeminiProvider } from './llm-providers/gemini-provider'
import { OpenAIProvider } from './llm-providers/openai-provider'
import type { SleepPrediction, LLMProvider } from './llm-providers/types'

// Load environment variables (server-side only)
if (typeof window === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config()
}

export type { SleepPrediction }

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

function getGeneralRecommendation(childAge: number, sleepHistory: SleepSession[]): SleepPrediction {
  const recommendations = getAgeBasedRecommendations(childAge)
  const nowUTC = new Date() // This is already UTC since new Date() returns UTC internally
  
  // Calculate time since last sleep
  let timeSinceLastSleep = 0
  let lastSleepEnd = null
  
  if (sleepHistory.length > 0) {
    const lastSession = sleepHistory[0]
    if (lastSession.end_time) {
      lastSleepEnd = new Date(lastSession.end_time) // Database stores UTC
      timeSinceLastSleep = Math.floor((nowUTC.getTime() - lastSleepEnd.getTime()) / (1000 * 60))
    }
  }
  
  // Calculate recommended next bedtime
  const timeUntilBedtime = Math.max(0, recommendations.wakeWindow - timeSinceLastSleep)
  const nextBedtime = new Date(nowUTC.getTime() + timeUntilBedtime * 60 * 1000)
  
  return {
    nextBedtime: nextBedtime.toISOString(),
    timeUntilBedtime: formatTime(timeUntilBedtime),
    expectedDuration: formatTime(recommendations.sleepDuration),
    confidence: 0.7,
    summary: `Based on general guidelines for ${recommendations.description}, your baby should be ready for sleep ${timeUntilBedtime > 0 ? `in ${formatTime(timeUntilBedtime)}` : 'now'}.`,
    reasoning: `This is a general recommendation based on typical sleep patterns for ${recommendations.description}. ${recommendations.description.charAt(0).toUpperCase() + recommendations.description.slice(1)} typically need ${formatTime(recommendations.wakeWindow)} wake windows between sleeps and sleep for about ${formatTime(recommendations.sleepDuration)}. ${sleepHistory.length === 0 ? 'Start tracking more sleep sessions to get personalized AI predictions based on your baby\'s unique patterns.' : `We need at least 3 sleep sessions to provide personalized predictions. You currently have ${sleepHistory.length} session${sleepHistory.length === 1 ? '' : 's'} recorded.`}`,
    provider: 'general',
    model: null
  }
}

function createProvider(config: { provider: string; apiKey: string; model: string }): LLMProvider {
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config.apiKey, config.model)
    case 'gemini':
      return new GeminiProvider(config.apiKey, config.model)
    case 'claude':
      return new ClaudeProvider(config.apiKey, config.model)
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`)
  }
}

function createPrompt(childAge: number, sleepHistory: SleepSession[], childGender: string, childName: string): string {
  const formatSession = (session: SleepSession) => {
    const start = new Date(session.start_time)
    const end = session.end_time ? new Date(session.end_time) : null
    const duration = end ? Math.floor((end.getTime() - start.getTime()) / (1000 * 60)) : null
    
    return `Start: ${start.toISOString()}, End: ${end?.toISOString() || 'ongoing'}, Duration: ${duration ? `${duration} minutes` : 'ongoing'}`
  }

  const formattedEntries = sleepHistory.map(formatSession).join('\n')
  const currentDate = new Date().toISOString() // UTC time for LLM context
  const babyProfile = { name: childName, gender: childGender }
  const babyAge = `${childAge} months`
  
  return `You are an AI assistant helping parents predict their baby's next sleep time.
The parents are tracking sleep for their baby:
- Name: ${babyProfile.name}
- Age: ${babyAge}
- Gender: ${babyProfile.gender}

The following are recent sleep records for this baby. Each record includes a start time, an end time, and the duration of sleep.
Times are in YYYY-MM-DDTHH:MM ISO format.

Current date and time for context: ${currentDate}

Sleep Records:
${formattedEntries}

Based on this specific baby's profile and their sleep patterns, and considering typical infant sleep physiology for a baby of this age and gender:
1. Predict the baby's next likely bedtime.
2. Calculate the time from the "Current date and time for context" until this predicted bedtime.

Please provide your response as a JSON object with the following exact structure:
{
  "predictedBedtime": "HH:MM AM/PM",
  "timeUntilBedtime": "X hours Y minutes"
}

Example of a valid response:
{
  "predictedBedtime": "8:45 PM",
  "timeUntilBedtime": "2 hours 15 minutes"
}

If there is insufficient data to make a confident prediction (e.g., very few entries or highly erratic patterns), please return a JSON object with an error field:
{
  "error": "Insufficient data to predict next sleep for ${babyProfile.name}."
}
Be precise in your calculations.`
}

export async function predictNextSleep(
  childAge: number,
  sleepHistory: SleepSession[],
  childGender: string = 'unknown',
  childName: string = 'Baby'
): Promise<SleepPrediction> {
  try {
    console.log('=== ORCHESTRATOR SLEEP PREDICTION ===')
    console.log(`Child Age: ${childAge} months`)
    console.log(`Child Gender: ${childGender}`)
    console.log(`Sleep History Count: ${sleepHistory.length}`)
    console.log('=== END ORCHESTRATOR INFO ===')

    // Check if there's insufficient sleep history for personalized predictions
    if (sleepHistory.length < 3) {
      console.log('Using general recommendation - insufficient sleep history')
      return getGeneralRecommendation(childAge, sleepHistory)
    }

    // Get LLM configuration from environment variables
    const llmConfig = getLLMConfig()
    console.log(`Using LLM Provider: ${llmConfig.provider} with model: ${llmConfig.model}`)
    console.log(`API Key present: ${!!llmConfig.apiKey}`)
    console.log(`API Key length: ${llmConfig.apiKey?.length || 0}`)
    
    // Create provider based on config
    const provider = createProvider(llmConfig)
    
    // Create prompt using the template
    const prompt = createPrompt(childAge, sleepHistory, childGender, childName)
    
    console.log('=== FINAL PROMPT ===')
    console.log(prompt)
    console.log('=== END FINAL PROMPT ===')
    
    // Generate prediction using the selected provider
    const prediction = await provider.generateSleepPrediction(prompt)
    
    // Add provider and model info to the prediction
    const enhancedPrediction = {
      ...prediction,
      provider: llmConfig.provider,
      model: llmConfig.model
    }
    
    console.log('=== PREDICTION RESULT ===')
    console.log(JSON.stringify(enhancedPrediction, null, 2))
    console.log('=== END PREDICTION RESULT ===')
    
    return enhancedPrediction
  } catch (error) {
    console.error('Error predicting sleep:', error)
    
    // Check if the error is from insufficient data, use general recommendations
    if (error instanceof Error && error.message.includes('Insufficient data')) {
      console.log('Using general recommendation due to insufficient data')
      return getGeneralRecommendation(childAge, sleepHistory)
    }
    
    // Re-throw other errors to be handled by caller
    throw error
  }
}
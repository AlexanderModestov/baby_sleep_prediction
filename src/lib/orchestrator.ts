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
  const now = new Date() // Current time in local timezone
  
  // Calculate time since last sleep
  let timeSinceLastSleep = 0
  let lastSleepEnd = null
  
  if (sleepHistory.length > 0) {
    const lastSession = sleepHistory[0]
    if (lastSession.end_time) {
      lastSleepEnd = new Date(lastSession.end_time) // Database stores UTC
      timeSinceLastSleep = Math.floor((now.getTime() - lastSleepEnd.getTime()) / (1000 * 60))
    }
  }
  
  // Calculate recommended next bedtime
  const timeUntilBedtime = Math.max(0, recommendations.wakeWindow - timeSinceLastSleep)
  const nextBedtime = new Date(now.getTime() + timeUntilBedtime * 60 * 1000)
  
  return {
    nextBedtime: nextBedtime.toISOString(),
    timeUntilBedtime: formatTime(timeUntilBedtime),
    expectedDuration: formatTime(recommendations.sleepDuration),
    confidence: 0.7,
    summary: `Based on general guidelines for ${recommendations.description}, your baby should be ready for sleep ${timeUntilBedtime > 0 ? `in ${formatTime(timeUntilBedtime)}` : 'now'}.`,
    reasoning: `This is a general recommendation based on typical sleep patterns for ${recommendations.description}. ${recommendations.description.charAt(0).toUpperCase() + recommendations.description.slice(1)} typically need ${formatTime(recommendations.wakeWindow)} wake windows between sleeps and sleep for about ${formatTime(recommendations.sleepDuration)}. ${sleepHistory.length === 0 ? 'Start tracking more sleep sessions to get personalized AI predictions based on your baby\'s unique patterns.' : `We need at least 3 sleep sessions to provide personalized predictions. You currently have ${sleepHistory.length} session${sleepHistory.length === 1 ? '' : 's'} recorded.`}`,
    provider: 'general',
    model: undefined
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getGeneralRecommendationWithGapMessage(childAge: number, sleepHistory: SleepSession[], _hoursSinceLastWake: number): SleepPrediction {
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
  
  return {
    nextBedtime: nextBedtime.toISOString(),
    timeUntilBedtime: formatTime(timeUntilBedtime),
    expectedDuration: formatTime(recommendations.sleepDuration),
    confidence: 0.6, // Lower confidence due to missing data
    summary: `⚠️ Missing sleep records detected! Please add any missed sleep sessions for better predictions.`,
    reasoning: `Missing sleep data - using general recommendations for ${recommendations.description}.`,
    provider: 'general',
    model: undefined
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
    
    // Format times in local timezone for LLM
    const formatLocalTime = (date: Date) => {
      return date.toLocaleString('en-CA', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }).replace(', ', 'T')
    }
    
    return `Start: ${formatLocalTime(start)}, End: ${end ? formatLocalTime(end) : 'ongoing'}, Duration: ${duration ? `${duration} minutes` : 'ongoing'}`
  }

  const formattedEntries = sleepHistory.map(formatSession).join('\n')
  // Use local time for current context
  const currentDate = new Date().toLocaleString('en-CA', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  }).replace(', ', 'T')
  const babyProfile = { name: childName, gender: childGender }
  const babyAge = `${childAge} months`
  
  return `You are an AI assistant helping parents predict their baby's next sleep time.
The parents are tracking sleep for their baby:
- Name: ${babyProfile.name}
- Age: ${babyAge}
- Gender: ${babyProfile.gender}

The following are recent sleep records for this baby. Each record includes a start time, an end time, and the duration of sleep.
Times are in YYYY-MM-DDTHH:MM format.

Date and time for context: ${currentDate}

Sleep Records:
${formattedEntries}

Based on this specific baby's profile and their sleep patterns, and considering typical infant sleep physiology for a baby of this age and gender:
predict the baby's next likely bedtime.

First, analyze if this sleep history looks realistic and complete for a baby of this age:
- Are sleep durations reasonable for the age group?
- Are wake windows appropriate?
- Are there obvious gaps or missing sessions?
- Do sleep patterns make biological sense?

Please provide your response as a JSON object with the following exact structure:
{
  "isHistoryRealistic": true/false,
  "nextBedtime": "YYYY-MM-DDTHH:MM",
  "expectedDuration": "X hours Y minutes",
  "reasoning": "Brief 2-3 sentence explanation"
}

If isHistoryRealistic is true, provide a normal prediction based on the sleep patterns.
If isHistoryRealistic is false, just set the flag to false - the system will use default recommendations.

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

    // Check if there's insufficient sleep history for personalized predictions
    if (sleepHistory.length < 3) {
      return getGeneralRecommendation(childAge, sleepHistory)
    }

    // Check if user hasn't recorded sleep for 5+ hours since last wake up
    // Find the most recent completed session (not just sleepHistory[0])
    const completedSessions = sleepHistory.filter(s => s.end_time)
    const lastSession = completedSessions.length > 0 
      ? completedSessions.reduce((latest, current) => 
          new Date(current.end_time!).getTime() > new Date(latest.end_time!).getTime() 
            ? current 
            : latest
        )
      : null
    
    if (lastSession && lastSession.end_time) {
      const lastWakeTime = new Date(lastSession.end_time)
      const now = new Date()
      const hoursSinceLastWake = (now.getTime() - lastWakeTime.getTime()) / (1000 * 60 * 60)
      
      if (hoursSinceLastWake >= 5) {
        return getGeneralRecommendationWithGapMessage(childAge, sleepHistory, hoursSinceLastWake)
      }
    }

    // Get LLM configuration from environment variables
    const llmConfig = getLLMConfig()
    
    // Create provider based on config
    const provider = createProvider(llmConfig)
    
    // Create prompt using the template
    const prompt = createPrompt(childAge, sleepHistory, childGender, childName)
    
    console.log('=== LLM PROMPT ===')
    console.log(prompt)
    console.log('=== END LLM PROMPT ===')
    
    // Generate prediction using the selected provider
    const prediction = await provider.generateSleepPrediction(prompt)
    
    console.log('=== LLM RESPONSE ===')
    console.log(JSON.stringify(prediction, null, 2))
    console.log('=== END LLM RESPONSE ===')
    
    // Add provider and model info to the prediction
    const enhancedPrediction = {
      ...prediction,
      provider: llmConfig.provider,
      model: llmConfig.model
    }
    
    return enhancedPrediction
  } catch (error) {
    console.error('Error predicting sleep:', error)
    
    // Check if the error is from insufficient data, use general recommendations
    if (error instanceof Error && error.message.includes('Insufficient data')) {
      return getGeneralRecommendation(childAge, sleepHistory)
    }
    
    // Check if LLM flagged history as unrealistic
    if (error instanceof Error && error.message === 'UNREALISTIC_HISTORY') {
      const generalRec = getGeneralRecommendation(childAge, sleepHistory)
      return {
        ...generalRec,
        summary: `⚠️ Sleep history appears incomplete or unrealistic. Please ensure all sleep sessions are accurately recorded for better predictions.`,
        reasoning: `The recorded sleep history doesn't follow typical patterns for this age group. This may be due to missing sessions, incorrect times, or unusual circumstances. For accurate AI predictions, please review and update your sleep tracking data.`
      }
    }
    
    // Re-throw other errors to be handled by caller
    throw error
  }
}
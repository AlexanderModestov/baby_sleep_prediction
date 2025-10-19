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
  const babyProfile = { name: childName, gender: childGender }
  const babyAge = `${childAge} months`
  
  return `You are an AI assistant helping parents predict their baby's next sleep time.

The parents are tracking sleep for their baby:

- Name: ${babyProfile.name}
- Age: ${babyAge}
- Gender: ${babyProfile.gender}

The following are time when baby woke up. Time is in YYYY-MM-DDTHH:MM format:  (${sleepHistory.length} session${sleepHistory.length === 1 ? '' : 's'}):
${formattedEntries}

Based on this specific baby's profile and their sleep patterns, and considering typical infant sleep physiology for a baby of this age and gender: predict the baby's next likely bedtime or nap time.

Please provide your response as a JSON object with the following exact structure:

{ "nextBedtime": "YYYY-MM-DDTHH:MM",

"expectedDuration": "X hours Y minutes",

"reasoning": "Brief 1 sentence explanation without specific times only the general conclusions how we predict the next sleep time based on the sleep history" }

Be precise in your calculations`

}

export async function predictNextSleep(
  childAge: number,
  sleepHistory: SleepSession[],
  childGender: string = 'unknown',
  childName: string = 'Baby'
): Promise<SleepPrediction> {
  try {
    console.log('=== SLEEP RECORDS DEBUG ===')
    console.log('Total sleep records received:', sleepHistory.length)
    console.log('Child age:', childAge, 'months')
    console.log('Child name:', childName)
    console.log('Child gender:', childGender)
    console.log('Sleep history details:')
    sleepHistory.forEach((session, index) => {
      console.log(`  Record ${index + 1}:`, {
        start: session.start_time,
        end: session.end_time,
        duration: session.end_time ? 
          Math.floor((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / (1000 * 60)) + ' minutes' : 
          'ongoing'
      })
    })
    console.log('Will use LLM?', sleepHistory.length >= 1 ? 'YES' : 'NO (no sleep data)')
    console.log('=== END SLEEP RECORDS DEBUG ===')

    // Check if there's insufficient sleep history for personalized predictions
    if (sleepHistory.length < 1) {
      throw new Error('Insufficient data to predict next sleep. Need at least 1 sleep session.')
    }

    // Let LLM handle gap detection and missing sessions

    // Get LLM configuration from environment variables
    const llmConfig = getLLMConfig()
    
    console.log('=== ORCHESTRATOR LLM SETUP ===')
    console.log('LLM Config:', { provider: llmConfig.provider, model: llmConfig.model, hasApiKey: !!llmConfig.apiKey })
    console.log('=== END ORCHESTRATOR LLM SETUP ===')
    
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

    // Re-throw all errors to be handled by caller
    throw error
  }
}
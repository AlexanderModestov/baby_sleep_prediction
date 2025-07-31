import { GoogleGenerativeAI } from '@google/generative-ai'
import { LLMProvider, SleepPrediction } from './types'

export class GeminiProvider implements LLMProvider {
  private genAI: GoogleGenerativeAI
  private model: string

  constructor(apiKey: string, model: string) {
    console.log('=== GEMINI PROVIDER INIT ===')
    console.log('API key length:', apiKey.length)
    console.log('API key prefix:', apiKey.substring(0, 10) + '...')
    console.log('Model:', model)
    console.log('=== END GEMINI PROVIDER INIT ===')
    
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.model = model
  }

  async generateSleepPrediction(prompt: string): Promise<SleepPrediction> {
    console.log('=== GEMINI API CALL START ===')
    console.log('Model:', this.model)
    console.log('Prompt length:', prompt.length)
    console.log('=== END GEMINI API CALL START ===')
    
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model })

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
      console.log('=== RAW GEMINI RESPONSE ===')
      console.log(text)
      console.log('=== END RAW GEMINI RESPONSE ===')
      
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const prediction = JSON.parse(jsonMatch[0])
        // Check if LLM returned an error response
        if (prediction.error) {
          throw new Error(prediction.error)
        }
        
        // Check if LLM flagged history as unrealistic
        if (prediction.isHistoryRealistic === false) {
          throw new Error('UNREALISTIC_HISTORY')
        }
        
        // Calculate missing fields that UI expects
        const now = new Date()
        // Parse local timezone format from LLM (YYYY-MM-DDTHH:MM) and convert to Date
        const nextBedtime = new Date(prediction.nextBedtime)
        const timeDiff = nextBedtime.getTime() - now.getTime()
        const minutesUntil = Math.max(0, Math.round(timeDiff / (1000 * 60)))
        
        const formatTime = (minutes: number): string => {
          const hours = Math.floor(minutes / 60)
          const mins = minutes % 60
          if (hours === 0) return `${mins} minutes`
          if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`
          return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes`
        }
        
        // Add calculated fields and convert nextBedtime to ISO format
        return {
          ...prediction,
          nextBedtime: nextBedtime.toISOString(), // Convert to ISO for consistency
          timeUntilBedtime: formatTime(minutesUntil),
          summary: prediction.reasoning, // Use reasoning as summary
          confidence: 0.8 // Keep for database storage
        } as SleepPrediction
      }

      throw new Error('Could not parse JSON from Gemini response')
    } catch (error) {
      console.error('=== GEMINI API ERROR ===')
      console.error('Error type:', typeof error)
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
      console.error('Full error:', error)
      console.error('=== END GEMINI API ERROR ===')
      throw error
    }
  }
}
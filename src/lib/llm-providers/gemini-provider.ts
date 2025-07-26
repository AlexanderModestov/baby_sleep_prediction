import { GoogleGenerativeAI } from '@google/generative-ai'
import { LLMProvider, SleepPrediction } from './types'

export class GeminiProvider implements LLMProvider {
  private genAI: GoogleGenerativeAI
  private model: string

  constructor(apiKey: string, model: string) {
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.model = model
  }

  async generateSleepPrediction(prompt: string): Promise<SleepPrediction> {
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
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const prediction = JSON.parse(jsonMatch[0])
        // Check if LLM returned an error response
        if (prediction.error) {
          throw new Error(prediction.error)
        }
        
        // Calculate missing fields that UI expects
        const now = new Date()
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
        
        // Add calculated fields
        return {
          ...prediction,
          timeUntilBedtime: formatTime(minutesUntil),
          summary: prediction.reasoning, // Use reasoning as summary
          confidence: 0.8 // Keep for database storage
        } as SleepPrediction
      }

      throw new Error('Could not parse JSON from Gemini response')
    } catch (error) {
      console.error('Gemini API error:', error)
      throw error
    }
  }
}
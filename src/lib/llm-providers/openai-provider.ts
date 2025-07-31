import OpenAI from 'openai'
import { LLMProvider, SleepPrediction } from './types'

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI
  private model: string

  constructor(apiKey: string, model: string) {
    console.log('=== OPENAI PROVIDER INIT ===')
    console.log('API key length:', apiKey.length)
    console.log('API key prefix:', apiKey.substring(0, 10) + '...')
    console.log('Model:', model)
    console.log('=== END OPENAI PROVIDER INIT ===')
    
    this.client = new OpenAI({
      apiKey: apiKey
    })
    this.model = model
  }

  async generateSleepPrediction(prompt: string): Promise<SleepPrediction> {
    console.log('=== OPENAI API CALL START ===')
    console.log('Model:', this.model)
    console.log('Prompt length:', prompt.length)
    console.log('=== END OPENAI API CALL START ===')
    
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a pediatric sleep expert. Always respond with valid JSON format only, no additional text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No content received from OpenAI')
      }

      // Extract JSON from response
      console.log('=== RAW OPENAI RESPONSE ===')
      console.log(content)
      console.log('=== END RAW OPENAI RESPONSE ===')
      
      const jsonMatch = content.match(/\{[\s\S]*\}/)
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

      throw new Error('Could not parse JSON from OpenAI response')
    } catch (error) {
      console.error('=== OPENAI API ERROR ===')
      console.error('Error type:', typeof error)
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
      console.error('Full error:', error)
      console.error('=== END OPENAI API ERROR ===')
      throw error
    }
  }
}
import { LLMProvider, SleepPrediction } from './types'

export class ClaudeProvider implements LLMProvider {
  private apiKey: string
  private model: string

  constructor(apiKey: string, model: string) {
    console.log('=== CLAUDE PROVIDER INIT ===')
    console.log('API key length:', apiKey.length)
    console.log('API key prefix:', apiKey.substring(0, 10) + '...')
    console.log('Model:', model)
    console.log('=== END CLAUDE PROVIDER INIT ===')
    
    this.apiKey = apiKey
    this.model = model
  }

  async generateSleepPrediction(prompt: string): Promise<SleepPrediction> {
    console.log('=== CLAUDE API CALL START ===')
    console.log('Model:', this.model)
    console.log('Prompt length:', prompt.length)
    console.log('=== END CLAUDE API CALL START ===')
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1500,
          temperature: 0.7,
          messages: [
            {
              role: 'user',
              content: `You are a pediatric sleep expert. Always respond with valid JSON format only, no additional text.\n\n${prompt}`
            }
          ]
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Claude API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      
      if (!data.content || !data.content[0] || !data.content[0].text) {
        throw new Error('No content received from Claude')
      }

      const content = data.content[0].text

      // Extract JSON from response
      console.log('=== RAW CLAUDE RESPONSE ===')
      console.log(content)
      console.log('=== END RAW CLAUDE RESPONSE ===')
      
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

      throw new Error('Could not parse JSON from Claude response')
    } catch (error) {
      console.error('=== CLAUDE API ERROR ===')
      console.error('Error type:', typeof error)
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
      console.error('Full error:', error)
      console.error('=== END CLAUDE API ERROR ===')
      throw error
    }
  }
}
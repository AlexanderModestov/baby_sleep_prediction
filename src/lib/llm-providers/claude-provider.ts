import { LLMProvider, SleepPrediction } from './types'

export class ClaudeProvider implements LLMProvider {
  private apiKey: string
  private model: string

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey
    this.model = model
  }

  async generateSleepPrediction(prompt: string): Promise<SleepPrediction> {
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
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const prediction = JSON.parse(jsonMatch[0])
        // Check if LLM returned an error response
        if (prediction.error) {
          throw new Error(prediction.error)
        }
        return prediction as SleepPrediction
      }

      throw new Error('Could not parse JSON from Claude response')
    } catch (error) {
      console.error('Claude API error:', error)
      throw error
    }
  }
}
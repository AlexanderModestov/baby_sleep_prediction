import OpenAI from 'openai'
import { LLMProvider, SleepPrediction } from './types'

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI
  private model: string

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({
      apiKey: apiKey
    })
    this.model = model
  }

  async generateSleepPrediction(prompt: string): Promise<SleepPrediction> {
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
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const prediction = JSON.parse(jsonMatch[0])
        // Check if LLM returned an error response
        if (prediction.error) {
          throw new Error(prediction.error)
        }
        return prediction as SleepPrediction
      }

      throw new Error('Could not parse JSON from OpenAI response')
    } catch (error) {
      console.error('OpenAI API error:', error)
      throw error
    }
  }
}
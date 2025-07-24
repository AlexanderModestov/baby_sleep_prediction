export interface SleepPrediction {
  nextBedtime: string
  timeUntilBedtime: string
  expectedDuration: string
  confidence: number
  summary: string
  reasoning: string
  provider?: string
  model?: string
}

export interface LLMProvider {
  generateSleepPrediction(prompt: string): Promise<SleepPrediction>
}

export type LLMProviderType = 'openai' | 'gemini' | 'claude'

export interface LLMConfig {
  provider: LLMProviderType
  apiKey: string
  model: string
  customPrompt?: string
}
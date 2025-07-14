import { LLMProvider, LLMConfig } from './types'
import { OpenAIProvider } from './openai-provider'
import { GeminiProvider } from './gemini-provider'
import { ClaudeProvider } from './claude-provider'
import { getLLMConfig, getPromptTemplate } from './config'

interface SleepSession {
  start_time: string
  end_time?: string | null
  duration_minutes?: number | null
  quality?: string | null
  session_type: string
}

export function createLLMProvider(config?: LLMConfig): LLMProvider {
  const llmConfig = config || getLLMConfig()
  
  switch (llmConfig.provider) {
    case 'openai':
      return new OpenAIProvider(llmConfig.apiKey, llmConfig.model)
    case 'gemini':
      return new GeminiProvider(llmConfig.apiKey, llmConfig.model)
    case 'claude':
      return new ClaudeProvider(llmConfig.apiKey, llmConfig.model)
    default:
      throw new Error(`Unsupported LLM provider: ${llmConfig.provider}`)
  }
}

export function createPrompt(childAge: number, childGender: string, sleepHistory: SleepSession[]): string {
  const promptTemplate = getPromptTemplate()
  
  const sleepHistoryText = sleepHistory.map((session: SleepSession) => `
- Start: ${session.start_time}
- End: ${session.end_time || 'Still sleeping'}
- Duration: ${session.duration_minutes ? Math.round(session.duration_minutes / 60 * 100) / 100 : 'N/A'} hours
- Quality: ${session.quality || 'Not rated'}
- Type: ${session.session_type}
`).join('\n')
  
  return promptTemplate
    .replace('{childAge}', childAge.toString())
    .replace('{childGender}', childGender)
    .replace('{sleepHistory}', sleepHistoryText)
}
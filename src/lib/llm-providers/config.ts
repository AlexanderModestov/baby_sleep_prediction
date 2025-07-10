import { LLMConfig, LLMProviderType } from './types'

export function getLLMConfig(): LLMConfig {
  // Default to OpenAI, but allow override via environment variable
  const provider = (process.env.LLM_PROVIDER as LLMProviderType) || 'openai'
  
  let apiKey: string
  let model: string
  
  if (provider === 'openai') {
    apiKey = process.env.OPENAI_API_KEY || ''
    model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
  } else if (provider === 'gemini') {
    apiKey = process.env.GOOGLE_API_KEY || ''
    model = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
  } else if (provider === 'claude') {
    apiKey = process.env.CLAUDE_API_KEY || ''
    model = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022'
  } else {
    throw new Error(`Unsupported LLM provider: ${provider}`)
  }
  
  if (!apiKey) {
    throw new Error(`API key not found for provider: ${provider}`)
  }
  
  return {
    provider,
    apiKey,
    model,
    customPrompt: process.env.LLM_CUSTOM_PROMPT
  }
}

export function getPromptTemplate(): string {
  // Use custom prompt from environment variable if provided, otherwise use default
  return process.env.LLM_CUSTOM_PROMPT || `
You are a pediatric sleep expert. Based on the following sleep data for a {childAge}-month-old baby, predict their next optimal sleep time.

Sleep History (last 7 days):
{sleepHistory}

Please provide a prediction in the following JSON format:
{
  "nextBedtime": "ISO timestamp",
  "timeUntilBedtime": "human readable time in format 'X hours Y minutes' (e.g., '2 hours 30 minutes', '1 hour 15 minutes', or '45 minutes')",
  "expectedDuration": "expected sleep duration in format 'X hours Y minutes' (e.g., '2 hours', '1 hour 30 minutes')",
  "confidence": 0.85,
  "summary": "2-3 sentence clear and concise recommendation for parents",
  "reasoning": "Detailed explanation of the prediction including analysis of sleep patterns, age considerations, and specific recommendations"
}

Consider:
- Age-appropriate sleep patterns
- Recent sleep history
- Time of day
- Sleep quality trends
- Typical wake windows for this age

For the summary field: Provide a brief, parent-friendly recommendation in 2-3 sentences.
For the reasoning field: Provide a comprehensive analysis including sleep pattern trends, age-appropriate considerations, and detailed recommendations.
`
}
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const apiKey = process.env.GOOGLE_API_KEY

if (!apiKey) {
  console.error('GOOGLE_API_KEY environment variable is not set')
}

const genAI = new GoogleGenerativeAI(apiKey!)

export async function POST(request: NextRequest) {
  try {
    const { childAge, sleepHistory } = await request.json()

    // Check if API key is available
    if (!apiKey) {
      throw new Error('Google API key is not configured')
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `
You are a pediatric sleep expert. Based on the following sleep data for a ${childAge}-month-old baby, predict their next optimal sleep time.

Sleep History (last 7 days):
${sleepHistory.map((session: any) => `
- Start: ${session.start_time}
- End: ${session.end_time || 'Still sleeping'}
- Duration: ${session.duration_minutes ? Math.round(session.duration_minutes / 60 * 100) / 100 : 'N/A'} hours
- Quality: ${session.quality || 'Not rated'}
- Type: ${session.session_type}
`).join('\n')}

Please provide a prediction in the following JSON format:
{
  "nextBedtime": "ISO timestamp",
  "timeUntilBedtime": "human readable time like '2 hours 30 minutes'",
  "expectedDuration": "expected sleep duration like '2 hours'",
  "confidence": 0.85,
  "reasoning": "Brief explanation of the prediction"
}

Consider:
- Age-appropriate sleep patterns
- Recent sleep history
- Time of day
- Sleep quality trends
- Typical wake windows for this age
`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const prediction = JSON.parse(jsonMatch[0])
      return NextResponse.json(prediction)
    }

    throw new Error('Could not parse prediction from AI response')
  } catch (error) {
    console.error('Error predicting sleep:', error)
    
    // Return fallback prediction
    const fallback = {
      nextBedtime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      timeUntilBedtime: '2 hours',
      expectedDuration: '2 hours',
      confidence: 0.5,
      reasoning: 'Using default prediction due to AI service unavailability'
    }
    
    return NextResponse.json(fallback)
  }
}
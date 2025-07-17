import { useState, useEffect } from 'react'
import { SleepSession } from '@/lib/supabase'
import Button from './ui/Button'
import Card from './ui/Card'

interface SleepPrediction {
  nextBedtime: string
  timeUntilBedtime: string
  expectedDuration: string
  confidence: number
  summary: string
  reasoning: string
}

interface SleepPredictionProps {
  childAge: number
  recentSessions: SleepSession[]
  activeSession?: SleepSession
  refreshTrigger?: number
  childGender?: string
  childName?: string
}

export default function SleepPrediction({ 
  childAge, 
  recentSessions, 
  activeSession,
  refreshTrigger,
  childGender = 'unknown',
  childName = 'Baby'
}: SleepPredictionProps) {
  const [prediction, setPrediction] = useState<SleepPrediction | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [lastRequestId, setLastRequestId] = useState<string | null>(null)

  useEffect(() => {
    const loadPrediction = async () => {
      // Generate a unique request ID
      const requestId = `${childAge}-${childGender}-${childName}-${recentSessions.length}-${refreshTrigger}`
      
      console.log('SleepPrediction useEffect triggered:', {
        activeSession: !!activeSession,
        recentSessionsCount: recentSessions.length,
        refreshTrigger,
        childAge,
        requestId
      })
      
      if (activeSession || recentSessions.length === 0) {
        console.log('Skipping prediction: activeSession or no recent sessions')
        return
      }

      // Check if this is a duplicate request
      if (lastRequestId === requestId) {
        console.log('Skipping duplicate request:', requestId)
        return
      }

      console.log('Loading new prediction...')
      setLastRequestId(requestId)
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/predict-sleep', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            childAge,
            childGender,
            childName,
            sleepHistory: recentSessions
          })
        })
        
        if (!response.ok) {
          throw new Error('Failed to get prediction')
        }
        
        const result = await response.json()
        console.log('Prediction loaded successfully:', result)
        setPrediction(result)
      } catch (err) {
        setError('Prediction temporarily unavailable due to high demand. Please try again in a few minutes.')
        console.error('Prediction error:', err)
      } finally {
        setLoading(false)
      }
    }

    // Debounce the prediction requests to avoid rapid calls
    const timeoutId = setTimeout(loadPrediction, 1000)
    return () => clearTimeout(timeoutId)
  }, [childAge, recentSessions, activeSession, refreshTrigger, childGender, childName, lastRequestId])

  // Update current time every second for real-time "Time awake" display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])

  const getTimeSinceLastSleep = () => {
    if (recentSessions.length === 0) return null
    
    const lastSession = recentSessions[0]
    if (!lastSession.end_time) return null

    const endTime = new Date(lastSession.end_time)
    const diffMinutes = Math.floor((currentTime.getTime() - endTime.getTime()) / (1000 * 60))
    
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    
    if (hours === 0) return `${minutes}m ago`
    return `${hours}h ${minutes}m ago`
  }

  const timeSinceLastSleep = getTimeSinceLastSleep()

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            Sleep Info
          </h2>
          <div className="text-2xl">🔮</div>
        </div>

        {/* Time Since Last Sleep */}
        {timeSinceLastSleep && !activeSession && (
          <div className="p-3 bg-green-50 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-700">Time awake:</span>
              <span className="font-semibold text-green-800">
                {timeSinceLastSleep}
              </span>
            </div>
          </div>
        )}

        {/* Active Session Info */}
        {activeSession && (
          <div className="p-3 bg-blue-50 rounded-xl">
            <div className="text-center">
              <p className="text-blue-700 font-medium">
                Baby is currently sleeping
              </p>
              <p className="text-sm text-blue-600">
                Prediction will be available after wake up
              </p>
            </div>
          </div>
        )}

        {/* Prediction */}
        {!activeSession && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">
              Next Sleep Prediction
            </h3>
            
            {loading && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-300"></div>
                  <span className="text-gray-600">Analyzing sleep patterns...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 rounded-xl">
                <div className="text-center space-y-2">
                  <p className="text-red-700 font-medium">
                    Unable to generate prediction
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {prediction && !loading && (
              <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Next bedtime:</span>
                    <span className="font-semibold text-purple-800">
                      {new Date(prediction.nextBedtime).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Time until:</span>
                    <span className="font-semibold text-pink-800">
                      {prediction.timeUntilBedtime}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Expected duration:</span>
                    <span className="font-semibold text-blue-800">
                      {prediction.expectedDuration}
                    </span>
                  </div>
                  
                  {prediction.summary && (
                    <div className="pt-2 border-t border-purple-200">
                      <p className="text-sm text-purple-700 font-medium">
                        {prediction.summary}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-gray-500">Confidence:</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-pink-400 to-purple-400 transition-all duration-300"
                          style={{ width: `${(prediction.confidence * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">
                        {Math.round(prediction.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {recentSessions.length === 0 && (
              <div className="p-4 bg-gray-50 rounded-xl text-center">
                <p className="text-gray-600">
                  Start tracking sleep to get AI-powered predictions
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
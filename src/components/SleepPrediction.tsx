import { useState, useEffect, useMemo, useCallback } from 'react'
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
  const [predictionText, setPredictionText] = useState<PredictionText | null>(null)
  const [realTimeMetrics, setRealTimeMetrics] = useState<{nextBedtime: string, timeUntilBedtime: string, expectedDuration: string} | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, setCurrentTime] = useState(new Date())
  const [lastRequestId, setLastRequestId] = useState<string | null>(null)

  // Memoize request parameters to avoid unnecessary re-renders
  const requestParams = useMemo(() => ({
    childAge,
    childGender,
    childName,
    sleepHistory: recentSessions
  }), [childAge, childGender, childName, recentSessions])

  // Request ID for prediction text (only changes when sleep records change)
  const textRequestId = useMemo(() => {
    const lastSleepTime = recentSessions.length > 0 ? recentSessions[0].end_time : null
    const roundedLastSleep = lastSleepTime ? Math.floor(new Date(lastSleepTime).getTime() / (5 * 60 * 1000)) : 0
    return `${childAge}-${childGender}-${childName}-${recentSessions.length}-${roundedLastSleep}-${refreshTrigger}`
  }, [childAge, childGender, childName, recentSessions, refreshTrigger])

  const loadPrediction = useCallback(async () => {
    console.log('SleepPrediction useEffect triggered:', {
      activeSession: !!activeSession,
      recentSessionsCount: recentSessions.length,
      refreshTrigger,
      childAge,
      textRequestId
    })
    
    if (activeSession || recentSessions.length === 0) {
      console.log('Skipping prediction: activeSession or no recent sessions')
      return
    }

    // Check if this is a duplicate request
    if (lastRequestId === textRequestId) {
      console.log('Skipping duplicate request:', textRequestId)
      return
    }

    console.log('Loading new prediction...')
    setLastRequestId(textRequestId)
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/predict-sleep', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestParams)
      })
      
      if (!response.ok) {
        throw new Error('Failed to get prediction')
      }
      
      const result = await response.json()
      console.log('Prediction loaded successfully:', result)
      setPrediction(result)
      // Store prediction text separately
      setPredictionText({
        summary: result.summary,
        reasoning: result.reasoning,
        confidence: result.confidence,
        expectedDuration: result.expectedDuration
      })
    } catch (err) {
      setError('Prediction temporarily unavailable due to high demand. Please try again in a few minutes.')
      console.error('Prediction error:', err)
    } finally {
      setLoading(false)
    }
  }, [activeSession, recentSessions, textRequestId, lastRequestId, requestParams, childAge, refreshTrigger])

  useEffect(() => {
    // Debounce the prediction requests to avoid rapid calls
    const timeoutId = setTimeout(loadPrediction, 1000)
    return () => clearTimeout(timeoutId)
  }, [loadPrediction])

  // Calculate real-time metrics based on current time and last prediction
  const calculateRealTimeMetrics = useCallback(() => {
    if (recentSessions.length === 0) return null
    
    // Get age-based recommendations for real-time calculation
    const getAgeBasedRecommendations = (ageInMonths: number) => {
      if (ageInMonths <= 3) return { wakeWindow: 45, sleepDuration: 120 } // newborn
      if (ageInMonths <= 6) return { wakeWindow: 90, sleepDuration: 90 } // infant
      if (ageInMonths <= 12) return { wakeWindow: 120, sleepDuration: 90 } // older infant
      if (ageInMonths <= 24) return { wakeWindow: 180, sleepDuration: 120 } // toddler
      return { wakeWindow: 240, sleepDuration: 90 } // young child
    }
    
    const recommendations = getAgeBasedRecommendations(childAge)
    const { wakeWindow, sleepDuration } = recommendations
    const nowUTC = new Date()
    const lastSession = recentSessions[0]
    
    if (!lastSession.end_time) return null
    
    const lastSleepEnd = new Date(lastSession.end_time)
    const timeSinceLastSleep = Math.floor((nowUTC.getTime() - lastSleepEnd.getTime()) / (1000 * 60))
    const timeUntilBedtime = Math.max(0, wakeWindow - timeSinceLastSleep)
    const nextBedtime = new Date(nowUTC.getTime() + timeUntilBedtime * 60 * 1000)
    
    const formatTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      
      if (hours === 0) return `${mins} minutes`
      if (mins === 0) return `${hours} hours`
      return `${hours} hours ${mins} minutes`
    }
    
    return {
      nextBedtime: nextBedtime.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      timeUntilBedtime: formatTime(timeUntilBedtime),
      expectedDuration: formatTime(sleepDuration)
    }
  }, [recentSessions, childAge])
  
  // Update current time and real-time metrics every minute
  useEffect(() => {
    const updateMetrics = () => {
      setCurrentTime(new Date())
      const metrics = calculateRealTimeMetrics()
      setRealTimeMetrics(metrics)
    }
    
    // Update immediately
    updateMetrics()
    
    // Then update every minute
    const timer = setInterval(updateMetrics, 60000)
    
    return () => clearInterval(timer)
  }, [calculateRealTimeMetrics])

  const getTimeSinceLastSleep = useCallback(() => {
    if (recentSessions.length === 0) return null
    
    const lastSession = recentSessions[0]
    if (!lastSession.end_time) return null

    // Both times should be in UTC for accurate calculation
    const endTimeUTC = new Date(lastSession.end_time) // Database stores UTC
    const currentTimeUTC = new Date() // Current time in UTC
    const diffMinutes = Math.floor((currentTimeUTC.getTime() - endTimeUTC.getTime()) / (1000 * 60))
    
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    
    if (hours === 0) return `${minutes}m ago`
    return `${hours}h ${minutes}m ago`
  }, [recentSessions])

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

            {(prediction || realTimeMetrics) && !loading && (
              <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Next bedtime:</span>
                    <span className="font-semibold text-purple-800">
                      {realTimeMetrics?.nextBedtime || (prediction ? new Date(prediction.nextBedtime).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      }) : 'Calculating...')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Time until:</span>
                    <span className="font-semibold text-pink-800">
                      {realTimeMetrics?.timeUntilBedtime || prediction?.timeUntilBedtime || 'Calculating...'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Expected duration:</span>
                    <span className="font-semibold text-blue-800">
                      {realTimeMetrics?.expectedDuration || predictionText?.expectedDuration || prediction?.expectedDuration || 'Calculating...'}
                    </span>
                  </div>
                  
                  {(predictionText?.summary || prediction?.summary) && (
                    <div className="pt-2 border-t border-purple-200">
                      <p className="text-sm text-purple-700 font-medium">
                        {predictionText?.summary || prediction?.summary}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-gray-500">Confidence:</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-pink-400 to-purple-400 transition-all duration-300"
                          style={{ width: `${((predictionText?.confidence || prediction?.confidence || 0.7) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">
                        {Math.round((predictionText?.confidence || prediction?.confidence || 0.7) * 100)}%
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
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { SleepSession } from '@/lib/supabase'
import { useSleepSessions } from '@/hooks/useSupabase'
import Button from './ui/Button'
import Card from './ui/Card'
import SleepPrompts from './SleepPrompts'

interface SleepPrediction {
  nextBedtime: string
  timeUntilBedtime: string
  expectedDuration: string
  confidence: number
  summary: string
  reasoning: string
  provider?: string
  model?: string
  generationTime?: number
  sessionCount?: number
  childAge?: number
}

interface PredictionText {
  summary: string
  reasoning: string
  confidence: number
  expectedDuration: string
}

interface SleepPredictionProps {
  childAge: number
  recentSessions: SleepSession[]
  activeSession?: SleepSession
  refreshTrigger?: number
  childGender?: string
  childName?: string
  childId?: string
  onScrollToTracker?: () => void
  onQuickStart?: () => void
}

export default function SleepPrediction({ 
  childAge, 
  recentSessions, 
  activeSession,
  refreshTrigger,
  childGender = 'unknown',
  childName = 'Baby',
  childId,
  onScrollToTracker,
  onQuickStart
}: SleepPredictionProps) {
  const { savePrediction } = useSleepSessions(childId)

  // Helper function to hash data using native Web Crypto API
  const hashData = async (data: string): Promise<string> => {
    const encoder = new TextEncoder()
    const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0')).join('')
  }
  const [prediction, setPrediction] = useState<SleepPrediction | null>(null)
  const [predictionText, setPredictionText] = useState<PredictionText | null>(null)
  const [realTimeMetrics, setRealTimeMetrics] = useState<{nextBedtime: string, timeUntilBedtime: string, expectedDuration: string} | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, setCurrentTime] = useState(new Date())
  const [lastRequestId, setLastRequestId] = useState<string | null>(null)
  const [isRequestInFlight, setIsRequestInFlight] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Stabilize recentSessions to prevent unnecessary re-renders  
  const stableRecentSessions = useMemo(() => recentSessions, [recentSessions])

  // Memoize request parameters to avoid unnecessary re-renders
  const requestParams = useMemo(() => ({
    childAge,
    childGender,
    childName,
    sleepHistory: stableRecentSessions
  }), [childAge, childGender, childName, stableRecentSessions])

  // Request ID for prediction text (stable, doesn't include refreshTrigger)
  const textRequestId = useMemo(() => {
    const lastSleepTime = stableRecentSessions.length > 0 ? stableRecentSessions[0].end_time : null
    const roundedLastSleep = lastSleepTime ? Math.floor(new Date(lastSleepTime).getTime() / (5 * 60 * 1000)) : 0
    return `${childAge}-${childGender}-${childName}-${stableRecentSessions.length}-${roundedLastSleep}`
  }, [childAge, childGender, childName, stableRecentSessions])

  // Separate trigger for handling session deletions without affecting textRequestId
  const shouldRefresh = useMemo(() => refreshTrigger, [refreshTrigger])

  const loadPrediction = useCallback(async () => {
    console.log('SleepPrediction useEffect triggered:', {
      activeSession: !!activeSession,
      recentSessionsCount: stableRecentSessions.length,
      childAge,
      textRequestId,
      isRequestInFlight
    })
    
    if (activeSession || stableRecentSessions.length === 0) {
      console.log('Skipping prediction: activeSession or no recent sessions')
      return
    }

    // Check if this is a duplicate request or request already in flight
    if (lastRequestId === textRequestId || isRequestInFlight) {
      console.log('Skipping duplicate/in-flight request:', textRequestId)
      return
    }

    console.log('Loading new prediction...')
    setLastRequestId(textRequestId)
    setLoading(true)
    setError(null)
    setIsRequestInFlight(true)

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/predict-sleep', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...requestParams,
          childId: childId
        }),
        signal: abortControllerRef.current.signal
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
      
      // Save prediction to database if childId is provided
      if (childId && result.sessionCount >= 3) { // Only save AI predictions, not general recommendations
        try {
          // Generate hash of input sessions for deduplication
          const inputHash = await hashData(JSON.stringify(stableRecentSessions))
          
          await savePrediction(childId, {
            next_bedtime: result.nextBedtime,
            time_until_bedtime: result.timeUntilBedtime,
            expected_duration: result.expectedDuration,
            confidence: result.confidence,
            summary: result.summary,
            reasoning: result.reasoning,
            llm_provider: result.provider || 'general',
            model_used: result.model || null,
            session_count: result.sessionCount || 0,
            generation_time_ms: result.generationTime || null,
            child_age_months: result.childAge || childAge,
            input_sessions_hash: inputHash
          })
          
          console.log('Prediction saved to database successfully')
        } catch (dbError) {
          console.error('Failed to save prediction to database:', dbError)
          // Don't fail the UI if database save fails
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Request was cancelled')
        return
      }
      setError('Prediction temporarily unavailable due to high demand. Please try again in a few minutes.')
      console.error('Prediction error:', err)
    } finally {
      setLoading(false)
      setIsRequestInFlight(false)
    }
  }, [activeSession, stableRecentSessions, textRequestId, lastRequestId, requestParams, childAge, isRequestInFlight, childId, savePrediction])

  useEffect(() => {
    // Debounce the prediction requests to avoid rapid calls
    const timeoutId = setTimeout(loadPrediction, 1000)
    return () => clearTimeout(timeoutId)
  }, [loadPrediction])

  // Handle refresh trigger separately to clear cached data without triggering new request
  useEffect(() => {
    if (shouldRefresh && shouldRefresh > 0) {
      console.log('Handling refresh trigger, clearing cached prediction')
      setPrediction(null)
      setPredictionText(null)
      setLastRequestId(null)
    }
  }, [shouldRefresh])

  // Calculate real-time metrics based on current time and last prediction
  const calculateRealTimeMetrics = useCallback(() => {
    if (stableRecentSessions.length === 0) return null
    
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
    const lastSession = stableRecentSessions[0]
    
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
  }, [stableRecentSessions, childAge])
  
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
    if (stableRecentSessions.length === 0) return null
    
    const lastSession = stableRecentSessions[0]
    if (!lastSession.end_time) return null

    // Both times should be in UTC for accurate calculation
    const endTimeUTC = new Date(lastSession.end_time) // Database stores UTC
    const currentTimeUTC = new Date() // Current time in UTC
    const diffMinutes = Math.floor((currentTimeUTC.getTime() - endTimeUTC.getTime()) / (1000 * 60))
    
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    
    if (hours === 0) return `${minutes}m ago`
    return `${hours}h ${minutes}m ago`
  }, [stableRecentSessions])

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
              <div className={`p-4 rounded-xl ${
                prediction?.summary?.includes('⚠️ Missing sleep records') 
                  ? 'bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200' 
                  : 'bg-gradient-to-r from-pink-50 to-purple-50'
              }`}>
                {/* Warning message for missing sleep records */}
                {prediction?.summary?.includes('⚠️ Missing sleep records') && (
                  <div className="mb-4 p-3 bg-orange-100 border border-orange-300 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <span className="text-orange-600 text-lg">⚠️</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-orange-800 mb-1">
                          Sleep Records Missing
                        </p>
                        <p className="text-xs text-orange-700">
                          Add missed sleep sessions for accurate AI predictions
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onScrollToTracker?.()}
                        className="ml-2 text-xs px-2 py-1 border-orange-300 text-orange-700 hover:bg-orange-100"
                      >
                        Add Session
                      </Button>
                    </div>
                  </div>
                )}
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
                </div>
              </div>
            )}

            {!loading && !error && !(prediction || realTimeMetrics) && (
              <SleepPrompts
                recentSessions={stableRecentSessions}
                childAge={childAge}
                childName={childName}
                onScrollToTracker={onScrollToTracker || (() => {})}
                onQuickStart={onQuickStart}
              />
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
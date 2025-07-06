import { useState, useEffect } from 'react'
import { SleepSession } from '@/lib/supabase'
import { predictNextSleep, SleepPrediction as PredictionType } from '@/lib/gemini'
import Button from './ui/Button'
import Card from './ui/Card'

interface SleepPredictionProps {
  childAge: number
  recentSessions: SleepSession[]
  activeSession?: SleepSession
}

export default function SleepPrediction({ 
  childAge, 
  recentSessions, 
  activeSession 
}: SleepPredictionProps) {
  const [prediction, setPrediction] = useState<PredictionType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPrediction = async () => {
      if (activeSession || recentSessions.length === 0) return

      setLoading(true)
      setError(null)

      try {
        const result = await predictNextSleep(childAge, recentSessions)
        setPrediction(result)
      } catch (err) {
        setError('Failed to load sleep prediction')
        console.error('Prediction error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadPrediction()
  }, [childAge, recentSessions, activeSession])

  const getTimeSinceLastSleep = () => {
    if (recentSessions.length === 0) return null
    
    const lastSession = recentSessions[0]
    if (!lastSession.end_time) return null

    const endTime = new Date(lastSession.end_time)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - endTime.getTime()) / (1000 * 60))
    
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
                  
                  {prediction.reasoning && (
                    <div className="pt-2 border-t border-purple-200">
                      <p className="text-sm text-purple-700">
                        {prediction.reasoning}
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
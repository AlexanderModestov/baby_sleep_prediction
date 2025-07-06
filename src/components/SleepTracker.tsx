import { useState, useEffect } from 'react'
import { useSleepSessions } from '@/hooks/useSupabase'
import { useTelegram } from '@/hooks/useTelegram'
import { SleepSession } from '@/lib/supabase'
import { getSessionType, formatDuration } from '@/lib/utils'
import Button from './ui/Button'
import Card from './ui/Card'
import Input from './ui/Input'
import Select from './ui/Select'

interface SleepTrackerProps {
  childId: string
  activeSession?: SleepSession
  onSessionUpdate?: () => void
}

export default function SleepTracker({ childId, activeSession, onSessionUpdate }: SleepTrackerProps) {
  const { startSleepSession, endSleepSession } = useSleepSessions(childId)
  const { showAlert, hapticFeedback } = useTelegram()
  const [isStarting, setIsStarting] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [quality, setQuality] = useState('')
  const [stillSleeping, setStillSleeping] = useState(true)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)

  useEffect(() => {
    // Initialize current time on client
    const now = new Date()
    setCurrentTime(now)
    // Set start time to local timezone for datetime-local input
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    setStartTime(localDateTime)
  }, [])

  useEffect(() => {
    if (activeSession && currentTime) {
      const timer = setInterval(() => {
        setCurrentTime(new Date())
      }, 1000)
      
      // Initialize end time with current local time when there's an active session
      if (!endTime) {
        const now = new Date()
        const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
        setEndTime(localDateTime)
      }
      
      return () => clearInterval(timer)
    }
  }, [activeSession, currentTime, endTime])

  const handleStartSleep = async () => {
    setIsStarting(true)
    hapticFeedback()

    try {
      // Convert local datetime to UTC for server
      const sleepStartTime = startTime ? new Date(startTime).toISOString() : new Date().toISOString()
      const sleepEndTime = stillSleeping ? null : (endTime ? new Date(endTime).toISOString() : null)
      
      await startSleepSession({
        child_id: childId,
        start_time: sleepStartTime,
        end_time: sleepEndTime,
        duration_minutes: sleepEndTime ? Math.floor((new Date(sleepEndTime).getTime() - new Date(sleepStartTime).getTime()) / (1000 * 60)) : null,
        quality: stillSleeping ? null : (quality as "excellent" | "good" | "average" | "poor" | "very_poor" | null),
        session_type: getSessionType(sleepStartTime),
        is_active: stillSleeping
      })

      if (!stillSleeping) {
        // Reset form with local time
        const now = new Date()
        const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
        setStartTime(localDateTime)
        setEndTime('')
        setQuality('')
        setStillSleeping(true)
      }
      onSessionUpdate?.()
    } catch {
      hapticFeedback()
      showAlert('Failed to start sleep session. Please try again.')
    } finally {
      setIsStarting(false)
    }
  }

  const handleEndSleep = async () => {
    if (!activeSession) return

    setIsEnding(true)
    hapticFeedback()

    try {
      // Convert local datetime to UTC for server
      const sleepEndTime = endTime ? new Date(endTime).toISOString() : new Date().toISOString()
      
      await endSleepSession(activeSession.id, sleepEndTime, quality as "excellent" | "good" | "average" | "poor" | "very_poor" | null)
      
      setEndTime('')
      setQuality('')
      onSessionUpdate?.()
    } catch {
      hapticFeedback()
      showAlert('Failed to end sleep session. Please try again.')
    } finally {
      setIsEnding(false)
    }
  }

  const getCurrentDuration = () => {
    if (!activeSession || !currentTime) return 0
    const start = new Date(activeSession.start_time)
    const now = currentTime
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60))
  }

  const qualityOptions = [
    { value: 'excellent', label: 'Slept well' },
    { value: 'good', label: 'Good sleep' },
    { value: 'average', label: 'Average sleep' },
    { value: 'poor', label: 'Poor sleep' },
    { value: 'very_poor', label: 'Very poor sleep' }
  ]

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            Sleep Tracking
          </h2>
          <div className="text-2xl">
            {activeSession ? '😴' : '😊'}
          </div>
        </div>

        {activeSession ? (
          <>
            {/* Active Session Display */}
            <div className="p-4 bg-blue-50 rounded-xl">
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-blue-800">
                  Currently Sleeping
                </h3>
                <div className="text-3xl font-bold text-blue-600">
                  {currentTime ? formatDuration(getCurrentDuration()) : '⏱️'}
                </div>
                <p className="text-blue-600 text-sm">
                  Started at {new Date(activeSession.start_time).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* End Sleep Controls */}
            <div className="space-y-4">
              <Input
                label="End Time"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
              <Select
                label="Sleep Quality"
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                options={qualityOptions}
              />
              <Button
                onClick={handleEndSleep}
                disabled={isEnding || !endTime || !quality}
                className="w-full"
              >
                {isEnding ? 'Ending...' : 'End Sleep'}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Sleep Form */}
            <div className="space-y-4">
              <Input
                label="Start Time"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="stillSleeping"
                  checked={stillSleeping}
                  onChange={(e) => setStillSleeping(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="stillSleeping" className="text-sm font-medium text-gray-700">
                  Still sleeping
                </label>
              </div>

              {!stillSleeping && (
                <>
                  <Input
                    label="End Time"
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                  <Select
                    label="Sleep Quality"
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    options={qualityOptions}
                  />
                </>
              )}

              <Button
                onClick={handleStartSleep}
                disabled={isStarting || !startTime || (!stillSleeping && (!endTime || !quality))}
                className="w-full"
                size="lg"
              >
                {isStarting ? 'Saving...' : 'Save Sleep Session'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}
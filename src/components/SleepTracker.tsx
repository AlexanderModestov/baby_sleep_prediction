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
  const [showStartForm, setShowStartForm] = useState(false)
  const [showEndForm, setShowEndForm] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [quality, setQuality] = useState('')
  const [currentTime, setCurrentTime] = useState<Date | null>(null)

  useEffect(() => {
    // Initialize current time on client
    setCurrentTime(new Date())
  }, [])

  useEffect(() => {
    if (activeSession && currentTime) {
      const timer = setInterval(() => {
        setCurrentTime(new Date())
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [activeSession, currentTime])

  const handleStartSleep = async (useNow = true) => {
    setIsStarting(true)
    hapticFeedback('light')

    try {
      const sleepStartTime = useNow ? new Date().toISOString() : startTime
      
      await startSleepSession({
        child_id: childId,
        start_time: sleepStartTime,
        end_time: null,
        duration_minutes: null,
        quality: null,
        session_type: getSessionType(sleepStartTime),
        is_active: true
      })

      setShowStartForm(false)
      setStartTime('')
      onSessionUpdate?.()
    } catch {
      hapticFeedback('heavy')
      showAlert('Failed to start sleep session. Please try again.')
    } finally {
      setIsStarting(false)
    }
  }

  const handleEndSleep = async (stillSleeping = false) => {
    if (!activeSession) return

    if (stillSleeping) {
      setShowEndForm(true)
      if (currentTime) {
        setEndTime(currentTime.toISOString().slice(0, 16))
      }
      return
    }

    setIsEnding(true)
    hapticFeedback('light')

    try {
      const sleepEndTime = endTime || new Date().toISOString()
      
      await endSleepSession(activeSession.id, sleepEndTime, quality)
      
      setShowEndForm(false)
      setEndTime('')
      setQuality('')
      onSessionUpdate?.()
    } catch {
      hapticFeedback('heavy')
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
            {!showEndForm ? (
              <div className="space-y-3">
                <Button
                  onClick={() => handleEndSleep(false)}
                  disabled={isEnding}
                  className="w-full"
                >
                  {isEnding ? 'Ending...' : 'End Sleep Now'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleEndSleep(true)}
                  className="w-full"
                >
                  Set Custom End Time
                </Button>
              </div>
            ) : (
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
                <div className="flex space-x-3">
                  <Button
                    variant="secondary"
                    onClick={() => setShowEndForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleEndSleep(false)}
                    disabled={isEnding}
                    className="flex-1"
                  >
                    {isEnding ? 'Ending...' : 'End Sleep'}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Start Sleep Controls */}
            {!showStartForm ? (
              <div className="space-y-3">
                <Button
                  onClick={() => handleStartSleep(true)}
                  disabled={isStarting}
                  className="w-full"
                  size="lg"
                >
                  {isStarting ? 'Starting...' : 'Start Sleep Now'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowStartForm(true)}
                  className="w-full"
                >
                  Set Custom Start Time
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Input
                  label="Start Time"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
                <div className="flex space-x-3">
                  <Button
                    variant="secondary"
                    onClick={() => setShowStartForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleStartSleep(false)}
                    disabled={isStarting || !startTime}
                    className="flex-1"
                  >
                    {isStarting ? 'Starting...' : 'Start Sleep'}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  )
}
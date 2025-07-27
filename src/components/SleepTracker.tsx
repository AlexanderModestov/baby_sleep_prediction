import { useState, useEffect } from 'react'
import { useSleepSessions } from '@/hooks/useSupabase'
import { useTelegram } from '@/hooks/useTelegram'
import { SleepSession } from '@/lib/supabase'
import { getSessionType, formatDuration } from '@/lib/utils'
import Button from './ui/Button'
import Card from './ui/Card'
import Input from './ui/Input'
import Select from './ui/Select'
import Modal from './ui/Modal'

interface SleepTrackerProps {
  childId: string
  activeSession?: SleepSession
  onSessionUpdate?: () => void
}

export default function SleepTracker({ childId, activeSession, onSessionUpdate }: SleepTrackerProps) {
  const { startSleepSession, endSleepSession } = useSleepSessions(childId)
  const { showAlert, hapticFeedback, alertModal } = useTelegram()
  const [isStarting, setIsStarting] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const [showEndFields, setShowEndFields] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [quality, setQuality] = useState('')
  const [stillSleeping, setStillSleeping] = useState(true)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [startTimeManuallySet, setStartTimeManuallySet] = useState(false)
  const [isUserSelectingStartTime, setIsUserSelectingStartTime] = useState(false)
  const [isUserSelectingEndTime, setIsUserSelectingEndTime] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{
    endTime?: string
    quality?: string
    startTime?: string
  }>({})


  // Helper function to convert Date to datetime-local format
  const formatForDatetimeLocal = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Helper function to parse datetime-local value to Date object
  const parseDatetimeLocal = (datetimeLocal: string): Date => {
    // datetime-local format: "YYYY-MM-DDTHH:mm"
    // This creates a Date in the user's local timezone
    return new Date(datetimeLocal)
  }

  useEffect(() => {
    // Initialize current time on client
    const now = new Date()
    setCurrentTime(now)
    // Set start time to current local time
    setStartTime(formatForDatetimeLocal(now))
  }, [])

  useEffect(() => {
    if (currentTime) {
      const timer = setInterval(() => {
        const now = new Date()
        setCurrentTime(now)
        
        const localDateTime = formatForDatetimeLocal(now)
        
        if (activeSession) {
          // Only update end time if user hasn't manually set it
          // This prevents race conditions during validation
          if (!isUserSelectingEndTime) {
            setEndTime(localDateTime)
          }
        } else if (!startTimeManuallySet && !isUserSelectingStartTime) {
          // Update start time to current time continuously when there's no active session
          // and user hasn't manually set the start time and user is not currently selecting
          setStartTime(localDateTime)
        }
      }, 1000)
      
      return () => clearInterval(timer)
    }
  }, [activeSession, currentTime, startTimeManuallySet, isUserSelectingStartTime, isUserSelectingEndTime])

  const handleStartSleep = async () => {
    // Clear previous errors
    setValidationErrors({})
    
    const errors: typeof validationErrors = {}
    
    // Validate required fields
    if (!startTime) {
      errors.startTime = 'Please select a start time'
    }
    
    if (!stillSleeping && !endTime) {
      errors.endTime = 'Please select an end time'
    }
    
    if (!stillSleeping && !quality) {
      errors.quality = 'Please select sleep quality'
    }

    // Validate start time is not in the future
    if (startTime) {
      const startTimeDate = parseDatetimeLocal(startTime)
      const now = new Date()
      if (startTimeDate > now) {
        errors.startTime = 'Start time cannot be in the future'
      }
    }
    
    if (!stillSleeping && endTime) {
      const endTimeDate = parseDatetimeLocal(endTime)
      const startTimeDate = parseDatetimeLocal(startTime)
      
      const now = new Date()
      if (endTimeDate > now) {
        errors.endTime = 'End time cannot be in the future'
      } else if (endTimeDate <= startTimeDate) {
        errors.endTime = 'End time must be after start time'
      }
    }
    
    // If there are errors, show them and return
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      hapticFeedback()
      // Also show an alert for immediate feedback
      const firstError = Object.values(errors)[0]
      showAlert(firstError)
      return
    }

    setIsStarting(true)
    hapticFeedback()

    try {
      // Convert local datetime to UTC for server
      const sleepStartTime = startTime ? parseDatetimeLocal(startTime).toISOString() : new Date().toISOString()
      const sleepEndTime = stillSleeping ? null : (endTime ? parseDatetimeLocal(endTime).toISOString() : null)
      
      // Calculate duration using consistent datetime parsing
      const durationMinutes = sleepEndTime ? Math.floor((parseDatetimeLocal(endTime).getTime() - parseDatetimeLocal(startTime).getTime()) / (1000 * 60)) : null
      
      await startSleepSession({
        child_id: childId,
        start_time: sleepStartTime,
        end_time: sleepEndTime,
        duration_minutes: durationMinutes,
        quality: stillSleeping ? null : (quality as "excellent" | "good" | "average" | "poor" | "very_poor" | null),
        session_type: getSessionType(sleepStartTime),
        is_active: stillSleeping
      })

      if (!stillSleeping) {
        // Reset form with local time
        const now = new Date()
        const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
        setStartTime(localDateTime)
        setStartTimeManuallySet(false) // Reset manual flag
        setIsUserSelectingStartTime(false) // Reset selection flag
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

  const handleStartEndProcess = () => {
    setShowEndFields(true)
    hapticFeedback()
  }

  const handleEndSleep = async () => {
    if (!activeSession) return

    // Simple validation check
    if (!quality) {
      setValidationErrors({ quality: 'Please select sleep quality' })
      showAlert('Please select sleep quality before ending the session.')
      hapticFeedback()
      return
    }

    if (!endTime) {
      setValidationErrors({ endTime: 'Please select an end time' })
      showAlert('Please select an end time for the sleep session.')
      hapticFeedback()
      return
    }

    // Clear any previous errors
    setValidationErrors({})

    // Validate end time is not in the future
    const now = new Date()
    const endTimeDate = parseDatetimeLocal(endTime)
    const startTimeDate = new Date(activeSession.start_time) // This is already in UTC from database
    
    if (endTimeDate > now) {
      setValidationErrors({ endTime: 'End time cannot be in the future' })
      showAlert('End time cannot be in the future. Please select a valid time.')
      return
    }
    
    if (endTimeDate <= startTimeDate) {
      setValidationErrors({ endTime: 'End time must be after start time' })
      showAlert('End time must be after start time. Please select a valid time.')
      return
    }

    setIsEnding(true)
    hapticFeedback()

    try {
      // Convert local datetime to UTC for server
      const sleepEndTime = endTime ? parseDatetimeLocal(endTime).toISOString() : new Date().toISOString()
      
      await endSleepSession(activeSession.id, sleepEndTime, quality || undefined)
      
      setEndTime('')
      setQuality('')
      setShowEndFields(false)
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

  const clearError = (field: keyof typeof validationErrors) => {
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const qualityOptions = [
    { value: 'excellent', label: 'Slept well' },
    { value: 'good', label: 'Good sleep' },
    { value: 'average', label: 'Average sleep' },
    { value: 'poor', label: 'Poor sleep' },
    { value: 'very_poor', label: 'Very poor sleep' }
  ]

  return (
    <>
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
                  Started at {new Date(activeSession.start_time).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </p>
              </div>
            </div>

            {/* End Sleep Controls */}
            <div className="space-y-4">
              {!showEndFields ? (
                <Button
                  onClick={handleStartEndProcess}
                  disabled={isEnding}
                  className="w-full"
                >
                  End Sleep Session
                </Button>
              ) : (
                <>
                  <Input
                    label="End Time"
                    type="datetime-local"
                    value={endTime}
                    max={currentTime ? formatForDatetimeLocal(currentTime) : undefined}
                    onFocus={() => setIsUserSelectingEndTime(true)}
                    onBlur={() => setIsUserSelectingEndTime(false)}
                    onChange={(e) => {
                      setEndTime(e.target.value)
                      clearError('endTime')
                    }}
                    error={validationErrors.endTime}
                  />
                  <Select
                    label="Sleep Quality"
                    value={quality}
                    onChange={(e) => {
                      setQuality(e.target.value)
                      clearError('quality')
                    }}
                    options={qualityOptions}
                    error={validationErrors.quality}
                  />
                  <div className="flex space-x-3">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowEndFields(false)
                        setEndTime('')
                        setQuality('')
                        setValidationErrors({})
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleEndSleep}
                      disabled={isEnding}
                      className="flex-1"
                    >
                      {isEnding ? 'Ending...' : 'End Sleep'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Sleep Form */}
            <div className="space-y-4">
              <Input
                label={stillSleeping ? "Start Sleep Session" : "Start Time"}
                type="datetime-local"
                value={startTime}
                max={currentTime ? formatForDatetimeLocal(currentTime) : undefined}
                onFocus={() => {
                  setIsUserSelectingStartTime(true)
                  setStartTimeManuallySet(true)
                }}
                onBlur={() => {
                  setIsUserSelectingStartTime(false)
                }}
                onChange={(e) => {
                  setStartTime(e.target.value)
                  setStartTimeManuallySet(true)
                  clearError('startTime')
                }}
                error={validationErrors.startTime}
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
                    max={currentTime ? formatForDatetimeLocal(currentTime) : undefined}
                    onFocus={() => setIsUserSelectingEndTime(true)}
                    onBlur={() => setIsUserSelectingEndTime(false)}
                    onChange={(e) => {
                      setEndTime(e.target.value)
                      clearError('endTime')
                    }}
                    error={validationErrors.endTime}
                  />
                  <Select
                    label="Sleep Quality"
                    value={quality}
                    onChange={(e) => {
                      setQuality(e.target.value)
                      clearError('quality')
                    }}
                    options={qualityOptions}
                    error={validationErrors.quality}
                  />
                </>
              )}

              <Button
                onClick={handleStartSleep}
                disabled={isStarting}
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

    {/* Validation Alert Modal */}
    <Modal
      isOpen={alertModal.isOpen}
      onClose={alertModal.onClose}
      title="Invalid Time"
    >
      <p className="text-gray-700">{alertModal.message}</p>
    </Modal>
  </>
  )
}
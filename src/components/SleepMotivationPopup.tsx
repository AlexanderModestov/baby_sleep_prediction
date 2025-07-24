import { useState, useEffect } from 'react'
import { SleepSession } from '@/lib/supabase'
import Button from './ui/Button'
import Card from './ui/Card'

interface SleepMotivationPopupProps {
  recentSessions: SleepSession[]
  childAge: number
  childName: string
  onClose: () => void
  onScrollToTracker: () => void
}

// Age-appropriate wake windows and recommendations (from orchestrator.ts)
function getAgeBasedRecommendations(ageInMonths: number) {
  if (ageInMonths <= 3) {
    return { wakeWindow: 45, sleepDuration: 120, description: 'newborn (0-3 months)' }
  } else if (ageInMonths <= 6) {
    return { wakeWindow: 90, sleepDuration: 90, description: 'infant (3-6 months)' }
  } else if (ageInMonths <= 12) {
    return { wakeWindow: 120, sleepDuration: 90, description: 'older infant (6-12 months)' }
  } else if (ageInMonths <= 24) {
    return { wakeWindow: 180, sleepDuration: 120, description: 'toddler (12-24 months)' }
  } else {
    return { wakeWindow: 240, sleepDuration: 90, description: 'young child (2+ years)' }
  }
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours === 0) {
    return `${mins} minutes`
  } else if (mins === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`
  } else {
    return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes`
  }
}

export default function SleepMotivationPopup({ 
  recentSessions, 
  childAge, 
  childName, 
  onClose, 
  onScrollToTracker 
}: SleepMotivationPopupProps) {
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    const checkIfShouldShow = () => {
      if (recentSessions.length === 0) return false
      
      const recommendations = getAgeBasedRecommendations(childAge)
      const lastSession = recentSessions[0]
      
      if (!lastSession.end_time) return false
      
      const lastSleepEnd = new Date(lastSession.end_time)
      const now = new Date()
      const timeSinceLastSleep = Math.floor((now.getTime() - lastSleepEnd.getTime()) / (1000 * 60))
      
      // Show popup if time since last sleep is more than twice the recommended wake window
      const threshold = recommendations.wakeWindow * 2
      
      // Also check if we haven't shown this popup recently (avoid spam)
      const lastShownKey = `sleepMotivation_${childName}_${lastSession.id}`
      const lastShown = localStorage.getItem(lastShownKey)
      const now24h = Date.now() - (24 * 60 * 60 * 1000) // 24 hours ago
      
      if (lastShown && parseInt(lastShown) > now24h) {
        return false // Don't show if shown in last 24 hours for this session
      }
      
      if (timeSinceLastSleep > threshold) {
        // Mark as shown
        localStorage.setItem(lastShownKey, Date.now().toString())
        return true
      }
      
      return false
    }

    setShouldShow(checkIfShouldShow())
  }, [recentSessions, childAge, childName])

  if (!shouldShow) return null

  const recommendations = getAgeBasedRecommendations(childAge)
  const lastSession = recentSessions[0]
  const lastSleepEnd = new Date(lastSession.end_time!)
  const now = new Date()
  const timeSinceLastSleep = Math.floor((now.getTime() - lastSleepEnd.getTime()) / (1000 * 60))

  const getMotivationalMessage = () => {
    const timeAgo = formatTime(timeSinceLastSleep)
    const expectedWakeWindow = formatTime(recommendations.wakeWindow)
    const expectedSleepDuration = formatTime(recommendations.sleepDuration)
    
    return {
      title: `Time for ${childName} to sleep! 😴`,
      subtitle: `It's been ${timeAgo} since the last recorded sleep`,
      recommendations: [
        `💤 Optimal wake window for ${recommendations.description}: ${expectedWakeWindow}`,
        `⏰ Expected sleep duration: ${expectedSleepDuration}`,
        `🌙 ${childName} is likely getting tired and ready for sleep`
      ],
      cta: "Track this sleep session to maintain healthy patterns and get better predictions!"
    }
  }

  const message = getMotivationalMessage()

  const handleTrackSleep = () => {
    onScrollToTracker()
    onClose()
  }

  const handleRemindLater = () => {
    // Set a shorter reminder (2 hours from now)
    const remindKey = `sleepMotivation_${childName}_${lastSession.id}_remind`
    localStorage.setItem(remindKey, (Date.now() + 2 * 60 * 60 * 1000).toString())
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full mx-4 bg-white">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="text-4xl">🌙</div>
            <h2 className="text-xl font-bold text-gray-800">
              {message.title}
            </h2>
            <p className="text-gray-600">
              {message.subtitle}
            </p>
          </div>

          {/* Recommendations */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-gray-800 text-center">
              Sleep Recommendations for {childName}
            </h3>
            <div className="space-y-2">
              {message.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span className="text-gray-700 text-sm">{rec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-blue-800 text-sm font-medium">
              {message.cta}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-3">
            <Button
              onClick={handleTrackSleep}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium w-full"
            >
              Track Sleep Session Now
            </Button>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handleRemindLater}
                className="flex-1 text-gray-600 border-gray-300"
              >
                Remind Me in 2 Hours
              </Button>
              
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 text-gray-600 border-gray-300"
              >
                Dismiss
              </Button>
            </div>
          </div>

          {/* Tips */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              💡 <strong>Tip:</strong> Regular sleep tracking helps our AI learn {childName}&apos;s unique patterns for better predictions
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
import { useState, useEffect, useRef } from 'react'
import { useChildren, useSleepSessions } from '@/hooks/useSupabase'
import { useTelegram } from '@/hooks/useTelegram'
import { Child } from '@/lib/supabase'
import { calculateAge } from '@/lib/utils'
import Button from './ui/Button'
import SwipeableChildSelector from './ui/SwipeableChildSelector'
import SleepTracker from './SleepTracker'
import SleepPrediction from './SleepPrediction'
import SleepHistory from './SleepHistory'
import SleepMotivationPopup from './SleepMotivationPopup'

interface MainScreenProps {
  onAddChild: () => void
  onEditChild: (child: Child) => void
}

export default function MainScreen({ onAddChild, onEditChild }: MainScreenProps) {
  const { children } = useChildren()
  const { user } = useTelegram()
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [lastDeletedId, setLastDeletedId] = useState<string | null>(null)
  const [showMotivationPopup, setShowMotivationPopup] = useState(false)
  const sleepTrackerRef = useRef<HTMLDivElement>(null)
  const { sessions, loading: sessionsLoading, deleteSleepSession, refetch } = useSleepSessions(selectedChild?.id)

  const handleDeleteSession = async (sessionId: string) => {
    setLastDeletedId(sessionId)
    await deleteSleepSession(sessionId)
  }

  const scrollToSleepTracker = () => {
    sleepTrackerRef.current?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    })
  }

  // Trigger prediction refresh after sessions array updates
  useEffect(() => {
    if (lastDeletedId) {
      // Check if the session was actually removed from the array
      const sessionExists = sessions.some(s => s.id === lastDeletedId)
      if (!sessionExists) {
        setRefreshTrigger(prev => prev + 1)
        setLastDeletedId(null)
      }
    }
  }, [sessions, lastDeletedId])

  useEffect(() => {
    if (children.length > 0 && !selectedChild) {
      setSelectedChild(children[0])
    }
  }, [children, selectedChild])

  // Check for motivation popup trigger
  useEffect(() => {
    if (selectedChild && sessions.length > 0) {
      const checkMotivationTrigger = () => {
        const lastSession = sessions[0]
        if (!lastSession.end_time) return
        
        const childAge = calculateAge(selectedChild.date_of_birth)
        const getWakeWindow = (ageInMonths: number) => {
          if (ageInMonths <= 3) return 45
          if (ageInMonths <= 6) return 90
          if (ageInMonths <= 12) return 120
          if (ageInMonths <= 24) return 180
          return 240
        }
        
        const wakeWindow = getWakeWindow(childAge)
        const lastSleepEnd = new Date(lastSession.end_time)
        const now = new Date()
        const timeSinceLastSleep = Math.floor((now.getTime() - lastSleepEnd.getTime()) / (1000 * 60))
        
        // Show popup if time since last sleep is more than twice the recommended wake window
        if (timeSinceLastSleep > wakeWindow * 2) {
          // Check if we haven't shown popup recently for this session
          const lastShownKey = `sleepMotivation_${selectedChild.name}_${lastSession.id}`
          const lastShown = localStorage.getItem(lastShownKey)
          const now24h = Date.now() - (24 * 60 * 60 * 1000)
          
          if (!lastShown || parseInt(lastShown) < now24h) {
            setShowMotivationPopup(true)
          }
        }
      }
      
      // Check immediately and then every 30 minutes
      checkMotivationTrigger()
      const interval = setInterval(checkMotivationTrigger, 30 * 60 * 1000)
      
      return () => clearInterval(interval)
    }
  }, [selectedChild, sessions])

  const activeSession = sessions.find(session => session.is_active)

  if (children.length === 0) {
    return (
      <div className="text-center space-y-4">
        <p className="text-gray-600">No children added yet.</p>
        <Button onClick={onAddChild}>Add Your First Child</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-800">
          Hello, {user?.custom_name || user?.first_name || 'Parent'}! 👋
        </h1>
        <p className="text-gray-600">
          Track your baby&apos;s sleep patterns
        </p>
      </div>

      {/* Child Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-lg font-medium text-gray-700">
            Add another child
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onAddChild}
            className="w-8 h-8 p-0 flex items-center justify-center"
          >
            +
          </Button>
        </div>
        
        <SwipeableChildSelector
          childrenList={children}
          selectedChild={selectedChild}
          onChildSelect={setSelectedChild}
          onEditChild={onEditChild}
        />
      </div>

      {selectedChild && (
        <>
          {/* Sleep Tracker */}
          <div ref={sleepTrackerRef}>
            <SleepTracker
              childId={selectedChild.id}
              activeSession={activeSession}
              onSessionUpdate={refetch}
            />
          </div>

          {/* Sleep Prediction */}
          <SleepPrediction
            childAge={calculateAge(selectedChild.date_of_birth)}
            recentSessions={sessions.slice(0, 10)}
            activeSession={activeSession}
            refreshTrigger={refreshTrigger}
            childGender={selectedChild.gender}
            childName={selectedChild.name}
            onScrollToTracker={scrollToSleepTracker}
          />

          {/* Sleep History */}
          <SleepHistory
            sessions={sessions}
            loading={sessionsLoading}
            onDeleteSession={handleDeleteSession}
          />
        </>
      )}

      {/* Sleep Motivation Popup */}
      {showMotivationPopup && selectedChild && (
        <SleepMotivationPopup
          recentSessions={sessions.slice(0, 10)}
          childAge={calculateAge(selectedChild.date_of_birth)}
          childName={selectedChild.name}
          onClose={() => setShowMotivationPopup(false)}
          onScrollToTracker={scrollToSleepTracker}
        />
      )}
    </div>
  )
}
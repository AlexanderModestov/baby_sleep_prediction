import { useState, useEffect } from 'react'
import { useChildren, useSleepSessions } from '@/hooks/useSupabase'
import { useTelegram } from '@/hooks/useTelegram'
import { Child } from '@/lib/supabase'
import { calculateAge } from '@/lib/utils'
import Button from './ui/Button'
import SwipeableChildSelector from './ui/SwipeableChildSelector'
import SleepTracker from './SleepTracker'
import SleepPrediction from './SleepPrediction'
import SleepHistory from './SleepHistory'

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
  const { sessions, loading: sessionsLoading, deleteSleepSession, refetch } = useSleepSessions(selectedChild?.id)

  const handleDeleteSession = async (sessionId: string) => {
    setLastDeletedId(sessionId)
    await deleteSleepSession(sessionId)
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
          <SleepTracker
            childId={selectedChild.id}
            activeSession={activeSession}
            onSessionUpdate={refetch}
          />

          {/* Sleep Prediction */}
          <SleepPrediction
            childAge={calculateAge(selectedChild.date_of_birth)}
            recentSessions={sessions.slice(0, 10)}
            activeSession={activeSession}
            refreshTrigger={refreshTrigger}
          />

          {/* Sleep History */}
          <SleepHistory
            sessions={sessions}
            loading={sessionsLoading}
            onDeleteSession={handleDeleteSession}
          />
        </>
      )}
    </div>
  )
}
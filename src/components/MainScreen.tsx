import { useState, useEffect } from 'react'
import { useChildren, useSleepSessions } from '@/hooks/useSupabase'
import { useTelegram } from '@/hooks/useTelegram'
import { Child } from '@/lib/supabase'
import { calculateAge } from '@/lib/utils'
import Button from './ui/Button'
import Card from './ui/Card'
import Select from './ui/Select'
import ThemeSelector from './ThemeSelector'
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
          Hello, {user?.first_name || 'Parent'}! 👋
        </h1>
        <p className="text-gray-600">
          Track your baby&apos;s sleep patterns
        </p>
      </div>

      {/* Child Selection */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Child Selection
            </h2>
            <p className="text-sm text-gray-600">
              Select a child to view their sleep tracking
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onAddChild}
          >
            + Add Child
          </Button>
        </div>
        
        <div className="space-y-4">
          <ThemeSelector />
          
          <Select
            label="Select Child"
            value={selectedChild?.id || ''}
            onChange={(e) => {
              const child = children.find(c => c.id === e.target.value)
              setSelectedChild(child || null)
            }}
            options={children.map(child => ({
              value: child.id,
              label: child.name
            }))}
          />
          
          {selectedChild && (
            <div className="p-4 bg-primary-light rounded-xl border border-primary">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-3xl">
                    {selectedChild.gender === 'male' ? '👦' : '👧'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">
                      {selectedChild.name}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{calculateAge(selectedChild.date_of_birth)} months old</span>
                      <span>•</span>
                      <span>Born {new Date(selectedChild.date_of_birth).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onEditChild(selectedChild)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-lg transition-colors"
                  title="Edit child"
                >
                  ✏️
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

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
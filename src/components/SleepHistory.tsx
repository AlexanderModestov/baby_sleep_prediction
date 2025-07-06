import { useState } from 'react'
import { SleepSession } from '@/lib/supabase'
import { formatDate, formatTime, formatDuration, getQualityColor, getQualityLabel } from '@/lib/utils'
import { useTelegram } from '@/hooks/useTelegram'
import Card from './ui/Card'
import Button from './ui/Button'
import Modal from './ui/Modal'

interface SleepHistoryProps {
  sessions: SleepSession[]
  loading: boolean
  onDeleteSession: (sessionId: string) => Promise<void>
}

export default function SleepHistory({ sessions, loading, onDeleteSession }: SleepHistoryProps) {
  const { showConfirm, showAlert, alertModal, confirmModal } = useTelegram()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (session: SleepSession) => {
    const confirmed = await showConfirm(
      `Are you sure you want to delete this ${session.session_type === 'night' ? 'night sleep' : 'nap'} session from ${formatDate(session.start_time)}?`
    )
    
    if (!confirmed) return

    setDeletingId(session.id)
    try {
      await onDeleteSession(session.id)
      showAlert('Sleep session deleted successfully')
    } catch {
      showAlert('Failed to delete sleep session. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }
  if (loading) {
    return (
      <Card>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Sleep History</h2>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-300"></div>
          </div>
        </div>
      </Card>
    )
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Sleep History</h2>
          <div className="text-center py-8">
            <div className="text-4xl mb-4">😴</div>
            <p className="text-gray-600">No sleep sessions recorded yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Start tracking sleep to see history here
            </p>
          </div>
        </div>
      </Card>
    )
  }

  // Group sessions by date
  const sessionsByDate = sessions.reduce((acc, session) => {
    const date = new Date(session.start_time).toDateString()
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(session)
    return acc
  }, {} as Record<string, SleepSession[]>)

  const sortedDates = Object.keys(sessionsByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  )

  return (
    <>
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Sleep History</h2>
            <div className="text-2xl">📊</div>
          </div>

        <div className="space-y-4">
          {sortedDates.map((date) => (
            <div key={date} className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700 sticky top-0 bg-white py-1">
                {formatDate(date)}
              </h3>
              
              <div className="space-y-2">
                {sessionsByDate[date].map((session) => (
                  <div
                    key={session.id}
                    className="p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-xl">
                          {session.session_type === 'night' ? '🌙' : '☀️'}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">
                            {session.session_type === 'night' ? 'Night Sleep' : 'Nap'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatTime(session.start_time)} - {' '}
                            {session.end_time ? formatTime(session.end_time) : 'Still sleeping'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="font-semibold text-gray-800">
                            {session.duration_minutes ? formatDuration(session.duration_minutes) : '⏱️'}
                          </div>
                          {session.quality && (
                            <div className="mt-1">
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getQualityColor(session.quality)}`}>
                                {getQualityLabel(session.quality)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(session)}
                            disabled={deletingId === session.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                          >
                            {deletingId === session.id ? '...' : '🗑️'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {sessions.length > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-pink-600">
                  {sessions.length}
                </div>
                <div className="text-sm text-gray-600">Total Sessions</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(
                    sessions
                      .filter(s => s.duration_minutes)
                      .reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60
                  )}h
                </div>
                <div className="text-sm text-gray-600">Total Sleep</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>

    {/* Alert Modal */}
    <Modal
      isOpen={alertModal.isOpen}
      onClose={alertModal.onClose}
      title="Sleep Tracker"
    >
      <p className="text-gray-700">{alertModal.message}</p>
    </Modal>

    {/* Confirm Modal */}
    <Modal
      isOpen={confirmModal.isOpen}
      onClose={confirmModal.onCancel}
      title="Delete Sleep Session"
      onConfirm={confirmModal.onConfirm}
      confirmText="Delete"
      cancelText="Cancel"
      confirmVariant="danger"
      isLoading={deletingId !== null}
    >
      <p className="text-gray-700">{confirmModal.message}</p>
    </Modal>
  </>
  )
}
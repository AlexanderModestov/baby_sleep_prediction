import { useState } from 'react'
import Button from './ui/Button'
import Card from './ui/Card'

interface QuickStartFlowProps {
  childAge: number
  childName: string
  onAddSession: (startTime: string, endTime: string, quality: string) => void
  onClose: () => void
}

export default function QuickStartFlow({ 
  childAge, 
  childName, 
  onAddSession, 
  onClose 
}: QuickStartFlowProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null)

  const getAgeGroup = () => {
    if (childAge <= 3) return 'newborn'
    if (childAge <= 6) return 'infant'
    if (childAge <= 12) return 'baby'
    return 'toddler'
  }

  const getTypicalSchedule = () => {
    const ageGroup = getAgeGroup()
    
    switch (ageGroup) {
      case 'newborn':
        return {
          napDuration: 2, // 2 hours
          nightDuration: 4, // 4 hours
          wakeWindow: 1, // 1 hour
          suggestions: [
            { label: 'Morning nap (just ended)', time: -2, duration: 2 },
            { label: 'Afternoon nap (just ended)', time: -1.5, duration: 1.5 },
            { label: 'Evening nap (just ended)', time: -2.5, duration: 2.5 },
          ]
        }
      case 'infant':
        return {
          napDuration: 1.5, // 1.5 hours
          nightDuration: 6, // 6 hours
          wakeWindow: 2, // 2 hours
          suggestions: [
            { label: 'Morning nap (just ended)', time: -1.5, duration: 1.5 },
            { label: 'Afternoon nap (just ended)', time: -2, duration: 2 },
            { label: 'Night sleep (just ended)', time: -8, duration: 8 },
          ]
        }
      default:
        return {
          napDuration: 1.5,
          nightDuration: 10,
          wakeWindow: 3,
          suggestions: [
            { label: 'Afternoon nap (just ended)', time: -1.5, duration: 1.5 },
            { label: 'Night sleep (just ended)', time: -10, duration: 10 },
          ]
        }
    }
  }

  const schedule = getTypicalSchedule()

  const handleQuickAdd = (suggestion: { time: number; duration: number; label: string }) => {
    const now = new Date()
    const endTime = new Date(now.getTime() + suggestion.time * 60 * 60 * 1000)
    const startTime = new Date(endTime.getTime() - suggestion.duration * 60 * 60 * 1000)

    const formatDateTime = (date: Date) => {
      return date.toISOString().slice(0, 16)
    }

    onAddSession(
      formatDateTime(startTime),
      formatDateTime(endTime),
      'average'
    )
    onClose()
  }

  const scenarios = [
    {
      id: 'typical-schedule',
      title: '⏰ Add Recent Sleep',
      description: `Help us learn ${childName}'s patterns by adding a recent sleep session`,
      action: 'Choose Recent Sleep'
    },
    {
      id: 'current-sleep',
      title: '😴 Baby is Sleeping Now',
      description: `${childName} is currently sleeping - I&apos;ll help you track it`,
      action: 'Track Current Sleep'
    },
    {
      id: 'manual-entry',
      title: '📝 Enter Manually',
      description: 'I want to enter sleep details myself',
      action: 'Manual Entry'
    }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full mx-4 bg-white">
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-4xl mb-2">🚀</div>
            <h2 className="text-xl font-bold text-gray-800">
              Quick Start Sleep Tracking
            </h2>
            <p className="text-gray-600 text-sm mt-2">
              Let&apos;s get {childName}&apos;s sleep data started
            </p>
          </div>

          {currentStep === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                Choose the best way to start:
              </p>
              
              {scenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => {
                    setSelectedScenario(scenario.id)
                    setCurrentStep(1)
                  }}
                  className="w-full p-4 text-left border rounded-xl hover:bg-gray-50 hover:border-purple-300 transition-colors"
                >
                  <div className="font-medium text-gray-800">
                    {scenario.title}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {scenario.description}
                  </div>
                </button>
              ))}
            </div>
          )}

          {currentStep === 1 && selectedScenario === 'typical-schedule' && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-gray-800">
                  Recent Sleep Sessions
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Choose a sleep that recently ended:
                </p>
              </div>

              <div className="space-y-2">
                {schedule.suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAdd(suggestion)}
                    className="w-full p-3 text-left border rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-800">
                        {suggestion.label}
                      </span>
                      <span className="text-sm text-gray-600">
                        {suggestion.duration}h duration
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 1 && selectedScenario === 'current-sleep' && (
            <div className="text-center space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800">
                  Track Current Sleep
                </h3>
                <p className="text-sm text-gray-600 mt-2">
                  This will start an active sleep session for {childName}.
                  You can end it when they wake up.
                </p>
              </div>
              
              <Button
                onClick={() => {
                  const now = new Date()
                  const startTime = new Date(now.getTime() - 30 * 60 * 1000) // 30 minutes ago
                  onAddSession(
                    startTime.toISOString().slice(0, 16),
                    '',
                    'average'
                  )
                  onClose()
                }}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white w-full"
              >
                Start Tracking Sleep
              </Button>
            </div>
          )}

          {currentStep === 1 && selectedScenario === 'manual-entry' && (
            <div className="text-center space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800">
                  Manual Entry
                </h3>
                <p className="text-sm text-gray-600 mt-2">
                  Use the Sleep Tracker below to enter specific times and details.
                </p>
              </div>
              
              <Button
                onClick={onClose}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white w-full"
              >
                Go to Sleep Tracker
              </Button>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t">
            {currentStep > 0 ? (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(0)}
                className="text-gray-600"
              >
                Back
              </Button>
            ) : (
              <div />
            )}
            
            <Button
              variant="outline"
              onClick={onClose}
              className="text-gray-600"
            >
              Skip for Now
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
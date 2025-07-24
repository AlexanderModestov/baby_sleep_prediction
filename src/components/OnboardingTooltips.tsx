import { useState, useEffect } from 'react'
import { SleepSession } from '@/lib/supabase'
import Button from './ui/Button'

interface OnboardingTooltipsProps {
  recentSessions: SleepSession[]
  onDismiss: () => void
}

export default function OnboardingTooltips({ recentSessions, onDismiss }: OnboardingTooltipsProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  // Show onboarding only for new users (no sessions or very few)
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenSleepOnboarding')
    const shouldShowOnboarding = !hasSeenOnboarding && recentSessions.length < 2
    
    if (shouldShowOnboarding) {
      setIsVisible(true)
    }
  }, [recentSessions.length])

  const steps = [
    {
      title: "Welcome to Sleep Tracking! 🌙",
      content: "Track your baby's sleep patterns to get AI-powered predictions and insights.",
      position: "center"
    },
    {
      title: "Record Sleep Sessions 📝",
      content: "Use the Sleep Tracker below to log when your baby sleeps. Just 3 sessions unlock personalized predictions!",
      position: "tracker"
    },
    {
      title: "Get Smart Predictions 🔮",
      content: "Once you have enough data, we'll predict optimal bedtimes and sleep durations based on your baby's unique patterns.",
      position: "prediction"
    }
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleFinish()
    }
  }

  const handleFinish = () => {
    localStorage.setItem('hasSeenSleepOnboarding', 'true')
    setIsVisible(false)
    onDismiss()
  }

  const handleSkip = () => {
    localStorage.setItem('hasSeenSleepOnboarding', 'true')
    setIsVisible(false)
    onDismiss()
  }

  if (!isVisible) return null

  const currentStepData = steps[currentStep]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-200">
          <div 
            className="h-full bg-gradient-to-r from-pink-500 to-purple-600 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="p-6 text-center space-y-4">
          <h3 className="text-xl font-bold text-gray-800">
            {currentStepData.title}
          </h3>
          
          <p className="text-gray-600 leading-relaxed">
            {currentStepData.content}
          </p>

          {/* Step indicators */}
          <div className="flex justify-center space-x-2 py-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                  index === currentStep
                    ? 'bg-purple-600'
                    : index < currentStep
                    ? 'bg-purple-300'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <div className="flex justify-between items-center pt-2">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              Skip Tour
            </Button>
            
            <div className="flex space-x-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="text-purple-600 border-purple-300 hover:bg-purple-50"
                >
                  Back
                </Button>
              )}
              
              <Button
                onClick={handleNext}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
              >
                {currentStep === steps.length - 1 ? 'Get Started!' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
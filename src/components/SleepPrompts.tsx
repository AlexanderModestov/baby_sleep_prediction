import { SleepSession } from '@/lib/supabase'
import Button from './ui/Button'
import Card from './ui/Card'

interface SleepPromptsProps {
  recentSessions: SleepSession[]
  childName: string
  onScrollToTracker: () => void
  onQuickStart?: () => void
}

export default function SleepPrompts({
  recentSessions,
  childName,
  onScrollToTracker,
  onQuickStart
}: SleepPromptsProps) {
  const getPromptType = () => {
    if (recentSessions.length === 0) return 'no-records'

    return null
  }

  const promptType = getPromptType()

  if (!promptType) return null

  const getPromptConfig = () => {
    switch (promptType) {
      case 'no-records':
        return {
          icon: '🌟',
          title: `Get started ${childName}'s sleep`,
          message: `Record when ${childName} woke up after night sleep to help us schedule next sleeps.`,
          action: 'Wake up!',
          highlight: '',
          bgColor: 'bg-gradient-to-r from-blue-50 to-purple-50',
          borderColor: 'border-blue-200'
        }

      default:
        return null
    }
  }

  const config = getPromptConfig()
  if (!config) return null

  return (
    <Card className={`${config.bgColor} ${config.borderColor} border`}>
      <div className="space-y-4 text-center">
        <div className="text-4xl">{config.icon}</div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-800">
            {config.title}
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            {config.message}
          </p>
        </div>

        {config.highlight && (
          <div className="inline-block px-3 py-1 bg-white bg-opacity-80 rounded-full">
            <span className="text-xs font-medium text-gray-700">
              {config.highlight}
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button
            onClick={onScrollToTracker}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium"
          >
            {config.action}
          </Button>
          
          {onQuickStart && promptType === 'no-records' && (
            <Button
              variant="outline"
              onClick={onQuickStart}
              className="border-purple-300 text-purple-600 hover:bg-purple-50"
            >
              Quick Start Guide
            </Button>
          )}
        </div>

        {promptType === 'no-records' && (
          <div className="text-xs text-gray-500 space-y-1">
            <p>🔒 Your data is private and secure</p>
          </div>
        )}
      </div>
    </Card>
  )
}
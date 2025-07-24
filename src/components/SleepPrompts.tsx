import { SleepSession } from '@/lib/supabase'
import Button from './ui/Button'
import Card from './ui/Card'

interface SleepPromptsProps {
  recentSessions: SleepSession[]
  childAge: number
  childName: string
  onScrollToTracker: () => void
  onQuickStart?: () => void
}

export default function SleepPrompts({ 
  recentSessions, 
  childAge, 
  childName,
  onScrollToTracker,
  onQuickStart
}: SleepPromptsProps) {
  const getPromptType = () => {
    if (recentSessions.length === 0) return 'no-records'
    if (recentSessions.length < 3) return 'insufficient-records'
    
    const lastSession = recentSessions[0]
    if (lastSession.end_time) {
      const lastSleepEnd = new Date(lastSession.end_time)
      const hoursAgo = (Date.now() - lastSleepEnd.getTime()) / (1000 * 60 * 60)
      
      // For babies under 6 months, consider data stale after 24 hours
      // For older children, after 48 hours
      const staleThreshold = childAge <= 6 ? 24 : 48
      
      if (hoursAgo > staleThreshold) return 'stale-records'
    }
    
    return null
  }

  const promptType = getPromptType()
  
  if (!promptType) return null

  const getAgeGroup = () => {
    if (childAge <= 3) return 'newborn'
    if (childAge <= 6) return 'infant'
    if (childAge <= 12) return 'baby'
    if (childAge <= 24) return 'toddler'
    return 'child'
  }

  const getPromptConfig = () => {
    const ageGroup = getAgeGroup()
    
    switch (promptType) {
      case 'no-records':
        return {
          icon: '🌟',
          title: `Start tracking ${childName}'s sleep`,
          message: `To get personalized AI predictions for your ${ageGroup}, we need to learn ${childName}'s sleep patterns first.`,
          action: 'Record First Sleep Session',
          highlight: 'Just 3 sleep sessions unlock AI predictions!',
          bgColor: 'bg-gradient-to-r from-blue-50 to-purple-50',
          borderColor: 'border-blue-200'
        }
        
      case 'insufficient-records':
        const remaining = 3 - recentSessions.length
        return {
          icon: '📊',
          title: `${remaining} more session${remaining > 1 ? 's' : ''} needed`,
          message: `Great start! You have ${recentSessions.length} session${recentSessions.length > 1 ? 's' : ''} recorded. Just ${remaining} more to unlock personalized AI predictions.`,
          action: 'Add Another Session',
          highlight: `Almost there - ${remaining} to go!`,
          bgColor: 'bg-gradient-to-r from-green-50 to-blue-50',
          borderColor: 'border-green-200'
        }
        
      case 'stale-records':
        const lastSession = recentSessions[0]
        const hoursAgo = Math.floor((Date.now() - new Date(lastSession.end_time!).getTime()) / (1000 * 60 * 60))
        const daysAgo = Math.floor(hoursAgo / 24)
        
        const timeText = daysAgo > 0 ? `${daysAgo} day${daysAgo > 1 ? 's' : ''}` : `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''}`
        
        return {
          icon: '⏰',
          title: 'Update sleep records',
          message: `${childName}'s last recorded sleep was ${timeText} ago. ${ageGroup === 'newborn' ? 'Newborns' : 'Young children'} have frequent sleep cycles, so recent data helps us provide better predictions.`,
          action: 'Add Recent Sleep',
          highlight: 'Keep predictions accurate with fresh data',
          bgColor: 'bg-gradient-to-r from-orange-50 to-yellow-50',
          borderColor: 'border-orange-200'
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

        <div className="inline-block px-3 py-1 bg-white bg-opacity-80 rounded-full">
          <span className="text-xs font-medium text-gray-700">
            {config.highlight}
          </span>
        </div>

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
            <p>💡 <strong>Tip:</strong> Start with recent sleep sessions for best results</p>
            <p>🔒 Your data is private and secure</p>
          </div>
        )}
      </div>
    </Card>
  )
}
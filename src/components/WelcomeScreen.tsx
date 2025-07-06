import Button from './ui/Button'
import Card from './ui/Card'

interface WelcomeScreenProps {
  onAddChild: () => void
}

export default function WelcomeScreen({ onAddChild }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
      <div className="text-center space-y-4">
        <div className="text-6xl mb-4">👶</div>
        <h1 className="text-3xl font-bold text-gray-800">
          Baby Sleep Tracker
        </h1>
        <p className="text-gray-600 text-lg max-w-md">
          Track your baby&apos;s sleep patterns and get AI-powered predictions for better rest
        </p>
      </div>
      
      <Card className="w-full max-w-sm">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Get Started
          </h2>
          <p className="text-gray-600">
            Add your child&apos;s profile to begin tracking their sleep patterns
          </p>
          <Button 
            onClick={onAddChild}
            className="w-full"
            size="lg"
          >
            + Add Your Child
          </Button>
        </div>
      </Card>
    </div>
  )
}
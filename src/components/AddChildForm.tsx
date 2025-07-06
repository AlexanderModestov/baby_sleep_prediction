import { useState } from 'react'
import { useChildren } from '@/hooks/useSupabase'
import { useTelegram } from '@/hooks/useTelegram'
import Button from './ui/Button'
import Card from './ui/Card'
import Input from './ui/Input'
import Select from './ui/Select'

interface AddChildFormProps {
  onBack: () => void
  onSuccess: () => void
}

export default function AddChildForm({ onBack, onSuccess }: AddChildFormProps) {
  const { addChild } = useChildren()
  const { showAlert, hapticFeedback } = useTelegram()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    date_of_birth: '',
    gender: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (!formData.date_of_birth) {
      newErrors.date_of_birth = 'Date of birth is required'
    } else {
      const birthDate = new Date(formData.date_of_birth)
      const today = new Date()
      if (birthDate > today) {
        newErrors.date_of_birth = 'Date of birth cannot be in the future'
      }
    }
    
    if (!formData.gender) {
      newErrors.gender = 'Gender is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      hapticFeedback('medium')
      return
    }

    setLoading(true)
    
    try {
      await addChild({
        name: formData.name.trim(),
        date_of_birth: formData.date_of_birth,
        gender: formData.gender as 'male' | 'female'
      })
      
      hapticFeedback('light')
      onSuccess()
    } catch {
      hapticFeedback('heavy')
      showAlert('Failed to add child. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-800">Add Your Child</h1>
        <p className="text-gray-600">
          Let&apos;s set up your child&apos;s profile to start tracking their sleep
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Child's Name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter your child&apos;s name"
            error={errors.name}
          />

          <Input
            label="Date of Birth"
            type="date"
            value={formData.date_of_birth}
            onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
            error={errors.date_of_birth}
          />

          <Select
            label="Gender"
            value={formData.gender}
            onChange={(e) => handleInputChange('gender', e.target.value)}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' }
            ]}
            error={errors.gender}
          />

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onBack}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Adding...' : 'Add Child'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
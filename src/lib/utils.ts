import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours === 0) {
    return `${mins}m`
  }
  if (mins === 0) {
    return `${hours}h`
  }
  return `${hours}h ${mins}m`
}

export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  })
}

export function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate)
  const today = new Date()
  const diffTime = Math.abs(today.getTime() - birth.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.floor(diffDays / 30) // Approximate months
}

export function getSessionType(startTime: string): 'night' | 'nap' {
  const hour = new Date(startTime).getHours()
  // Consider sleep starting between 6 PM and 6 AM as night sleep
  return (hour >= 18 || hour < 6) ? 'night' : 'nap'
}

export function getQualityColor(quality: string): string {
  switch (quality) {
    case 'excellent':
      return 'bg-green-100 text-green-800'
    case 'good':
      return 'bg-blue-100 text-blue-800'
    case 'average':
      return 'bg-yellow-100 text-yellow-800'
    case 'poor':
      return 'bg-orange-100 text-orange-800'
    case 'very_poor':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function getQualityLabel(quality: string): string {
  switch (quality) {
    case 'excellent':
      return 'Excellent'
    case 'good':
      return 'Good'
    case 'average':
      return 'Average'
    case 'poor':
      return 'Poor'
    case 'very_poor':
      return 'Very Poor'
    default:
      return 'Not Rated'
  }
}
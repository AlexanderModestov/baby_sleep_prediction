import { cn } from '@/lib/utils'
import { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  className?: string
}

export default function Input({
  label,
  error,
  className,
  ...props
}: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent',
          error && 'border-red-500 focus:ring-red-500 bg-red-50',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600 font-medium bg-red-50 p-2 rounded border-l-4 border-red-500">{error}</p>
      )}
    </div>
  )
}
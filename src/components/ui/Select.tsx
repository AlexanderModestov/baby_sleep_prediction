import { cn } from '@/lib/utils'
import { SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  className?: string
  options: { value: string; label: string }[]
}

export default function Select({
  label,
  error,
  className,
  options,
  ...props
}: SelectProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        className={cn(
          'w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent bg-white',
          error && 'border-red-500 focus:ring-red-500 bg-red-50',
          className
        )}
        {...props}
      >
        {label && <option value="">Select...</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-600 font-medium bg-red-50 p-2 rounded border-l-4 border-red-500">{error}</p>
      )}
    </div>
  )
}
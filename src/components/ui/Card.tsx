import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export default function Card({ children, className }: CardProps) {
  return (
    <div className={cn(
      'bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow',
      className
    )}>
      {children}
    </div>
  )
}
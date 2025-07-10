import { useState, useEffect } from 'react'
import { Child } from '@/lib/supabase'
import { useChildren } from '@/hooks/useSupabase'
import { useTelegram } from '@/hooks/useTelegram'

interface SwipeableChildSelectorProps {
  childrenList: Child[]
  selectedChild: Child | null
  onChildSelect: (child: Child) => void
  onEditChild: (child: Child) => void
}

export default function SwipeableChildSelector({
  childrenList,
  selectedChild,
  onChildSelect,
  onEditChild
}: SwipeableChildSelectorProps) {
  const { deleteChild } = useChildren()
  const { showAlert, showConfirm, hapticFeedback } = useTelegram()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [startX, setStartX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // Update current index when selected child changes
  useEffect(() => {
    if (selectedChild) {
      const index = childrenList.findIndex(child => child.id === selectedChild.id)
      if (index !== -1) {
        setCurrentIndex(index)
      }
    }
  }, [selectedChild, childrenList])

  // Update selected child when current index changes
  useEffect(() => {
    if (childrenList.length > 0 && childrenList[currentIndex]) {
      onChildSelect(childrenList[currentIndex])
    }
  }, [currentIndex, childrenList, onChildSelect])

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX)
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    
    const currentX = e.touches[0].clientX
    const diffX = startX - currentX
    
    // Add visual feedback during swipe
    const card = e.currentTarget as HTMLElement
    card.style.transform = `translateX(${-diffX}px)`
    card.style.transition = 'none'
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) return
    
    const currentX = e.changedTouches[0].clientX
    const diffX = startX - currentX
    const threshold = 50
    
    const card = e.currentTarget as HTMLElement
    card.style.transform = ''
    card.style.transition = 'transform 0.3s ease'
    
    if (Math.abs(diffX) > threshold) {
      if (diffX > 0 && currentIndex < childrenList.length - 1) {
        // Swipe left - next child
        setCurrentIndex(currentIndex + 1)
        hapticFeedback()
      } else if (diffX < 0 && currentIndex > 0) {
        // Swipe right - previous child
        setCurrentIndex(currentIndex - 1)
        hapticFeedback()
      }
    }
    
    setIsDragging(false)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setStartX(e.clientX)
    setIsDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    
    const currentX = e.clientX
    const diffX = startX - currentX
    
    const card = e.currentTarget as HTMLElement
    card.style.transform = `translateX(${-diffX}px)`
    card.style.transition = 'none'
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) return
    
    const currentX = e.clientX
    const diffX = startX - currentX
    const threshold = 50
    
    const card = e.currentTarget as HTMLElement
    card.style.transform = ''
    card.style.transition = 'transform 0.3s ease'
    
    if (Math.abs(diffX) > threshold) {
      if (diffX > 0 && currentIndex < childrenList.length - 1) {
        setCurrentIndex(currentIndex + 1)
        hapticFeedback()
      } else if (diffX < 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
        hapticFeedback()
      }
    }
    
    setIsDragging(false)
  }

  const handleDelete = async (child: Child) => {
    const confirmed = await showConfirm(
      `Are you sure you want to delete ${child.name}? This will also delete all sleep data for this child.`
    )
    
    if (confirmed) {
      try {
        await deleteChild(child.id)
        hapticFeedback()
        
        // If we deleted the current child, select the next one or previous one
        if (currentIndex >= childrenList.length - 1) {
          setCurrentIndex(Math.max(0, currentIndex - 1))
        }
      } catch {
        showAlert('Failed to delete child. Please try again.')
      }
    }
  }

  const getChildEmoji = (gender: 'male' | 'female') => {
    return gender === 'male' ? '👦' : '👧'
  }

  if (childrenList.length === 0) {
    return null
  }

  const currentChild = childrenList[currentIndex]

  return (
    <div className="relative overflow-hidden">
      <div
        className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-6 cursor-grab active:cursor-grabbing select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-4xl">
              {getChildEmoji(currentChild.gender)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                {currentChild.name}
              </h3>
              <p className="text-sm text-gray-500">
                {new Date(currentChild.date_of_birth).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEditChild(currentChild)}
              className="p-2 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors"
              title="Edit child"
            >
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            
            {childrenList.length > 1 && (
              <button
                onClick={() => handleDelete(currentChild)}
                className="p-2 rounded-full bg-red-100 hover:bg-red-200 transition-colors"
                title="Delete child"
              >
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Swipe indicators */}
      {childrenList.length > 1 && (
        <div className="flex justify-center mt-3 space-x-2">
          {childrenList.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}
      
      {/* Swipe instruction */}
      {childrenList.length > 1 && (
        <p className="text-center text-xs text-gray-500 mt-2">
          Swipe left or right to switch between children
        </p>
      )}
    </div>
  )
}
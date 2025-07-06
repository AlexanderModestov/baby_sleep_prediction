import { useEffect, useState } from 'react'

export function useTelegram() {
  const [user, setUser] = useState<{ id: number; first_name: string } | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Initialize with a default user for web app
    setUser({ id: 123456, first_name: 'User' })
    setIsReady(true)
  }, [])

  const showAlert = (message: string) => {
    alert(message)
  }

  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      resolve(confirm(message))
    })
  }

  const hapticFeedback = (_type: 'light' | 'medium' | 'heavy' = 'light') => {
    // No haptic feedback for web app
    return
  }

  return {
    user,
    isReady,
    showAlert,
    showConfirm,
    hapticFeedback
  }
}
import { useEffect, useState } from 'react'

interface TelegramUser {
  id: number
  first_name: string
  custom_name?: string
}

interface TelegramWebApp {
  ready: () => void
  initDataUnsafe?: {
    user?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
    }
  }
}

interface WindowWithTelegram extends Window {
  Telegram?: {
    WebApp: TelegramWebApp
  }
}

export function useTelegram() {
  const [user, setUser] = useState<TelegramUser | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; onClose: () => void }>({
    isOpen: false,
    message: '',
    onClose: () => {}
  })
  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean; 
    message: string; 
    onConfirm: () => void; 
    onCancel: () => void 
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
    onCancel: () => {}
  })

  useEffect(() => {
    const initializeTelegramUser = async () => {
      // Check if Telegram WebApp is available
      if (typeof window !== 'undefined' && (window as WindowWithTelegram).Telegram?.WebApp) {
        const tg = (window as WindowWithTelegram).Telegram!.WebApp
        tg.ready()
        
        if (tg.initDataUnsafe?.user) {
          const telegramUser = tg.initDataUnsafe.user
          console.log('Telegram user data:', telegramUser)
          
          // Try to fetch additional user data from bot database
          try {
            const apiUrl = `/api/telegram-user?telegram_user_id=${telegramUser.id}`
            console.log('Fetching from:', apiUrl)
            const response = await fetch(apiUrl)
            console.log('API response status:', response.status)
            
            if (response.ok) {
              const userData = await response.json()
              console.log('API user data:', userData)
              const finalUser = {
                id: telegramUser.id,
                first_name: userData.first_name || telegramUser.first_name,
                custom_name: userData.custom_name || userData.first_name || telegramUser.first_name
              }
              console.log('Setting user to:', finalUser)
              setUser(finalUser)
            } else {
              console.log('API failed, using basic Telegram data')
              // Use basic Telegram data if API fails
              const basicUser = {
                id: telegramUser.id,
                first_name: telegramUser.first_name,
                custom_name: telegramUser.first_name
              }
              console.log('Setting user to:', basicUser)
              setUser(basicUser)
            }
          } catch (error) {
            console.warn('Failed to fetch user data from bot database:', error)
            // Use basic Telegram data
            const errorUser = {
              id: telegramUser.id,
              first_name: telegramUser.first_name,
              custom_name: telegramUser.first_name
            }
            console.log('Setting user to (error case):', errorUser)
            setUser(errorUser)
          }
        } else {
          console.log('No Telegram user data in initDataUnsafe')
          // Show message to user that they need to register via bot
          setUser({ id: 0, first_name: 'Unregistered User' })
        }
      } else {
        // Check URL parameters for telegram user data (for testing)
        const urlParams = new URLSearchParams(window.location.search)
        const telegramUserId = urlParams.get('telegram_user_id')
        const customName = urlParams.get('custom_name')
        
        if (telegramUserId) {
          try {
            const response = await fetch(`/api/telegram-user?telegram_user_id=${telegramUserId}`)
            if (response.ok) {
              const userData = await response.json()
              setUser({
                id: parseInt(telegramUserId),
                first_name: userData.first_name || customName || 'User',
                custom_name: userData.custom_name || customName || 'User'
              })
            } else {
              setUser({
                id: parseInt(telegramUserId),
                first_name: customName || 'User',
                custom_name: customName || 'User'
              })
            }
          } catch (error) {
            console.warn('Failed to fetch user data:', error)
            setUser({
              id: parseInt(telegramUserId),
              first_name: customName || 'User',
              custom_name: customName || 'User'
            })
          }
        } else {
          // Fallback for web app without Telegram
          setUser({ id: 123456, first_name: 'Demo User' })
        }
      }
      setIsReady(true)
    }

    initializeTelegramUser()
  }, [])


  const showAlert = (message: string) => {
    setAlertModal({
      isOpen: true,
      message,
      onClose: () => setAlertModal(prev => ({ ...prev, isOpen: false }))
    })
    
    // Auto-hide after 1 second
    setTimeout(() => {
      setAlertModal(prev => ({ ...prev, isOpen: false }))
    }, 1000)
  }

  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmModal({
        isOpen: true,
        message,
        onConfirm: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }))
          resolve(true)
        },
        onCancel: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }))
          resolve(false)
        }
      })
    })
  }

  const hapticFeedback = () => {
    // No haptic feedback for web app
    return
  }

  return {
    user,
    isReady,
    showAlert,
    showConfirm,
    hapticFeedback,
    alertModal,
    confirmModal
  }
}
import { useEffect, useState } from 'react'

export function useTelegram() {
  const [user, setUser] = useState<{ id: number; first_name: string } | null>(null)
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
    // Initialize with a default user for web app
    setUser({ id: 123456, first_name: 'User' })
    setIsReady(true)
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
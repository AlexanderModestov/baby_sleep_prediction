interface TelegramWebApp {
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

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
}

// Get the Supabase user ID for the current Telegram user
export const getUserId = async (): Promise<string> => {
  if (typeof window !== 'undefined') {
    // First try to get Telegram user ID from WebApp
    let telegramUserId: string | null = null
    
    if ((window as WindowWithTelegram).Telegram?.WebApp?.initDataUnsafe?.user?.id) {
      telegramUserId = (window as WindowWithTelegram).Telegram!.WebApp.initDataUnsafe!.user!.id.toString()
    } else {
      // Check URL parameters for telegram_user_id
      const urlParams = new URLSearchParams(window.location.search)
      telegramUserId = urlParams.get('telegram_user_id')
    }
    
    if (telegramUserId) {
      try {
        // Get user data from API which will return the Supabase user ID
        const response = await fetch(`/api/telegram-user?telegram_user_id=${telegramUserId}`)
        if (response.ok) {
          const userData = await response.json()
          if (userData.id) {
            return userData.id // Return Supabase user ID
          }
        }
        
        // If user doesn't exist in database but we have telegram ID, 
        // try to register them with basic Telegram data
        if ((window as WindowWithTelegram).Telegram?.WebApp?.initDataUnsafe?.user) {
          const telegramUser = (window as WindowWithTelegram).Telegram!.WebApp.initDataUnsafe!.user!
          const registeredUserId = await registerTelegramUser(telegramUser)
          if (registeredUserId) {
            return registeredUserId
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }
    
    // Fallback to localStorage for development/testing
    let userId = localStorage.getItem('baby_sleep_user_id')
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem('baby_sleep_user_id', userId)
    }
    return userId
  }
  return 'demo_user'
}

// Get Telegram user data
export const getTelegramUser = (): TelegramUser | null => {
  if (typeof window !== 'undefined' && (window as WindowWithTelegram).Telegram?.WebApp) {
    return (window as WindowWithTelegram).Telegram!.WebApp.initDataUnsafe?.user || null
  }
  return null
}

// Register/update Telegram user in Supabase
export const registerTelegramUser = async (telegramUser: TelegramUser): Promise<string | null> => {
  if (!telegramUser || !telegramUser.id) {
    return null
  }
  
  try {
    const response = await fetch('/api/telegram-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        telegram_user_id: telegramUser.id,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        username: telegramUser.username,
        custom_name: telegramUser.first_name,
      }),
    })
    
    if (response.ok) {
      const result = await response.json()
      return result.user?.id || null
    }
  } catch (error) {
    console.error('Error registering Telegram user:', error)
  }
  
  return null
}
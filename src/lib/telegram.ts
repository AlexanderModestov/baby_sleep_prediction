// Simple user management for web application
export const getUserId = (): string => {
  // For web app, we'll use a static user ID or get it from localStorage
  if (typeof window !== 'undefined') {
    let userId = localStorage.getItem('baby_sleep_user_id')
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem('baby_sleep_user_id', userId)
    }
    return userId
  }
  return 'demo_user'
}
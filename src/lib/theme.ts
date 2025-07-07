export type Theme = 'default' | 'professional' | 'safe'

export function detectRestrictedEnvironment(): boolean {
  // Check if we're in a restricted environment
  if (typeof window === 'undefined') return false
  
  // Check for corporate/enterprise indicators
  const userAgent = navigator.userAgent.toLowerCase()
  const corporateIndicators = [
    'enterprise',
    'corporate',
    'managed',
    'intune',
    'mdm'
  ]
  
  const hasCorporateIndicator = corporateIndicators.some(indicator => 
    userAgent.includes(indicator)
  )
  
  // Check for high contrast mode
  const hasHighContrast = window.matchMedia('(prefers-contrast: high)').matches
  
  // Check for reduced motion (often enabled in corporate environments)
  const hasReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  
  return hasCorporateIndicator || hasHighContrast || hasReducedMotion
}

export function getRecommendedTheme(): Theme {
  if (detectRestrictedEnvironment()) {
    return 'safe'
  }
  
  // Check if user prefers professional colors
  const hour = new Date().getHours()
  const isWorkingHours = hour >= 9 && hour <= 17
  
  if (isWorkingHours) {
    return 'professional'
  }
  
  return 'default'
}

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  
  // Remove existing theme classes
  document.documentElement.removeAttribute('data-theme')
  
  // Apply new theme
  if (theme !== 'default') {
    document.documentElement.setAttribute('data-theme', theme)
  }
  
  // Store user preference
  localStorage.setItem('preferred-theme', theme)
}

export function getStoredTheme(): Theme | null {
  if (typeof localStorage === 'undefined') return null
  
  const stored = localStorage.getItem('preferred-theme')
  if (stored && ['default', 'professional', 'safe'].includes(stored)) {
    return stored as Theme
  }
  
  return null
}

export function initializeTheme() {
  const storedTheme = getStoredTheme()
  const recommendedTheme = getRecommendedTheme()
  
  const themeToApply = storedTheme || recommendedTheme
  applyTheme(themeToApply)
  
  return themeToApply
}
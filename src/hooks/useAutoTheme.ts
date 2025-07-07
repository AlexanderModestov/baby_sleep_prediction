import { useEffect } from 'react'
import { detectRestrictedEnvironment, applyTheme } from '@/lib/theme'

export function useAutoTheme() {
  useEffect(() => {
    const initializeAutoTheme = () => {
      // Check if we're in a restricted environment
      const isRestricted = detectRestrictedEnvironment()
      
      if (isRestricted) {
        // Apply safe theme for restricted environments
        applyTheme('safe')
      } else {
        // Keep default pink theme
        applyTheme('default')
      }
    }

    // Initialize theme on mount
    initializeAutoTheme()

    // Listen for system preference changes
    const mediaQueries = [
      window.matchMedia('(prefers-contrast: high)'),
      window.matchMedia('(prefers-reduced-motion: reduce)')
    ]

    const handleMediaChange = () => {
      initializeAutoTheme()
    }

    mediaQueries.forEach(mq => {
      mq.addEventListener('change', handleMediaChange)
    })

    // Cleanup
    return () => {
      mediaQueries.forEach(mq => {
        mq.removeEventListener('change', handleMediaChange)
      })
    }
  }, [])
}
import { useState, useEffect } from 'react'
import { Theme, applyTheme, getStoredTheme, initializeTheme } from '@/lib/theme'
import Select from './ui/Select'

export default function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState<Theme>('default')

  useEffect(() => {
    const theme = initializeTheme()
    setCurrentTheme(theme)
  }, [])

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = e.target.value as Theme
    setCurrentTheme(newTheme)
    applyTheme(newTheme)
  }

  const themeOptions = [
    { value: 'default', label: '🌸 Default (Pink)' },
    { value: 'professional', label: '💼 Professional (Blue)' },
    { value: 'safe', label: '🔒 Safe Mode (Navy)' }
  ]

  return (
    <div className="mb-4">
      <Select
        label="App Theme"
        value={currentTheme}
        onChange={handleThemeChange}
        options={themeOptions}
      />
      <p className="text-xs text-gray-500 mt-1">
        Use Safe Mode if pink colors are restricted on your device
      </p>
    </div>
  )
}
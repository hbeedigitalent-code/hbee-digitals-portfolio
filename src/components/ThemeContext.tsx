'use client'

import { createContext, useContext, ReactNode } from 'react'

// Simple settings that never change
const defaultSettings = {
  logo_text: 'Hbee Digitals',
  primary_color: '#0A1D37',
  secondary_color: '#FFFFFF',
  navbar_style: 'transparent'
}

// Create context
const ThemeContext = createContext(defaultSettings)

// Simple hook - no error throwing
export const useTheme = () => {
  return useContext(ThemeContext)
}

// Provider component
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Apply colors to document
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--primary-color', defaultSettings.primary_color)
    document.documentElement.style.setProperty('--secondary-color', defaultSettings.secondary_color)
  }

  return (
    <ThemeContext.Provider value={defaultSettings}>
      {children}
    </ThemeContext.Provider>
  )
}
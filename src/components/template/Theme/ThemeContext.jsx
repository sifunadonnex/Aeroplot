'use client'
import { createContext } from 'react'
import { themeConfig } from '@/configs/theme.config'

const ThemeContext = createContext({
    theme: themeConfig,
    setTheme: () => {},
})

export default ThemeContext

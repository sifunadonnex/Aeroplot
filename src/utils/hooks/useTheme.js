'use client'
import { useContext } from 'react'
import ThemeContext from '@/components/template/Theme/ThemeContext'
import { MODE_DARK, MODE_LIGHT } from '@/constants/theme.constant'
import presetThemeSchemaConfig from '@/configs/preset-theme-schema.config'
import applyTheme from '@/utils/applyThemeSchema'

const useTheme = (selector) => {
    const context = useContext(ThemeContext)

    if (context === undefined) {
        throw new Error('useTheme must be used under a ThemeProvider')
    }

    const getThemeState = () => ({
        ...context.theme,
        setSchema: (themeSchema) => {
            context.setTheme((prevTheme) => ({ ...prevTheme, themeSchema }))
            applyTheme(themeSchema, context.theme.mode, presetThemeSchemaConfig)
        },

        setMode: (mode) => {
            context.setTheme((prevTheme) => ({ ...prevTheme, mode }))
            const root = window.document.documentElement
            const isEnabled = mode === MODE_DARK
            root.classList.remove(isEnabled ? MODE_LIGHT : MODE_DARK)
            root.classList.add(isEnabled ? MODE_DARK : MODE_LIGHT)
        },
        setSideNavCollapse: (sideNavCollapse) => {
            context.setTheme((prevTheme) => ({
                ...prevTheme,
                layout: { ...prevTheme.layout, sideNavCollapse },
            }))
        },
        setDirection: (direction) => {
            context.setTheme((prevTheme) => ({ ...prevTheme, direction }))
            const root = window.document.documentElement
            root.setAttribute('dir', direction)
        },
        setPanelExpand: (panelExpand) => {
            context.setTheme((prevTheme) => ({ ...prevTheme, panelExpand }))
        },
        setLayout: (layout) => {
            context.setTheme((prevTheme) => ({
                ...prevTheme,
                layout: { ...prevTheme.layout, type: layout },
            }))
        },
    })

    const themeState = getThemeState()

    return selector(themeState)
}

export default useTheme

'use client'
import { useState } from 'react'
import ThemeContext from './ThemeContext'
import ConfigProvider from '@/components/ui/ConfigProvider'
import appConfig from '@/configs/app.config'
import applyTheme from '@/utils/applyThemeSchema'
import { setTheme as setThemeCookies } from '@/server/actions/theme'
import presetThemeSchemaConfig from '@/configs/preset-theme-schema.config'

const ThemeProvider = ({ children, theme, locale }) => {
    const [themeState, setThemeState] = useState(theme)

    const handleSetTheme = async (payload) => {
        const setTheme = async (theme) => {
            setThemeState(theme)
            await setThemeCookies(JSON.stringify({ state: theme }))
        }

        if (typeof payload === 'function') {
            const nextTheme = payload(themeState)
            await setTheme(nextTheme)
        } else {
            await setTheme(payload)
        }
    }

    return (
        <ThemeContext.Provider
            value={{
                theme: themeState,
                setTheme: handleSetTheme,
            }}
        >
            <ConfigProvider
                value={{
                    ...theme,
                    locale: locale || appConfig.locale,
                }}
            >
                {children}
            </ConfigProvider>
            <script
                suppressHydrationWarning
                dangerouslySetInnerHTML={{
                    __html: `(${applyTheme.toString()})(${JSON.stringify([
                        theme.themeSchema || 'default',
                        theme.mode,
                        presetThemeSchemaConfig,
                    ]).slice(1, -1)})`,
                }}
            />
        </ThemeContext.Provider>
    )
}

export default ThemeProvider

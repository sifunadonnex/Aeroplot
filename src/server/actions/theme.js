'use server'
import { cookies } from 'next/headers'
import { themeConfig } from '@/configs/theme.config'
import { COOKIES_KEY } from '@/constants/app.constant'

export async function getTheme() {
    const cookieStore = await cookies()
    const storedTheme = cookieStore.get(COOKIES_KEY.THEME)?.value

    if (storedTheme) {
        return JSON.parse(storedTheme).state
    }

    return themeConfig
}

export async function setTheme(theme) {
    const cookieStore = await cookies()
    cookieStore.set(COOKIES_KEY.THEME, theme)
}

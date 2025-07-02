const applyTheme = (theme, mode, presetThemeSchemaConfig) => {
    const mapTheme = (variables) => {
        return {
            '--primary': variables.primary || '',
            '--primary-deep': variables.primaryDeep || '',
            '--primary-mild': variables.primaryMild || '',
            '--primary-subtle': variables.primarySubtle || '',
            '--neutral': variables.neutral || '',
        }
    }
    if (presetThemeSchemaConfig[theme][mode]) {
        const themeObject = mapTheme(presetThemeSchemaConfig[theme][mode])
        if (!themeObject) return

        const root = document.documentElement

        Object.keys(themeObject).forEach((property) => {
            if (property === 'name') {
                return
            }

            root.style.setProperty(property, themeObject[property])
        })
    }
}

export default applyTheme

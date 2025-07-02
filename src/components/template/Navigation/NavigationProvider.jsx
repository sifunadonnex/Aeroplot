'use client'
import NavigationContext from './NavigationContext'

const NavigationProvider = ({ navigationTree, children }) => {
    return (
        <NavigationContext.Provider value={{ navigationTree }}>
            {children}
        </NavigationContext.Provider>
    )
}

export default NavigationProvider

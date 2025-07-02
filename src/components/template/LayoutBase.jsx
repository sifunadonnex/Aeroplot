'use client'
import { LayoutContext } from '@/utils/hooks/useLayout'

const LayoutBase = (props) => {
    const {
        children,
        className,
        adaptiveCardActive,
        type,
        pageContainerReassemble,
    } = props

    const contextValue = { adaptiveCardActive, pageContainerReassemble, type }

    return (
        <LayoutContext.Provider value={contextValue}>
            <div className={className}>{children}</div>
        </LayoutContext.Provider>
    )
}

export default LayoutBase

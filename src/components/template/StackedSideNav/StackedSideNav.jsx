import { useState } from 'react'
import {
    SPLITTED_SIDE_NAV_MINI_WIDTH,
    STACKED_SIDE_NAV_SECONDARY_WIDTH,
    DIR_LTR,
    DIR_RTL,
} from '@/constants/theme.constant'
import StackedSideNavMini from './StackedSideNavMini'
import StackedSideNavSecondary from './StackedSideNavSecondary'
import useTheme from '@/utils/hooks/useTheme'
import useCurrentSession from '@/utils/hooks/useCurrentSession'
import appConfig from '@/configs/app.config'
import useNavigation from '@/utils/hooks/useNavigation'
import queryRoute from '@/utils/queryRoute'
import isEmpty from 'lodash/isEmpty'
import useTranslation from '@/utils/hooks/useTranslation'
import { usePathname } from 'next/navigation'

const stackedSideNavDefaultStyle = {
    width: SPLITTED_SIDE_NAV_MINI_WIDTH,
}

const StackedSideNav = ({
    translationSetup = appConfig.activeNavTranslation,
}) => {
    const [selectedMenu, setSelectedMenu] = useState({})
    const [activeKeys, setActiveKeys] = useState([])

    const mode = useTheme((state) => state.mode)
    const direction = useTheme((state) => state.direction)

    const pathname = usePathname()

    const route = queryRoute(pathname)

    const currentRouteKey = route?.key || ''

    const { session } = useCurrentSession()

    const { navigationTree } = useNavigation()

    const translationPlaceholder = (key, fallback) => {
        return fallback || key
    }

    const t = translationSetup ? useTranslation() : translationPlaceholder

    const navColor = (navType, mode) => {
        return `${navType}-${mode}`
    }

    const handleChange = (selected) => {
        setSelectedMenu(selected)
    }

    const handleCollpase = () => {
        setSelectedMenu({})
        setActiveKeys([])
    }

    const handleSetActiveKey = (key) => {
        setActiveKeys(key)
    }

    const stackedSideNavSecondaryDirStyle = () => {
        let style = {}
        const marginValue = `${-STACKED_SIDE_NAV_SECONDARY_WIDTH}px`
        if (direction === DIR_LTR) {
            style = { marginLeft: marginValue }
        }

        if (direction === DIR_RTL) {
            style = { marginRight: marginValue }
        }

        return style
    }

    return (
        <div className="stacked-side-nav hidden lg:flex">
            <StackedSideNavMini
                className={`stacked-side-nav-mini ${navColor('stacked-side-nav-mini', mode)}`}
                style={stackedSideNavDefaultStyle}
                routeKey={currentRouteKey}
                activeKeys={activeKeys}
                mode={mode}
                direction={direction}
                navigationTree={navigationTree}
                userAuthority={session?.user?.authority || []}
                selectedMenu={selectedMenu}
                t={t}
                onChange={handleChange}
                onSetActiveKey={handleSetActiveKey}
            />
            <div
                className={`stacked-side-nav-secondary ${navColor('stacked-side-nav-secondary', mode)}`}
                style={{
                    width: STACKED_SIDE_NAV_SECONDARY_WIDTH,
                    ...(isEmpty(selectedMenu)
                        ? stackedSideNavSecondaryDirStyle()
                        : {}),
                }}
            >
                {!isEmpty(selectedMenu) && (
                    <StackedSideNavSecondary
                        title={t(selectedMenu.translateKey, selectedMenu.title)}
                        menu={selectedMenu.menu}
                        routeKey={currentRouteKey}
                        direction={direction}
                        translationSetup={translationSetup}
                        userAuthority={session?.user?.authority || []}
                        onCollapse={handleCollpase}
                    />
                )}
            </div>
        </div>
    )
}

export default StackedSideNav

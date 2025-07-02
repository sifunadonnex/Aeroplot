import classNames from '@/utils/classNames'
import Link from 'next/link'

const ActionLink = (props) => {
    const { children, className, themeColor = true, href = '', ...rest } = props

    const classNameProps = {
        className: classNames(
            themeColor && 'text-primary',
            'hover:underline',
            className,
        ),
    }

    return (
        <Link href={href} {...classNameProps} {...rest}>
            {children}
        </Link>
    )
}

export default ActionLink

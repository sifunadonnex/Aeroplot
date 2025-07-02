import { useTranslations } from 'next-intl'

export const useTranslation = (namespace) => {
    return useTranslations(namespace)
}

export default useTranslation

'use server'

import { signIn } from '@/auth'
import appConfig from '@/configs/app.config'

const handleOauthSignIn = async (signInMethod, callbackUrl) => {
    await signIn(signInMethod, {
        redirectTo: callbackUrl || appConfig.authenticatedEntryPath,
    })
}

export default handleOauthSignIn

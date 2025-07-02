'use server'
export const onSignUpWithCredentials = async ({ email, userName }) => {
    try {
        /** Pretend create user */
        return {
            email,
            userName,
            id: userName,
        }
    } catch (error) {
        throw error
    }
}

import ApiService from './ApiService'

export async function apiSignUp(data) {
    return ApiService.fetchDataWithAxios({
        url: '/auth/sign-up',
        method: 'post',
        data,
    })
}

export async function apiForgotPassword(data) {
    return ApiService.fetchDataWithAxios({
        url: '/auth/forgot-password',
        method: 'post',
        data,
    })
}

export async function apiResetPassword(data) {
    return ApiService.fetchDataWithAxios({
        url: '/auth/reset-password',
        method: 'post',
        data,
    })
}

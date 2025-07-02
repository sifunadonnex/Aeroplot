import ApiService from './ApiService'

export async function apiGetNotificationCount() {
    return ApiService.fetchDataWithAxios({
        url: '/notifications/count',
        method: 'get',
    })
}

export async function apiGetNotificationList() {
    return ApiService.fetchDataWithAxios({
        url: '/notifications',
        method: 'get',
    })
}

export async function apiGetSearchResult(params) {
    return ApiService.fetchDataWithAxios({
        url: '/search',
        method: 'get',
        params,
    })
}

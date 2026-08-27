import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

import type { AuthTokens } from '@/types/auth'
import { authStorage } from '@/utils/auth'

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

const statusMessages: Record<number, string> = {
  401: '登录状态已失效，请重新登录。',
  403: '当前账号没有执行此操作的权限。',
  404: '请求的资源不存在。',
  409: '该邮箱已经注册。',
  422: '提交的信息不符合接口要求。',
  429: '请求过于频繁，请稍后重试。',
  500: '服务暂时不可用，请稍后重试。',
}

const baseURL = import.meta.env.VITE_API_BASE_URL?.trim() || undefined
const appKey = import.meta.env.VITE_TOKENPORTAL_APP_KEY?.trim()
const clientOptions = {
  baseURL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
}

export const apiClient = axios.create(clientOptions)
const refreshClient = axios.create(clientOptions)
let refreshPromise: Promise<AuthTokens> | null = null

const publicAuthPaths = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/refresh',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/oauth/',
]

function isPublicAuthRequest(url?: string): boolean {
  return publicAuthPaths.some((path) => url?.includes(path))
}

export async function requestTokenRefresh(refreshToken: string): Promise<AuthTokens> {
  const { data } = await refreshClient.post<AuthTokens>('/api/v1/auth/refresh', {
    refresh_token: refreshToken,
  })
  return data
}

function expireSession(): void {
  authStorage.clear()
  window.dispatchEvent(new Event('auth:session-expired'))
}

function normalizeApiError(error: AxiosError): void {
  const status = error.response?.status
  const responseData = error.response?.data
  const detail =
    typeof responseData === 'object' && responseData !== null && 'detail' in responseData
      ? responseData.detail
      : undefined

  if (typeof detail === 'string') error.message = detail
  else if (Array.isArray(detail)) {
    const messages = detail
      .map((item) =>
        typeof item === 'object' && item !== null && 'msg' in item ? String(item.msg) : '',
      )
      .filter(Boolean)
    error.message = messages.join('；') || (status ? statusMessages[status] : '') || error.message
  } else if (status && statusMessages[status]) error.message = statusMessages[status]
  else if (error.code === 'ECONNABORTED') error.message = '请求超时，请检查网络后重试。'
  else if (!error.response) error.message = '无法连接服务，请检查网络或 API 地址。'
}

apiClient.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  if (appKey) config.headers.set('X-App-Key', appKey)
  return config
})

refreshClient.interceptors.request.use((config) => {
  if (appKey) config.headers.set('X-App-Key', appKey)
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status
    const config = error.config as RetriableRequestConfig | undefined
    const refreshToken = authStorage.getRefreshToken()

    if (
      status === 401 &&
      config &&
      !config._retry &&
      refreshToken &&
      !isPublicAuthRequest(config.url)
    ) {
      config._retry = true
      try {
        refreshPromise ??= requestTokenRefresh(refreshToken)
        const tokens = await refreshPromise
        authStorage.replaceTokens(tokens)
        window.dispatchEvent(
          new CustomEvent<AuthTokens>('auth:tokens-refreshed', { detail: tokens }),
        )
        config.headers.set('Authorization', `Bearer ${tokens.access_token}`)
        return await apiClient.request(config)
      } catch {
        expireSession()
      } finally {
        refreshPromise = null
      }
    }

    normalizeApiError(error)
    return Promise.reject(error)
  },
)

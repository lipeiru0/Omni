import { apiClient, requestTokenRefresh } from './client'

import type {
  AuthTokens,
  CurrentUserResponse,
  ForgotPasswordRequest,
  LoginRequest,
  OAuthExchangeRequest,
  OAuthProvider,
  RegisterRequest,
  ResetPasswordRequest,
  SetPasswordRequest,
  User,
} from '@/types/auth'

const oauthBaseURL =
  import.meta.env.VITE_TOKENPORTAL_OAUTH_BASE_URL?.trim() || 'https://api.taotoken.io'
const oauthAppId = import.meta.env.VITE_TOKENPORTAL_APP_ID?.trim()

export async function login(payload: LoginRequest): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>('/api/v1/auth/login', payload)
  return data
}

export async function register(payload: RegisterRequest): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>('/api/v1/auth/register', payload)
  return data
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  return requestTokenRefresh(refreshToken)
}

export function getOAuthAuthorizeUrl(provider: OAuthProvider): string {
  const url = new URL(`/api/v1/oauth/${provider}`, oauthBaseURL)
  if (oauthAppId) url.searchParams.set('app_id', oauthAppId)
  return url.toString()
}

export async function exchangeOAuthCode(payload: OAuthExchangeRequest): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>('/api/v1/oauth/exchange', payload)
  return data
}

export async function forgotPassword(payload: ForgotPasswordRequest): Promise<void> {
  await apiClient.post('/api/v1/auth/forgot-password', payload)
}

export async function resetPassword(payload: ResetPasswordRequest): Promise<void> {
  await apiClient.post('/api/v1/auth/reset-password', payload)
}

export async function setPassword(payload: SetPasswordRequest): Promise<void> {
  await apiClient.post('/api/v1/auth/set-password', payload)
}

export async function getCurrentUser(includeRoles = false): Promise<User> {
  const { data } = await apiClient.get<CurrentUserResponse>('/api/v1/auth/me', {
    params: includeRoles ? { include: 'roles' } : undefined,
  })
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    displayName: data.name || data.email,
    status: data.status,
    emailVerifiedAt: data.email_verified_at,
    platformRole: data.platform_role,
    deletionScheduledAt: data.deletion_scheduled_at,
    isDistributor: data.is_distributor,
    distributorRole: data.distributor_role,
    isSupplier: data.is_supplier,
    supplierStatus: data.supplier_status,
    timezone: data.timezone,
    effectiveTimezone: data.effective_timezone,
  }
}

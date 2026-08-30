import { apiClient, requestTokenRefresh } from './client'

import type {
  AccountDeletionResponse,
  AuthTokens,
  CurrentUserResponse,
  ForgotPasswordRequest,
  LoginRequest,
  OAuthExchangeRequest,
  OAuthAccount,
  OAuthProvider,
  RegisterRequest,
  ResetPasswordRequest,
  SetPasswordRequest,
  TwoFactorDisableRequest,
  TwoFactorEnableResponse,
  TwoFactorSetup,
  TwoFactorStatus,
  UpdateCurrentUserRequest,
  User,
} from '@/types/auth'

const oauthBaseURL =
  import.meta.env.VITE_TOKENPORTAL_OAUTH_BASE_URL?.trim() || window.location.origin
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

function mapCurrentUser(data: CurrentUserResponse): User {
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

export async function getCurrentUser(includeRoles = false): Promise<User> {
  const { data } = await apiClient.get<CurrentUserResponse>('/api/v1/auth/me', {
    params: includeRoles ? { include: 'roles' } : undefined,
  })
  return mapCurrentUser(data)
}

export async function updateCurrentUser(payload: UpdateCurrentUserRequest): Promise<User> {
  const { data } = await apiClient.patch<CurrentUserResponse>('/api/v1/auth/me', payload)
  return mapCurrentUser(data)
}

export async function sendEmailVerification(): Promise<void> {
  await apiClient.post('/api/v1/auth/verify-email/send')
}

export async function confirmEmailVerification(code: string): Promise<void> {
  await apiClient.post('/api/v1/auth/verify-email/confirm', { code })
}

export async function getOAuthAccounts(): Promise<OAuthAccount[]> {
  const { data } = await apiClient.get<OAuthAccount[]>('/api/v1/auth/me/oauth-accounts')
  return data
}

export async function getTwoFactorStatus(): Promise<TwoFactorStatus> {
  const { data } = await apiClient.get<TwoFactorStatus>('/api/v1/auth/2fa/status')
  return data
}

export async function setupTwoFactor(): Promise<TwoFactorSetup> {
  const { data } = await apiClient.post<TwoFactorSetup>('/api/v1/auth/2fa/setup')
  return data
}

export async function enableTwoFactor(code: string): Promise<TwoFactorEnableResponse> {
  const { data } = await apiClient.post<TwoFactorEnableResponse>('/api/v1/auth/2fa/enable', {
    code,
  })
  return data
}

export async function disableTwoFactor(payload: TwoFactorDisableRequest): Promise<void> {
  await apiClient.post('/api/v1/auth/2fa/disable', payload)
}

export async function requestAccountDeletion(): Promise<AccountDeletionResponse> {
  const { data } = await apiClient.post<AccountDeletionResponse>('/api/v1/auth/delete-account', {
    confirmation: 'DELETE',
  })
  return data
}

export async function cancelAccountDeletion(): Promise<void> {
  await apiClient.post('/api/v1/auth/delete-account/cancel')
}

export async function revokeSession(refreshToken?: string): Promise<void> {
  await apiClient.post('/api/v1/auth/logout', refreshToken ? { refresh_token: refreshToken } : {})
}

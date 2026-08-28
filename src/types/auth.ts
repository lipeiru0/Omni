export interface User {
  id?: string
  email: string
  name?: string | null
  displayName?: string
  status?: string
  emailVerifiedAt?: string | null
  platformRole?: string
  deletionScheduledAt?: string | null
  isDistributor?: boolean
  distributorRole?: string | null
  isSupplier?: boolean
  supplierStatus?: string | null
  timezone?: string | null
  effectiveTimezone?: string | null
}

export interface CurrentUserResponse {
  id: string
  email: string
  name?: string | null
  status?: string
  email_verified_at?: string | null
  platform_role?: string
  deletion_scheduled_at?: string | null
  is_distributor?: boolean
  distributor_role?: string | null
  is_supplier?: boolean
  supplier_status?: string | null
  timezone?: string | null
  effective_timezone?: string | null
}

export interface UpdateCurrentUserRequest {
  name?: string
  timezone?: string
}

export interface LoginRequest {
  email: string
  password: string
  totp_code?: string
}

export interface RegisterRequest {
  email: string
  password: string
  name?: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  new_password: string
}

export interface SetPasswordRequest {
  new_password: string
  current_password?: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
}

export type OAuthProvider = 'github' | 'google'

export interface OAuthExchangeRequest {
  code: string
}

export interface OAuthAccount {
  provider: string
  email: string
  created_at: string
}

export interface TwoFactorStatus {
  enabled: boolean
}

export interface TwoFactorSetup {
  secret: string
  provisioning_uri: string
}

export interface TwoFactorEnableResponse {
  backup_codes: string[]
}

export interface TwoFactorDisableRequest {
  password: string
  code: string
}

export interface AccountDeletionResponse {
  status: string
  deletion_scheduled_at: string
  detail: string
}

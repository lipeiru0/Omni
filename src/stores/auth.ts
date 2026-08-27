import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type { AuthTokens, User } from '@/types/auth'
import { authStorage } from '@/utils/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(authStorage.getUser())
  const accessToken = ref<string | null>(authStorage.getAccessToken())
  const refreshToken = ref<string | null>(authStorage.getRefreshToken())
  const isAuthenticated = computed(() => Boolean(accessToken.value))

  function setToken(token: string, persist = true): void {
    accessToken.value = token
    authStorage.setAccessToken(token, persist)
  }

  function setUser(nextUser: User): void {
    user.value = nextUser
    authStorage.setUser(nextUser)
  }

  function setSession(tokens: AuthTokens, nextUser: User, persist = true): void {
    accessToken.value = tokens.access_token
    refreshToken.value = tokens.refresh_token
    user.value = nextUser
    authStorage.setSession(tokens, nextUser, persist)
  }

  function syncTokens(tokens: AuthTokens): void {
    accessToken.value = tokens.access_token
    refreshToken.value = tokens.refresh_token
  }

  function logout(): void {
    user.value = null
    accessToken.value = null
    refreshToken.value = null
    authStorage.clear()
  }

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    setToken,
    setUser,
    setSession,
    syncTokens,
    logout,
  }
})

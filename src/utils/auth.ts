import type { AuthTokens, User } from '@/types/auth'

const ACCESS_TOKEN_KEY = 'omnimind_access_token'
const REFRESH_TOKEN_KEY = 'omnimind_refresh_token'
const USER_KEY = 'omnimind_user'

function read(key: string): string | null {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key)
}

function clearStorage(storage: Storage): void {
  storage.removeItem(ACCESS_TOKEN_KEY)
  storage.removeItem(REFRESH_TOKEN_KEY)
  storage.removeItem(USER_KEY)
}

function getSessionStorage(): Storage {
  return localStorage.getItem(REFRESH_TOKEN_KEY) ? localStorage : sessionStorage
}

export const authStorage = {
  getAccessToken(): string | null {
    return read(ACCESS_TOKEN_KEY)
  },
  getRefreshToken(): string | null {
    return read(REFRESH_TOKEN_KEY)
  },
  getUser(): User | null {
    const rawUser = read(USER_KEY)
    if (!rawUser) return null
    try {
      return JSON.parse(rawUser) as User
    } catch {
      this.clear()
      return null
    }
  },
  setSession(tokens: AuthTokens, user: User, persist: boolean): void {
    this.clear()
    const storage = persist ? localStorage : sessionStorage
    storage.setItem(ACCESS_TOKEN_KEY, tokens.access_token)
    storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
    storage.setItem(USER_KEY, JSON.stringify(user))
  },
  replaceTokens(tokens: AuthTokens): void {
    const storage = getSessionStorage()
    storage.setItem(ACCESS_TOKEN_KEY, tokens.access_token)
    storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
  },
  setUser(user: User): void {
    getSessionStorage().setItem(USER_KEY, JSON.stringify(user))
  },
  setAccessToken(token: string, persist = true): void {
    const storage = persist ? localStorage : sessionStorage
    storage.setItem(ACCESS_TOKEN_KEY, token)
  },
  clear(): void {
    clearStorage(localStorage)
    clearStorage(sessionStorage)
  },
}

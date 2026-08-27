/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_TOKENPORTAL_APP_KEY?: string
  readonly VITE_TOKENPORTAL_APP_ID?: string
  readonly VITE_TOKENPORTAL_OAUTH_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

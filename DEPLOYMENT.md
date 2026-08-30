# Omni 前端与 API 同源部署

## 请求链路

```text
前端 https://omni.1339265985.workers.dev
  -> fetch /api/v1/auth/login
  -> omni Worker 自动添加 X-App-Key
  -> https://api.taotoken.io/api/v1/auth/login
  -> TokenPortal
```

`tokenportal-proxy` 不再参与新请求。确认新链路全部正常后，才能删除旧 Worker。

## Cloudflare Runtime Secret

在 `omni` Worker 的 **Settings -> Variables and Secrets -> Runtime** 中添加：

```text
TOKENPORTAL_PK=创建应用/重置 pk 时取得的完整 pk-
```

它不是 Build 变量，也不要写入任何 `VITE_` 变量。可选地添加
`TOKENPORTAL_API_BASE_URL=https://api.taotoken.io`；未添加时 Worker 已使用该默认值。

## 部署前必须补齐的值

编辑 `.env.production`：

`VITE_TOKENPORTAL_APP_ID`：应用自身的真实 ID，用于 GitHub/Google OAuth 的 `app_id` 参数。它不是 pk 后面的 appKeyId，可从“管理”页面或管理页 URL 取得。

`VITE_API_BASE_URL`、`VITE_TOKENPORTAL_OAUTH_BASE_URL` 和
`VITE_TOKENPORTAL_APP_KEY` 均保持为空。不要把 `pk-`、`ak-` 或 `sk-` 写入
任何 `VITE_` 环境变量。

## 构建与部署

Cloudflare Git 部署使用：

```text
Build command: npm run build
Deploy command: npx wrangler deploy
```

本地预览完整 Worker 链路可执行 `npm run preview:worker`。

## OAuth 回跳

携带真实 `app_id` 发起 OAuth 后，TokenPortal 会根据应用域名回跳：

```text
https://omni.1339265985.workers.dev/auth/oauth-callback?code=一次性code
```

Worker 的 SPA fallback 会把该路径交给 Vue；前端随后同源调用
`/api/v1/oauth/exchange` 换取正式令牌。

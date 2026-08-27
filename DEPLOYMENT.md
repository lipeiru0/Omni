# lucky123.cc.cd 前端接入自定义 API 域名

## 两个地址的职责

- `https://lucky123.cc.cd`：前端站点、浏览器 Origin 和 OAuth 回跳基址。
- `https://api.lucky123.cc.cd`：前端唯一使用的 API 地址，由现有 Worker 转发到 TokenPortal。

请求链路：

```text
前端 https://lucky123.cc.cd
  -> fetch https://api.lucky123.cc.cd/api/v1/auth/login
  -> tokenportal-proxy Worker
  -> https://api.taotoken.io/api/v1/auth/login
  -> TokenPortal
```

## 部署前必须补齐的两个值

编辑 `.env.production`：

1. `VITE_TOKENPORTAL_APP_KEY`：创建应用或重置 pk 时只展示一次的完整 Publishable Key。应用列表中的 `pk-e8639da81c56f212` 是脱敏展示值，不能代替完整 Key。
2. `VITE_TOKENPORTAL_APP_ID`：应用自身的真实 ID，用于 GitHub/Google OAuth 的 `app_id` 参数。它不是 pk 后面的 appKeyId，可从“管理”页面或管理页 URL 取得。

不要把 `ak-` 或 `sk-` 写入任何 `VITE_` 环境变量，它们会被打包进浏览器代码。

## 构建与部署

```bash
npm ci
npm run build
```

将 `dist/` 内容部署到服务器 `/var/www/omnimind`，把 `nginx.conf.example` 中的静态站点配置加入 Nginx，配置 HTTPS 证书后重载 Nginx。前端 Nginx 不承担 API 反向代理。

## OAuth 回跳

携带真实 `app_id` 发起 OAuth 后，TokenPortal 会根据应用域名回跳：

```text
https://lucky123.cc.cd/auth/oauth-callback?code=一次性code
```

Nginx 的 SPA fallback 会把该路径交给 Vue；前端随后调用 `https://api.lucky123.cc.cd/api/v1/oauth/exchange` 换取正式令牌。

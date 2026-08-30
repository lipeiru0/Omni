const DEFAULT_UPSTREAM = 'https://api.taotoken.io'

function createUpstreamUrl(requestUrl, upstreamBaseUrl) {
  const incomingUrl = new URL(requestUrl)
  const upstreamUrl = new URL(incomingUrl.pathname + incomingUrl.search, upstreamBaseUrl)
  return upstreamUrl
}

async function proxyApiRequest(request, env) {
  if (!env.TOKENPORTAL_PK) {
    return Response.json(
      { detail: 'Server is missing the TOKENPORTAL_PK secret.' },
      { status: 500 },
    )
  }

  const upstreamBaseUrl = env.TOKENPORTAL_API_BASE_URL || DEFAULT_UPSTREAM
  const upstreamUrl = createUpstreamUrl(request.url, upstreamBaseUrl)
  const headers = new Headers(request.headers)

  headers.delete('host')
  headers.set('X-App-Key', env.TOKENPORTAL_PK)

  const upstreamRequest = new Request(upstreamUrl, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual',
  })

  return fetch(upstreamRequest)
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      return proxyApiRequest(request, env)
    }

    return env.ASSETS.fetch(request)
  },
}

# wfm-api-client

Community TypeScript/JavaScript wrapper for the [Warframe Market](https://warframe.market) HTTP API.

**Unofficial.** Not affiliated with Warframe Market / 42bytes.

## Install

```bash
pnpm add wfm-api-client
# or
npm install wfm-api-client
```

## Quick start

```ts
import { createWfmApiClient } from 'wfm-api-client'

const client = createWfmApiClient({
  language: 'zh-hans',
  userAgent: 'MyApp/1.0 (+https://example.com)',
})

const items = await client.items.list()
```

Requests use `User-Agent: wfm-api-client (+https://github.com/CloudeaSoft/wfm-api-client)` by default.
Set `userAgent` to identify your application with its name and a repository or contact URL.

## Request plugins

Cross-cutting concerns (cache, rate limiting, etc.) compose on the unified `request` path via onion-style `wrap(next)` plugins:

```text
endpoints.* → request(path, init) → [plugin wraps…] → fetch + envelope parse
```

- **`fetcher`**: transport only (HTTP in/out).
- **`plugins`**: opt-in middleware around the request pipeline (rate limit, memory cache, custom).

With no `plugins` (or an empty array), behavior matches the previous client.

### Registering plugins

Array order is **outer → inner** (first plugin wraps last):

```ts
import {
  createWfmApiClient,
  memoryCachePlugin,
  rateLimitPlugin,
} from 'wfm-api-client'

const client = createWfmApiClient({
  language: 'zh-hans',
  plugins: [
    memoryCachePlugin({ ttl: 60 }),
    rateLimitPlugin({ minTime: 500 }),
  ],
})
```

In this example, cache is outer (can short-circuit without hitting the rate limiter or network); rate limiting is inner (only applies when the cache misses).

### Official plugins

| Plugin | Role |
| --- | --- |
| `rateLimitPlugin({ minTime? })` | Space scheduled request starts (default `minTime: 500` ms). |
| `memoryCachePlugin({ ttl?, maxSize?, keyFor? })` | In-memory success cache for **GET** only. Default `ttl: 60` seconds. Default key: method + URL (incl. query) + language/platform/crossplay. |

Failed requests are not cached; the next call retries through `next` / the fetcher.

### Custom plugins

```ts
import type { WfmPlugin } from 'wfm-api-client'

const logPlugin: WfmPlugin = {
  wrap: next => async (ctx) => {
    console.debug(ctx.url)
    return next(ctx)
  },
}
```

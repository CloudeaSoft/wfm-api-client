import type { RequestContext, WfmApiClientOptions } from './types'
import {
  createAchievementEndpoints,
  createAuthEndpoints,
  createDashboardEndpoints,
  createItemEndpoints,
  createLichEndpoints,
  createManifestEndpoints,
  createOrderEndpoints,
  createRivenEndpoints,
  createSisterEndpoints,
  createToolEndpoints,
  createUserEndpoints,
} from './endpoints'
import { createDefaultFetcher, createRequest } from './transport'

export function createWfmApiClient(options: WfmApiClientOptions = {}): {
  auth: ReturnType<typeof createAuthEndpoints>
  items: ReturnType<typeof createItemEndpoints>
  rivens: ReturnType<typeof createRivenEndpoints>
  orders: ReturnType<typeof createOrderEndpoints>
  users: ReturnType<typeof createUserEndpoints>
  liches: ReturnType<typeof createLichEndpoints>
  sisters: ReturnType<typeof createSisterEndpoints>
  manifests: ReturnType<typeof createManifestEndpoints>
  achievements: ReturnType<typeof createAchievementEndpoints>
  dashboard: ReturnType<typeof createDashboardEndpoints>
  tools: ReturnType<typeof createToolEndpoints>
  setAccessToken: (token: string | undefined) => void
} {
  const state: RequestContext = {
    accessToken: options.accessToken,
    language: options.language,
    platform: options.platform,
    crossplay: options.crossplay,
  }

  const fetcher = options.fetcher ?? createDefaultFetcher(options.timeoutMs)
  const request = createRequest({
    fetcher,
    userAgent: options.userAgent,
    getDefaults: () => state,
    plugins: options.plugins,
  })

  return {
    auth: createAuthEndpoints(request, {
      onTokens(tokens) {
        state.accessToken = tokens.accessToken
      },
      onSignOut() {
        state.accessToken = undefined
      },
    }),
    items: createItemEndpoints(request),
    rivens: createRivenEndpoints(request),
    orders: createOrderEndpoints(request),
    users: createUserEndpoints(request),
    liches: createLichEndpoints(request),
    sisters: createSisterEndpoints(request),
    manifests: createManifestEndpoints(request),
    achievements: createAchievementEndpoints(request),
    dashboard: createDashboardEndpoints(request),
    tools: createToolEndpoints(request),
    setAccessToken(token: string | undefined) {
      state.accessToken = token
    },
  }
}

export type WfmApiClient = ReturnType<typeof createWfmApiClient>

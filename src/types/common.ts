export type WFMLang
  = | 'ko'
    | 'ru'
    | 'de'
    | 'fr'
    | 'pt'
    | 'zh-hans'
    | 'zh-hant'
    | 'es'
    | 'it'
    | 'pl'
    | 'uk'
    | 'tr'
    | 'ja'
    | 'en'

export type Platform = 'pc' | 'ps4' | 'xbox' | 'switch' | 'mobile'

export type OrderType = 'buy' | 'sell'

export type UserStatus = 'invisible' | 'offline' | 'online' | 'ingame'

export type UserRole = 'none' | 'user' | 'moderator' | 'admin'

export type UserTier = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

export type ItemRef = { slug: string } | { itemId: string }

export type UserRef = { slug: string } | { userId: string }

export interface RequestContext {
  accessToken?: string
  language?: WFMLang
  platform?: Platform
  crossplay?: boolean
}

export type CallOptions = RequestContext

export interface WfmRequestContext {
  url: string
  init: WfmRequestInit
  /** Effective request context (client defaults + per-call overrides). */
  context: RequestContext
}

export type WfmRequestNext = (ctx: WfmRequestContext) => Promise<unknown>

export interface WfmPlugin {
  wrap: (next: WfmRequestNext) => WfmRequestNext
}

export interface WfmApiClientOptions extends RequestContext {
  /** Application identification. Defaults to the wfm-api-client name and repository URL. */
  userAgent?: string
  fetcher?: WfmFetcher
  timeoutMs?: number
  /** Onion-style request plugins; array order is outer → inner. */
  plugins?: WfmPlugin[]
}

export interface WfmFetchInput {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: BodyInit | null
  signal?: AbortSignal
}

export interface WfmFetchResult {
  status: number
  ok: boolean
  json: () => Promise<unknown>
  text: () => Promise<string>
}

export type WfmFetcher = (input: WfmFetchInput) => Promise<WfmFetchResult>

export interface WfmRequestInit {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  query?: Record<string, string | number | boolean | undefined | null>
  body?: unknown
  formData?: FormData
  auth?: boolean
  /** Skip Authorization even when an access token is available. */
  omitAuthorization?: boolean
  /** Optional Firebase App Check token (first-party auth flows). */
  appCheckToken?: string
  envelope?: 'v1' | 'v2' | 'none' | 'empty'
  context?: CallOptions
}

export type WfmRequest = <T>(
  url: string,
  init?: WfmRequestInit,
) => Promise<T>

export interface WFMResponse<T> {
  apiVersion?: string
  data: T
  error?: {
    request?: string[]
    inputs?: Record<string, string>
  } | null
}

export interface WFMResponseV1<T> {
  payload: T
}

export interface Auction<T> {
  auctions: T[]
}

export type UploadBody = Blob | ArrayBuffer | Uint8Array

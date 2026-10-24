import type {
  CallOptions,
  RequestContext,
  WfmApiClientOptions,
  WfmFetcher,
  WfmFetchInput,
  WfmFetchResult,
  WfmPlugin,
  WfmRequest,
  WfmRequestInit,
  WfmRequestNext,
  WFMResponse,
  WFMResponseV1,
} from './types'
import { WfmApiError } from './errors'

const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_USER_AGENT = 'wfm-api-client (+https://github.com/CloudeaSoft/wfm-api-client)'

function appendQuery(
  url: string,
  query?: WfmRequestInit['query'],
): string {
  if (!query)
    return url

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null)
      continue
    if (typeof value === 'boolean') {
      if (value)
        params.append(key, 'true')
      continue
    }
    params.append(key, String(value))
  }

  const qs = params.toString()
  if (!qs)
    return url
  return url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`
}

export function mergeContext(
  defaults: RequestContext,
  override?: CallOptions,
): RequestContext {
  return {
    accessToken: override?.accessToken ?? defaults.accessToken,
    language: override?.language ?? defaults.language,
    platform: override?.platform ?? defaults.platform,
    crossplay: override?.crossplay ?? defaults.crossplay,
  }
}

function buildHeaders(
  context: RequestContext,
  init: WfmRequestInit,
  userAgent: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': userAgent,
  }

  if (context.language)
    headers.Language = context.language
  if (context.platform)
    headers.Platform = context.platform
  if (context.crossplay != null)
    headers.Crossplay = String(context.crossplay)
  if (context.accessToken && !init.omitAuthorization)
    headers.Authorization = `Bearer ${context.accessToken}`
  if (init.appCheckToken)
    headers['X-Firebase-AppCheck'] = init.appCheckToken

  return headers
}

function buildBody(init: WfmRequestInit): {
  headers?: Record<string, string>
  body?: BodyInit | null
} {
  if (init.formData)
    return { body: init.formData }
  if (init.body !== undefined) {
    return {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(init.body),
    }
  }
  return {}
}

async function parseEnvelope(
  result: WfmFetchResult,
  envelope: NonNullable<WfmRequestInit['envelope']>,
  url: string,
): Promise<unknown> {
  if (result.status === 204 || envelope === 'empty') {
    if (!result.ok) {
      throw new WfmApiError(`HTTP ${result.status}`, {
        status: result.status,
        url,
      })
    }
    return undefined
  }

  let payload: unknown
  try {
    payload = await result.json()
  }
  catch (cause) {
    if (!result.ok) {
      throw new WfmApiError(`HTTP ${result.status}`, {
        status: result.status,
        url,
        cause,
      })
    }
    throw new WfmApiError('Failed to parse JSON response', {
      status: result.status,
      url,
      cause,
    })
  }

  if (envelope === 'none') {
    if (!result.ok) {
      throw new WfmApiError(`HTTP ${result.status}`, {
        status: result.status,
        url,
      })
    }
    return payload
  }

  if (envelope === 'v1') {
    if (!result.ok) {
      throw new WfmApiError(`HTTP ${result.status}`, {
        status: result.status,
        url,
      })
    }
    return (payload as WFMResponseV1<unknown>).payload
  }

  const v2 = payload as WFMResponse<unknown>
  if (v2.error) {
    throw new WfmApiError(v2.error.request?.[0] ?? `HTTP ${result.status}`, {
      status: result.status,
      url,
      error: v2.error,
    })
  }

  if (!result.ok) {
    throw new WfmApiError(`HTTP ${result.status}`, {
      status: result.status,
      url,
      error: v2.error ?? undefined,
    })
  }

  return v2.data
}

export function createDefaultFetcher(timeoutMs = DEFAULT_TIMEOUT_MS): WfmFetcher {
  return async (input: WfmFetchInput): Promise<WfmFetchResult> => {
    const response = await fetch(input.url, {
      method: input.method,
      headers: input.headers,
      body: input.body,
      signal: input.signal ?? AbortSignal.timeout(timeoutMs),
    })

    return {
      status: response.status,
      ok: response.ok,
      json: async () => response.json() as Promise<unknown>,
      text: async () => response.text(),
    }
  }
}

export function createRequest(options: {
  userAgent?: string
  fetcher: WfmFetcher
  getDefaults: () => RequestContext
  plugins?: WfmPlugin[]
}): WfmRequest {
  const { fetcher, getDefaults, plugins = [], userAgent = DEFAULT_USER_AGENT } = options

  const baseRequest: WfmRequestNext = async (ctx) => {
    const { url: finalUrl, init, context } = ctx
    const envelope = init.envelope ?? 'v2'

    if (init.auth && !context.accessToken) {
      throw new WfmApiError('Missing access token for authenticated request', {
        url: finalUrl,
      })
    }

    const headers = buildHeaders(context, init, userAgent)
    const prepared = buildBody(init)
    Object.assign(headers, prepared.headers)

    let result: WfmFetchResult
    try {
      result = await fetcher({
        url: finalUrl,
        method: init.method ?? 'GET',
        headers,
        body: prepared.body,
      })
    }
    catch (cause) {
      throw new WfmApiError('Network request failed', {
        url: finalUrl,
        cause,
      })
    }

    return parseEnvelope(result, envelope, finalUrl)
  }

  const composed = plugins.reduceRight(
    (next, plugin) => plugin.wrap(next),
    baseRequest,
  )

  return async <T>(url: string, init: WfmRequestInit = {}): Promise<T> => {
    const finalUrl = appendQuery(url, init.query)
    return composed({
      url: finalUrl,
      init,
      context: mergeContext(getDefaults(), init.context),
    }) as Promise<T>
  }
}

export type { WfmApiClientOptions }

import type { WfmFetcher } from '../src'
import { describe, expect, it } from 'vitest'
import { createWfmApiClient, WfmApiError } from '../src'

function jsonFetcher(
  handler: (input: { url: string, method?: string, headers?: Record<string, string>, body?: BodyInit | null }) => unknown,
): WfmFetcher {
  return async (input) => {
    const payload = handler(input)
    return {
      status: 200,
      ok: true,
      json: async () => payload,
      text: async () => JSON.stringify(payload),
    }
  }
}

describe('createWfmApiClient', () => {
  it('lists items from v2 envelope', async () => {
    const calls: string[] = []
    const client = createWfmApiClient({
      language: 'zh-hans',
      fetcher: jsonFetcher(({ url, headers }) => {
        calls.push(url)
        expect(headers?.Language).toBe('zh-hans')
        expect(headers?.['User-Agent']).toBe('wfm-api-client (+https://github.com/CloudeaSoft/wfm-api-client)')
        return { apiVersion: '0.25.0', data: [{ id: '1', slug: 'forma' }], error: null }
      }),
    })

    const items = await client.items.list()
    expect(calls[0]).toContain('/v2/items')
    expect(items).toEqual([{ id: '1', slug: 'forma' }])
  })

  it('sends a configured user agent on v1 and v2 requests through the default fetcher', async () => {
    const originalFetch = globalThis.fetch
    const calls: Headers[] = []
    globalThis.fetch = async (input, init) => {
      calls.push(new Headers(init?.headers))
      return Response.json(String(input).includes('/v1/')
        ? { payload: { statistics_closed: { '90days': [] } } }
        : { data: [] })
    }
    try {
      const client = createWfmApiClient({
        userAgent: 'ExampleApp/1.0 (+https://example.com)',
        language: 'zh-hans',
      })
      expect(await client.items.list()).toEqual([])
      expect(await client.items.getStatistics('forma')).toEqual({ statistics_closed: { '90days': [] } })
      expect(calls).toHaveLength(2)
      for (const headers of calls) {
        expect(headers.get('User-Agent')).toBe('ExampleApp/1.0 (+https://example.com)')
        expect(headers.get('Accept')).toBe('application/json')
        expect(headers.get('Language')).toBe('zh-hans')
      }
    }
    finally {
      globalThis.fetch = originalFetch
    }
  })

  it('throws WfmApiError on envelope error', async () => {
    const client = createWfmApiClient({
      fetcher: jsonFetcher(() => ({
        apiVersion: '0.25.0',
        data: null,
        error: { request: ['app.errors.unauthorized'] },
      })),
    })

    await expect(client.items.list()).rejects.toBeInstanceOf(WfmApiError)
  })

  it('requires access token for authenticated routes', async () => {
    const client = createWfmApiClient({
      fetcher: jsonFetcher(() => ({ apiVersion: '0.25.0', data: [], error: null })),
    })

    await expect(client.orders.listMine()).rejects.toThrow(/access token/i)
  })

  it('creates an order with bearer token', async () => {
    const client = createWfmApiClient({
      accessToken: 'token-1',
      fetcher: jsonFetcher(({ method, headers, body }) => {
        expect(method).toBe('POST')
        expect(headers?.Authorization).toBe('Bearer token-1')
        expect(JSON.parse(String(body))).toMatchObject({ itemId: 'abc', type: 'sell' })
        return {
          apiVersion: '0.25.0',
          data: { id: 'order-1', type: 'sell', platinum: 10, quantity: 1, visible: true, createdAt: '', updatedAt: '' },
          error: null,
        }
      }),
    })

    const order = await client.orders.create({
      itemId: 'abc',
      type: 'sell',
      platinum: 10,
      quantity: 1,
    })
    expect(order.id).toBe('order-1')
  })

  it('allows per-call token override', async () => {
    const client = createWfmApiClient({
      accessToken: 'default',
      fetcher: jsonFetcher(({ headers }) => {
        expect(headers?.Authorization).toBe('Bearer override')
        return {
          apiVersion: '0.25.0',
          data: {
            id: 'me',
            role: 'user',
            tier: 'none',
            subscription: false,
            ingameName: 'x',
            slug: 'x',
            about: '',
            aboutRaw: '',
            reputation: 0,
            masteryRank: 0,
            credits: 0,
            lastSeen: '',
            platform: 'pc',
            crossplay: false,
            locale: 'en',
            theme: 'dark',
            syncLocale: false,
            syncTheme: false,
            verification: false,
            checkCode: '',
            unreadNotifications: 0,
            linkedAccounts: {},
          },
          error: null,
        }
      }),
    })

    await client.users.getMe({ accessToken: 'override' })
  })

  it('unwraps v1 payload for statistics by slug', async () => {
    const calls: string[] = []
    const client = createWfmApiClient({
      fetcher: jsonFetcher(({ url }) => {
        calls.push(url)
        return {
          payload: {
            statistics_closed: { '48hours': [], '90days': [] },
            statistics_live: { '48hours': [], '90days': [] },
          },
        }
      }),
    })

    const stats = await client.items.getStatistics('sicarus_prime_receiver')
    expect(calls[0]).toContain('/v1/items/sicarus_prime_receiver/statistics')
    expect(stats.statistics_closed['48hours']).toEqual([])
  })

  it('unwraps v1 payload for drop sources by slug', async () => {
    const calls: string[] = []
    const relicSource = {
      type: 'relic' as const,
      item: '59a5cd4d5cd9938cfede7043',
      relic: '6054ddba5221e30057500fb5',
      rates: {
        intact: 11,
        exceptional: 13,
        flawless: 17,
        radiant: 20,
      },
      rarity: 'uncommon',
      id: '62d2f23d7515670098198a4d',
    }
    const missionSource = {
      type: 'mission' as const,
      item: '54a74455e779892d5e5156a7',
      location: '62d2eb3d75156700663c8367',
      mission: '62d2f09c751567007abb1988',
      rate: 20,
      rarity: 'uncommon',
      rotation: 'b',
      stage: ['1'],
      id: '62d35249650ea601a7acfed0',
    }
    const npcSource = {
      type: 'npc' as const,
      item: '54a74454e779892d5e515596',
      npc: '62d2f004751567007abb170d',
      rate: 0.33,
      rarity: 'uncommon',
      id: '62d35246650ea601a7acf93c',
    }
    const client = createWfmApiClient({
      fetcher: jsonFetcher(({ url }) => {
        calls.push(url)
        return {
          payload: {
            dropsources: [relicSource, missionSource, npcSource],
          },
        }
      }),
    })

    const sources = await client.items.getDropSources('ballistica_prime_upper_limb')
    expect(calls[0]).toContain('/v1/items/ballistica_prime_upper_limb/dropsources')
    expect(sources).toEqual([relicSource, missionSource, npcSource])
  })

  it('refreshes session without authorization and updates access token', async () => {
    const auths: Array<string | undefined> = []
    const client = createWfmApiClient({
      accessToken: 'stale',
      fetcher: async (input) => {
        auths.push(input.headers?.Authorization)
        if (input.url.includes('/auth/refresh')) {
          return {
            status: 200,
            ok: true,
            json: async () => ({
              apiVersion: '0.25.0',
              data: {
                accessToken: 'fresh',
                refreshToken: 'refresh-2',
                tokenType: 'Bearer',
                expiresIn: 3600,
              },
              error: null,
            }),
            text: async () => '',
          }
        }
        return {
          status: 200,
          ok: true,
          json: async () => ({
            apiVersion: '0.25.0',
            data: {
              id: 'me',
              role: 'user',
              tier: 'none',
              subscription: false,
              ingameName: 'x',
              slug: 'x',
              about: '',
              aboutRaw: '',
              reputation: 0,
              masteryRank: 0,
              credits: 0,
              lastSeen: '',
              platform: 'pc',
              crossplay: false,
              locale: 'en',
              theme: 'dark',
              syncLocale: false,
              syncTheme: false,
              verification: false,
              checkCode: '',
              unreadNotifications: 0,
              linkedAccounts: {},
            },
            error: null,
          }),
          text: async () => '',
        }
      },
    })

    const tokens = await client.auth.refresh({
      grantType: 'refresh_token',
      clientId: 'wfm-0000',
      deviceId: 'device-1',
      refreshToken: 'refresh-1',
    })
    expect(tokens.accessToken).toBe('fresh')
    expect(auths[0]).toBeUndefined()

    await client.users.getMe()
    expect(auths[1]).toBe('Bearer fresh')
  })

  it('sends app check token on refresh when provided', async () => {
    const client = createWfmApiClient({
      fetcher: jsonFetcher(({ headers }) => {
        expect(headers?.['X-Firebase-AppCheck']).toBe('app-check')
        return {
          apiVersion: '0.25.0',
          data: {
            accessToken: 'a',
            refreshToken: 'r',
            tokenType: 'Bearer',
            expiresIn: 1,
          },
          error: null,
        }
      }),
    })

    await client.auth.refresh(
      {
        grantType: 'refresh_token',
        clientId: 'wfm-0000',
        deviceId: 'device-1',
        refreshToken: 'refresh-1',
      },
      { appCheckToken: 'app-check' },
    )
  })

  it('signs out with bearer token and clears stored access token', async () => {
    let seenAuth: string | undefined
    const client = createWfmApiClient({
      accessToken: 'token-1',
      fetcher: async (input) => {
        seenAuth = input.headers?.Authorization
        if (input.url.includes('/auth/signout')) {
          return {
            status: 200,
            ok: true,
            json: async () => {
              throw new Error('empty body')
            },
            text: async () => '',
          }
        }
        return {
          status: 200,
          ok: true,
          json: async () => ({
            apiVersion: '0.25.0',
            data: [],
            error: null,
          }),
          text: async () => '',
        }
      },
    })

    await client.auth.signOut()
    expect(seenAuth).toBe('Bearer token-1')
    await expect(client.orders.listMine()).rejects.toThrow(/access token/i)
  })
})

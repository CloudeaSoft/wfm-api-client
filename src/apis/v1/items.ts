import type { CallOptions, DropSource, StatisticsCollection, WfmRequest } from '../../types'
import { WFM_API_V1 } from '../http'

export function createV1ItemApis(request: WfmRequest): {
  getStatistics: (slug: string, options?: CallOptions) => Promise<StatisticsCollection>
  getDropSources: (slug: string, options?: CallOptions) => Promise<DropSource[]>
} {
  return {
    getStatistics: async (slug, options) =>
      request(`${WFM_API_V1}items/${encodeURIComponent(slug)}/statistics`, {
        envelope: 'v1',
        context: options,
      }),
    getDropSources: async (slug, options) => {
      const payload = await request<{ dropsources: DropSource[] }>(
        `${WFM_API_V1}items/${encodeURIComponent(slug)}/dropsources`,
        {
          envelope: 'v1',
          context: options,
        },
      )
      return payload.dropsources
    },
  }
}

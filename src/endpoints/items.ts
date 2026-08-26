import type { WfmRequest } from '../apis'
import { createV1ItemApis, createV2ItemApis } from '../apis'

export function createItemEndpoints(
  request: WfmRequest,
): ReturnType<typeof createV2ItemApis> & ReturnType<typeof createV1ItemApis> {
  const v1 = createV1ItemApis(request)
  const v2 = createV2ItemApis(request)
  return {
    list: v2.list,
    get: v2.get,
    getSet: v2.getSet,
    getStatistics: v1.getStatistics,
    getDropSources: v1.getDropSources,
  }
}

import type { WFMLang } from './common'

export interface ItemI18N {
  name: string
  description?: string
  wikiLink?: string
  icon: string
  thumb: string
  subIcon?: string
}

export interface Item {
  id: string
  slug: string
  gameRef: string
  tags: string[]
  setRoot?: boolean
  setParts?: string[]
  quantityInSet?: number
  rarity?: string
  bulkTradable?: boolean
  subtypes?: string[]
  maxRank?: number
  maxCharges?: number
  maxAmberStars?: number
  maxCyanStars?: number
  baseEndo?: number
  endoMultiplier?: number
  ducats?: number
  vosfor?: number
  reqMasteryRank?: number
  vaulted?: boolean
  tradingTax?: number
  i18n?: Partial<Record<WFMLang, ItemI18N>>
  tradable?: boolean
}

/** @deprecated Prefer Item — kept for compatibility with older call sites */
export type ItemShort = Item

export interface ClosedStatisticsEntry {
  datetime: string
  volume: number
  min_price: number
  max_price: number
  open_price: number
  closed_price: number
  avg_price: number
  wa_price: number
  median: number
  moving_avg: number
  donch_top: number
  donch_bot: number
  id: string
  mod_rank?: number
}

export interface LiveStatisticsEntry {
  datetime: string
  volume: number
  min_price: number
  max_price: number
  avg_price: number
  wa_price: number
  median: number
  order_type: 'buy' | 'sell'
  moving_avg: number
  id: string
  mod_rank?: number
}

export interface StatisticsCollection {
  statistics_closed: {
    '48hours': ClosedStatisticsEntry[]
    '90days': ClosedStatisticsEntry[]
  }
  statistics_live: {
    '48hours': LiveStatisticsEntry[]
    '90days': LiveStatisticsEntry[]
  }
}

export interface ItemSet {
  id: string
  items: Item[]
}

export interface RelicDropRates {
  intact: number
  exceptional: number
  flawless: number
  radiant: number
}

interface DropSourceBase {
  id: string
  item: string
  rarity: string
}

export interface RelicDropSource extends DropSourceBase {
  type: 'relic'
  relic: string
  rates: RelicDropRates
}

export interface MissionDropSource extends DropSourceBase {
  type: 'mission'
  mission: string
  rate: number
  location?: string
  rotation?: string
  event?: boolean
  modifier?: string
  stage?: string[]
}

export interface NpcDropSource extends DropSourceBase {
  type: 'npc'
  npc: string
  rate: number
}

export type DropSource = RelicDropSource | MissionDropSource | NpcDropSource

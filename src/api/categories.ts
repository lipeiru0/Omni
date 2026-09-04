import { apiClient } from './client'

export interface PublicCategory {
  id: string
  model_id: string | null
  display_name: string | null
  description: string | null
  icon_url: string | null
  context_window: number | null
  display_tier: string | null
  health_score: number | null
  quality_score: number | null
  list_price: number | string | null
  status: string
}

export interface PublicCategoryDetail {
  id: string
  model_id: string | null
  display_name: string | null
  sku_name: string | null
  status: string
  health_score: number | null
  quality_score: number | null
  base_price: number | string | null
  list_price: number | string | null
  created_at?: string | null
  sku_count: number
}

export async function getPublicCategories(): Promise<PublicCategory[]> {
  const { data } = await apiClient.get<PublicCategory[] | { items?: PublicCategory[] }>(
    '/api/v1/categories',
  )
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.items)) return data.items
  throw new Error('Unexpected categories response')
}

export async function getPublicCategory(categoryId: string): Promise<PublicCategoryDetail> {
  const { data } = await apiClient.get<PublicCategoryDetail>(
    `/api/v1/categories/${encodeURIComponent(categoryId)}`,
  )
  return data
}

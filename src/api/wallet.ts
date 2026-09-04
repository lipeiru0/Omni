import { apiClient } from './client'

export interface WalletBalance {
  amount: number | string
  grant?: number | string
  frozen_amount?: number | string
  currency: string
  balance_type: string
}

export interface TopupHistoryItem {
  order_id: string
  amount: number | string
  currency: string
  status: string
  channel: string
  created_at: string
  paid_at?: string | null
}

export interface BalanceTransactionItem {
  id: string
  amount: number | string
  balance_after: number | string
  currency: string
  direction: string
  txn_type: string
  remark?: string | null
  model_display_name?: string | null
  created_at: string
}

export interface GifpayCreateResponse {
  order_id: string
  checkout_url: string
  fields: Record<string, string | number>
}

export async function getWalletBalance(): Promise<WalletBalance> {
  const { data } = await apiClient.get<WalletBalance | string | { data: WalletBalance }>(
    '/api/v1/wallet/balance',
  )
  let payload: unknown = data
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload)
    } catch {
      throw new Error('余额接口返回了无效数据')
    }
  }
  if (payload && typeof payload === 'object' && 'data' in payload) {
    payload = (payload as { data: unknown }).data
  }
  if (!payload || typeof payload !== 'object' || !('amount' in payload)) {
    throw new Error('余额接口缺少 amount 字段')
  }
  return payload as WalletBalance
}

export function getAvailableBalance(balance: WalletBalance): number {
  return (Number(balance.amount) || 0) + (Number(balance.grant) || 0)
}

export async function getTopupHistory(): Promise<TopupHistoryItem[]> {
  const { data } = await apiClient.get<TopupHistoryItem[]>('/api/v1/topup/history/list', {
    params: { limit: 100, offset: 0 },
  })
  return data
}

export async function getBalanceTransactions(): Promise<BalanceTransactionItem[]> {
  const { data } = await apiClient.get<BalanceTransactionItem[]>('/api/v1/balance/transactions', {
    params: { limit: 100, offset: 0 },
  })
  return data
}

export async function createGifpayTopup(payload: {
  amount: number
  pay_method: 'alipay' | 'wxpay'
  idempotency_key: string
}): Promise<GifpayCreateResponse> {
  const { data } = await apiClient.post<GifpayCreateResponse>(
    '/api/v1/topup/gifpay/create',
    payload,
  )
  return data
}

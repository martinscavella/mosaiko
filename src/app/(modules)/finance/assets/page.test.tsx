import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import AssetsPage from './page'

// useAuth transitions from "loading" to "loaded with user" across renders,
// which is exactly the real app flow that triggers the bug: a hook
// (`useCallback` in page.tsx) is declared after two early `return`s guarded by
// `authLoading`/`user`, so the number of hooks called changes between renders.
const authState: { user: { id: string; user_metadata: Record<string, unknown> } | null; loading: boolean } = {
  user: null,
  loading: true,
}
vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
}))

vi.mock('@/lib/financeCache', () => ({
  useFinanceCache: () => ({ data: null, loading: true, error: null, refetch: vi.fn(), isDataStale: false }),
  useAssets: () => ({ assets: [] }),
  useAssetStats: () => ({ totalValue: 0, totalPerformance: 0 }),
  useAssetOperations: () => ({
    createAsset: vi.fn(),
    updateAsset: vi.fn(),
    deleteAsset: vi.fn(),
    updateAssetMarketValue: vi.fn(),
    linkAssetToTransaction: vi.fn(),
    unlinkAssetFromTransaction: vi.fn(),
    recalcAssetQuantity: vi.fn(),
  }),
  useAccounts: () => ({ accounts: [] }),
  useAssetTransactions: () => ({
    assetTransactions: [],
    totalSpentOnAsset: 0,
    totalReceivedFromAsset: 0,
    transactionCount: 0,
    loading: false,
    refetch: vi.fn(),
  }),
  useUnlinkedAssetTransactions: () => ({ unlinkedTransactions: [], refetch: vi.fn() }),
}))

vi.mock('@/components/ModuleLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/components/ui/ModuleHeader', () => ({
  default: () => <div />,
}))
vi.mock('@/components/ui/CacheStatus', () => ({
  default: () => <div />,
}))
vi.mock('@/components/ui/AssetPerformanceChart', () => ({
  default: () => <div />,
}))

describe('AssetsPage', () => {
  it('does not crash when auth resolves from loading to an authenticated user', () => {
    authState.user = null
    authState.loading = true
    const { rerender } = render(<AssetsPage />)

    // Simulates useAuth() resolving on the next render, as it does in the
    // real app once the Supabase session check completes.
    authState.user = { id: 'user-1', user_metadata: {} }
    authState.loading = false

    expect(() => rerender(<AssetsPage />)).not.toThrow()
  })
})

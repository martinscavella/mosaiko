import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

const getUserMock = vi.fn()
const queryChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data: [], error: null }),
}
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: getUserMock },
    from: () => queryChain,
  }),
}))

describe('GET /api/transactions', () => {
  it('returns 401 when there is no authenticated user, without querying the database', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })

    const request = new NextRequest('http://localhost/api/transactions?asset_id=abc')
    const response = await GET(request)

    expect(response.status).toBe(401)
    expect(queryChain.select).not.toHaveBeenCalled()
  })

  it('proceeds to query when a user is authenticated', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const request = new NextRequest('http://localhost/api/transactions?asset_id=abc')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(queryChain.select).toHaveBeenCalled()
  })
})

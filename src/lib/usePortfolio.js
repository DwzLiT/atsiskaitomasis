import { useEffect, useState } from 'react'
import { onPortfolioChanged } from './portfolioEvents'
import { supabase } from './supabase'

const EMPTY = { userId: null, trader: null, positions: [], error: '' }

// RLS limits both queries to the current user, so no trader id is sent.
async function fetchPortfolio() {
  const [traderResult, positionsResult] = await Promise.all([
    supabase.from('traders').select('*').single(),
    supabase.from('positions').select('*, instruments(company, price)'),
  ])

  if (traderResult.error || positionsResult.error) {
    return {
      trader: null,
      positions: [],
      error:
        traderResult.error?.code === 'PGRST116'
          ? 'No trader account found for this user.'
          : 'Could not load your portfolio. Please try again.',
    }
  }

  return {
    trader: traderResult.data,
    positions: positionsResult.data ?? [],
    error: '',
  }
}

// Logged-in trader's row and positions. Reloads when the user changes or
// after a trade (keeps showing the old data while refetching).
export default function usePortfolio(userId) {
  const [state, setState] = useState(EMPTY)

  useEffect(() => {
    if (!supabase || !userId) return undefined

    let cancelled = false
    function load() {
      fetchPortfolio().then((result) => {
        if (!cancelled) setState({ userId, ...result })
      })
    }

    load()
    const unsubscribe = onPortfolioChanged(load)

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [userId])

  async function reload() {
    if (!supabase || !userId) return
    setState(EMPTY)
    const result = await fetchPortfolio()
    setState({ userId, ...result })
  }

  const current = state.userId === userId ? state : EMPTY

  return {
    trader: current.trader,
    positions: current.positions,
    loading: Boolean(supabase && userId) && state.userId !== userId,
    error: current.error,
    reload,
  }
}

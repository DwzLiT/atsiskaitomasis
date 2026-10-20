import { useEffect, useState } from 'react'
import { onPortfolioChanged } from './portfolioEvents'
import { supabase } from './supabase'

const EMPTY = { userId: null, snapshots: [], error: '' }

// RLS limits snapshots to the current user, so no trader id is sent.
async function fetchSnapshots() {
  const { data, error } = await supabase
    .from('portfolio_snapshots')
    .select('cash, positions_value, total_value, created_at')
    .order('created_at', { ascending: true })

  if (error) {
    return { snapshots: [], error: 'Nepavyko įkelti portfelio istorijos. Bandykite dar kartą.' }
  }

  return {
    snapshots: (data ?? []).map((row) => ({
      t: new Date(row.created_at).getTime(),
      cash: Number(row.cash),
      positionsValue: Number(row.positions_value),
      totalValue: Number(row.total_value),
    })),
    error: '',
  }
}

// Logged-in trader's portfolio value history, oldest first. Pass
// `record: true` to save a fresh snapshot first (at most one per hour,
// enforced by the database). Reloads after a trade.
export default function useSnapshots(userId, { record = false } = {}) {
  const [state, setState] = useState(EMPTY)

  useEffect(() => {
    if (!supabase || !userId) return undefined

    let cancelled = false
    function load() {
      fetchSnapshots().then((result) => {
        if (!cancelled) setState({ userId, ...result })
      })
    }

    if (record) {
      // A failed snapshot shouldn't hide the history we already have.
      supabase.rpc('record_snapshot').then(load, load)
    } else {
      load()
    }
    const unsubscribe = onPortfolioChanged(load)

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [userId, record])

  const current = state.userId === userId ? state : EMPTY

  return {
    snapshots: current.snapshots,
    loading: Boolean(supabase && userId) && state.userId !== userId,
    error: current.error,
  }
}

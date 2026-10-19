import { useEffect, useState } from 'react'
import { onPortfolioChanged } from './portfolioEvents'
import { supabase } from './supabase'

const EMPTY = { userId: null, tickets: [], error: '' }

// RLS limits tickets to the current user, so no trader id is sent.
async function fetchTickets() {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false })

  return error
    ? { tickets: [], error: 'Could not load your trade history. Please try again.' }
    : { tickets: data ?? [], error: '' }
}

// Logged-in trader's tickets, newest first. Reloads after a trade.
export default function useTickets(userId) {
  const [state, setState] = useState(EMPTY)

  useEffect(() => {
    if (!supabase || !userId) return undefined

    let cancelled = false
    function load() {
      fetchTickets().then((result) => {
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

  const current = state.userId === userId ? state : EMPTY

  return {
    tickets: current.tickets,
    loading: Boolean(supabase && userId) && state.userId !== userId,
    error: current.error,
  }
}

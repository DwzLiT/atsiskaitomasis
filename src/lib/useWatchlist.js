import { useCallback, useEffect, useState } from 'react'
import { getQuote, searchSymbols } from '../api/alphaVantage'
import { toLithuanianError } from '../utils/errors'
import { refreshQuotes, saveQuote } from './quotes'
import { supabase } from './supabase'

const EMPTY = { userId: null, items: [], error: '' }

// RLS limits the watchlist to the current user, so no trader id is sent.
async function fetchWatchlist() {
  const { data, error } = await supabase
    .from('watchlist')
    .select('symbol, created_at, instruments(company, price, change_percent, updated_at)')
    .order('created_at', { ascending: true })

  if (error) {
    return { items: [], error: 'Nepavyko įkelti stebimų sąrašo. Bandykite dar kartą.' }
  }

  return {
    items: (data ?? []).map((row) => ({
      id: row.symbol,
      symbol: row.symbol,
      company: row.instruments?.company ?? row.symbol,
      price: row.instruments?.price == null ? null : Number(row.instruments.price),
      changePercent:
        row.instruments?.change_percent == null ? null : Number(row.instruments.change_percent),
      updatedAt: row.instruments?.updated_at ?? null,
    })),
    error: '',
  }
}

// Finds a company name for a symbol we haven't stored yet (one extra API call).
async function lookupCompany(symbol) {
  const { data } = await supabase
    .from('instruments')
    .select('company')
    .eq('symbol', symbol)
    .maybeSingle()
  if (data) return null // keep the stored name

  try {
    const matches = await searchSymbols(symbol)
    return matches.find((m) => m.symbol.toUpperCase() === symbol)?.name ?? null
  } catch {
    return null
  }
}

// Logged-in trader's watchlist with prices from the instruments table.
export default function useWatchlist(userId) {
  const [state, setState] = useState(EMPTY)

  const reload = useCallback(async () => {
    if (!supabase || !userId) return
    const result = await fetchWatchlist()
    setState({ userId, ...result })
  }, [userId])

  useEffect(() => {
    if (!supabase || !userId) return undefined

    let cancelled = false
    fetchWatchlist().then((result) => {
      if (!cancelled) setState({ userId, ...result })
    })

    return () => {
      cancelled = true
    }
  }, [userId])

  // Validates the symbol with a live quote, stores the price, then adds it.
  // `company` is optional (known when adding from search results).
  async function add(rawSymbol, company = null) {
    const symbol = rawSymbol.trim().toUpperCase()
    if (!symbol) return
    const quote = await getQuote(symbol)
    const name = company ?? (await lookupCompany(symbol))
    await saveQuote(symbol, name, quote)

    const { error } = await supabase.rpc('add_to_watchlist', { p_symbol: symbol })
    if (error) throw new Error(toLithuanianError(error.message))
    await reload()
  }

  async function remove(symbol) {
    const { error } = await supabase.from('watchlist').delete().eq('symbol', symbol)
    if (error) throw new Error('Nepavyko pašalinti simbolio. Bandykite dar kartą.')
    await reload()
  }

  async function refreshPrices() {
    const items = state.userId === userId ? state.items : []
    try {
      await refreshQuotes(items.map((item) => item.symbol))
    } finally {
      await reload()
    }
  }

  const current = state.userId === userId ? state : EMPTY

  return {
    items: current.items,
    loading: Boolean(supabase && userId) && state.userId !== userId,
    error: current.error,
    add,
    remove,
    refreshPrices,
  }
}

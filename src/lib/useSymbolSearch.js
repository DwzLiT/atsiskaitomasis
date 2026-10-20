import { useEffect, useState } from 'react'
import { searchSymbols } from '../api/alphaVantage'

const DEBOUNCE_MS = 500

// Alpha Vantage SYMBOL_SEARCH for `query`, run ~500 ms after typing stops.
// Shared by the Trade search and the watchlist input.
export default function useSymbolSearch(query) {
  const [search, setSearch] = useState({ query: '', results: [], error: '' })
  const trimmed = query.trim()

  useEffect(() => {
    if (!trimmed) return undefined

    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const results = await searchSymbols(trimmed)
        if (!cancelled) setSearch({ query: trimmed, results, error: '' })
      } catch (err) {
        if (!cancelled) setSearch({ query: trimmed, results: [], error: err.message })
      }
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [trimmed])

  const showResults = trimmed !== '' && search.query === trimmed

  return {
    isSearching: trimmed !== '' && search.query !== trimmed,
    showResults,
    results: showResults ? search.results : [],
    error: showResults ? search.error : '',
  }
}

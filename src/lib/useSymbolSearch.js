import { useEffect, useState } from 'react'
import { ApiError, searchSymbols } from '../api/alphaVantage'
import { searchSavedInstruments } from './instruments'

const DEBOUNCE_MS = 500
const FALLBACK_ERROR_TYPES = new Set(['limit', 'daily_limit', 'network', 'config', 'api'])

// Alpha Vantage SYMBOL_SEARCH for `query`, run ~500 ms after typing stops.
// Shared by the Trade search and the watchlist input.
export default function useSymbolSearch(query) {
  const [search, setSearch] = useState({ query: '', results: [], error: '', fromSaved: false })
  const trimmed = query.trim()

  useEffect(() => {
    if (!trimmed) return undefined

    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const results = await searchSymbols(trimmed)
        if (!cancelled) setSearch({ query: trimmed, results, error: '', fromSaved: false })
      } catch (err) {
        if (cancelled) return

        // Alpha Vantage nepasiekiamas – ieškome anksčiau išsaugotose akcijose
        const canFallback = err instanceof ApiError && FALLBACK_ERROR_TYPES.has(err.type)
        if (canFallback) {
          const saved = await searchSavedInstruments(trimmed)
          if (!cancelled && saved.length > 0) {
            setSearch({ query: trimmed, results: saved, error: '', fromSaved: true })
            return
          }
        }

        if (!cancelled) {
          setSearch({ query: trimmed, results: [], error: err.message, fromSaved: false })
        }
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
    fromSaved: showResults && search.fromSaved,
  }
}

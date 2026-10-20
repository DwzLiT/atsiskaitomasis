import { useEffect, useState } from 'react'
import { searchSymbols } from '../api/alphaVantage'
import { searchDemoStocks } from './demoMarket'
import { searchSavedInstruments } from './instruments'
import { canUseFallback } from './resolveQuote'

const DEBOUNCE_MS = 500

// Alpha Vantage SYMBOL_SEARCH for `query`, run ~500 ms after typing stops.
// If the API is unavailable, falls back to stocks saved in instruments plus
// the built-in demo list (saved ones first, no duplicates).
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

        if (canUseFallback(err)) {
          const saved = await searchSavedInstruments(trimmed)
          const savedSymbols = new Set(saved.map((match) => match.symbol))
          const demo = searchDemoStocks(trimmed).filter((match) => !savedSymbols.has(match.symbol))
          const results = [...saved, ...demo].slice(0, 10)
          if (!cancelled && results.length > 0) {
            setSearch({ query: trimmed, results, error: '', fromSaved: true })
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

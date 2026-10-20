import { useEffect, useState } from 'react'
import { ApiError, searchSymbols } from '../api/alphaVantage'
import { getSavedInstrument, searchSavedInstruments } from './instruments'

const DEBOUNCE_MS = 500
const FALLBACK_ERROR_TYPES = new Set(['limit', 'daily_limit', 'network', 'config', 'api'])

// Duck-typing: Vite HMR kartais sulaužo `instanceof` tarp modulių kopijų.
function canUseSavedResults(err) {
  return (err instanceof ApiError || err?.name === 'ApiError') && FALLBACK_ERROR_TYPES.has(err?.type)
}

// Ieško išsaugotose akcijose; jei nieko – tikslus simbolio įrašas (pvz. AAPL, BRK.B)
async function loadSavedResults(query) {
  const saved = await searchSavedInstruments(query)
  if (saved.length > 0) return saved

  const exact = await getSavedInstrument(query)
  if (!exact) return []
  return [
    {
      symbol: exact.symbol,
      name: exact.company || exact.symbol,
      region: 'Išsaugota',
      currency: 'USD',
      price: exact.price,
      updated_at: exact.updated_at,
      fromSaved: true,
    },
  ]
}

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
        if (canUseSavedResults(err)) {
          const saved = await loadSavedResults(trimmed)
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

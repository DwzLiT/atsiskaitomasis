import { useEffect, useRef, useState } from 'react'
import { getQuote, searchSymbols } from '../api/alphaVantage'
import { supabase } from '../lib/supabase'
import TradeForm from './TradeForm'
import './StockSearch.css'

const DEBOUNCE_MS = 500

// Išsaugo kainą instruments lentelėje. Grąžina pranešimą vartotojui.
async function saveInstrument(symbol, company, price) {
  if (!supabase) return 'Kaina neišsaugota: Supabase nesukonfigūruotas.'

  const { error } = await supabase.rpc('upsert_instrument', {
    p_symbol: symbol,
    p_company: company,
    p_price: price,
  })

  return error
    ? 'Kaina neišsaugota. Ar esate prisijungę?'
    : 'Kaina išsaugota duomenų bazėje.'
}

function StockSearch() {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState({ query: '', results: [], error: '' })
  const [selected, setSelected] = useState(null)
  const [quote, setQuote] = useState(null)
  const [quoteError, setQuoteError] = useState('')
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const latestSymbol = useRef('')

  const trimmed = query.trim()

  // Ieško tik kai vartotojas ~500 ms nebespausdina
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

  const isSearching = trimmed !== '' && search.query !== trimmed
  const showResults = trimmed !== '' && search.query === trimmed

  async function handleSelect(match) {
    latestSymbol.current = match.symbol
    setSelected(match)
    setQuery('')
    setQuote(null)
    setQuoteError('')
    setSaveMessage('')
    setQuoteLoading(true)

    try {
      const result = await getQuote(match.symbol)
      if (latestSymbol.current !== match.symbol) return
      setQuote(result)
      const message = await saveInstrument(match.symbol, match.name, result.price)
      if (latestSymbol.current === match.symbol) setSaveMessage(message)
    } catch (err) {
      if (latestSymbol.current === match.symbol) setQuoteError(err.message)
    } finally {
      if (latestSymbol.current === match.symbol) setQuoteLoading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (showResults && search.results.length > 0) handleSelect(search.results[0])
  }

  const isUp = quote && quote.change >= 0

  return (
    <section className="stock-search">
      <h2>Akcijų paieška</h2>

      <form className="stock-search__form" onSubmit={handleSubmit}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Simbolis arba pavadinimas, pvz. AAPL, Microsoft"
          aria-label="Akcijų paieška"
          autoComplete="off"
        />
      </form>

      {isSearching && <p className="stock-status">Ieškoma...</p>}
      {showResults && search.error && <p className="stock-error">{search.error}</p>}
      {showResults && !search.error && search.results.length === 0 && (
        <p className="stock-status">Nieko nerasta.</p>
      )}

      {showResults && search.results.length > 0 && (
        <ul className="stock-results">
          {search.results.map((match) => (
            <li key={match.symbol}>
              <button type="button" onClick={() => handleSelect(match)}>
                <span className="stock-symbol">{match.symbol}</span>
                <span className="stock-name">{match.name}</span>
                <span className="stock-region">{match.region}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="stock-quote">
          <span className="stock-symbol">{selected.symbol}</span>
          <span className="stock-name">{selected.name}</span>

          {quoteLoading && <span className="stock-status">Kraunama kaina...</span>}
          {quoteError && <p className="stock-error">{quoteError}</p>}

          {quote && (
            <>
              <span className="stock-price">${quote.price.toFixed(2)}</span>
              <span className={isUp ? 'stock-up' : 'stock-down'}>
                {isUp ? '+' : ''}
                {quote.change.toFixed(2)} ({isUp ? '+' : ''}
                {quote.changePercent.toFixed(2)}%)
              </span>
              <span className="stock-date">Paskutinė prekybos diena: {quote.date}</span>
            </>
          )}

          {saveMessage && <span className="stock-date">{saveMessage}</span>}

          {quote && <TradeForm key={quote.symbol} symbol={quote.symbol} price={quote.price} />}
        </div>
      )}
    </section>
  )
}

export default StockSearch

import { useEffect, useRef, useState } from 'react'
import { getQuote } from '../api/alphaVantage'
import { supabase } from '../lib/supabase'
import useAuth from '../lib/useAuth'
import useSymbolSearch from '../lib/useSymbolSearch'
import useWatchlist from '../lib/useWatchlist'
import TradeForm from './TradeForm'
import Button from './ui/Button'
import './StockSearch.css'

// Išsaugo kainą instruments lentelėje. Grąžina pranešimą vartotojui.
async function saveInstrument(symbol, company, quote) {
  if (!supabase) return 'Kaina neišsaugota: Supabase nesukonfigūruotas.'

  const { error } = await supabase.rpc('upsert_instrument', {
    p_symbol: symbol,
    p_company: company,
    p_price: quote.price,
    p_change_percent: quote.changePercent,
  })

  return error
    ? 'Kaina neišsaugota. Ar esate prisijungę?'
    : 'Kaina išsaugota duomenų bazėje.'
}

// Gauna kainą ir ją išsaugo. Grąžina { quote, message }.
async function loadQuote(match) {
  const quote = await getQuote(match.symbol)
  const message = await saveInstrument(match.symbol, match.name, quote)
  return { quote, message }
}

// `initialStock` ({ symbol, company }) opens a stock right away, e.g. from the
// watchlist. `onSelect(symbol)` tells the page which stock is shown.
function StockSearch({ initialStock, onSelect }) {
  const [query, setQuery] = useState('')
  const initialSymbol = initialStock?.symbol ?? ''
  const initialName = initialStock?.company ?? ''
  const [selected, setSelected] = useState(
    initialSymbol ? { symbol: initialSymbol, name: initialName } : null,
  )
  const [quote, setQuote] = useState(null)
  const [quoteError, setQuoteError] = useState('')
  const [quoteLoading, setQuoteLoading] = useState(Boolean(initialSymbol))
  const [saveMessage, setSaveMessage] = useState('')
  const latestSymbol = useRef(initialSymbol)
  const { user } = useAuth()
  const watchlist = useWatchlist(user?.id)
  const [watchMessage, setWatchMessage] = useState('')

  const search = useSymbolSearch(query)
  const { isSearching, showResults } = search

  async function handleSelect(match) {
    latestSymbol.current = match.symbol
    setSelected(match)
    setQuery('')
    setQuote(null)
    setQuoteError('')
    setSaveMessage('')
    setWatchMessage('')
    setQuoteLoading(true)
    onSelect?.(match.symbol)

    try {
      const { quote: result, message } = await loadQuote(match)
      if (latestSymbol.current !== match.symbol) return
      setQuote(result)
      setSaveMessage(message)
    } catch (err) {
      if (latestSymbol.current === match.symbol) setQuoteError(err.message)
    } finally {
      if (latestSymbol.current === match.symbol) setQuoteLoading(false)
    }
  }

  // Atidaro akciją iš karto, jei ji perduota (pvz. iš stebimų sąrašo)
  useEffect(() => {
    if (!initialSymbol) return undefined

    let cancelled = false
    loadQuote({ symbol: initialSymbol, name: initialName })
      .then(({ quote: result, message }) => {
        if (cancelled || latestSymbol.current !== initialSymbol) return
        setQuote(result)
        setSaveMessage(message)
      })
      .catch((err) => {
        if (!cancelled && latestSymbol.current === initialSymbol) setQuoteError(err.message)
      })
      .finally(() => {
        if (!cancelled && latestSymbol.current === initialSymbol) setQuoteLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [initialSymbol, initialName])

  async function handleAddToWatchlist() {
    setWatchMessage('')
    try {
      await watchlist.add(selected.symbol, selected.name || null)
      setWatchMessage('Pridėta prie stebimų.')
    } catch (err) {
      setWatchMessage(err.message)
    }
  }

  const inWatchlist =
    selected && watchlist.items.some((item) => item.symbol === selected.symbol)

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

          {quote && user && (
            <div className="stock-watch">
              <Button
                variant="ghost"
                className="btn--compact"
                disabled={inWatchlist || watchlist.loading}
                onClick={handleAddToWatchlist}
              >
                {inWatchlist ? '★ Stebimų sąraše' : '☆ Pridėti prie stebimų'}
              </Button>
              {watchMessage && <span className="stock-date">{watchMessage}</span>}
            </div>
          )}

          {quote && <TradeForm key={quote.symbol} symbol={quote.symbol} price={quote.price} />}
        </div>
      )}
    </section>
  )
}

export default StockSearch

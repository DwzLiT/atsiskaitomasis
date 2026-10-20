import { useEffect, useRef, useState } from 'react'
import useAuth from '../lib/useAuth'
import { resolveQuote } from '../lib/resolveQuote'
import useSymbolSearch from '../lib/useSymbolSearch'
import useWatchlist from '../lib/useWatchlist'
import TradeForm from './TradeForm'
import Button from './ui/Button'
import './StockSearch.css'

function formatUpdatedAt(value) {
  if (!value) return null
  try {
    return new Intl.DateTimeFormat('lt-LT', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return String(value)
  }
}

// Gauna kainą (Alpha Vantage arba išsaugotą atsarginę). Grąžina { quote, message }.
async function loadQuote(match) {
  const quote = await resolveQuote(match.symbol, { company: match.name })
  return { quote, message: quote.saveMessage ?? '' }
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

  const isUp = quote && quote.change != null && quote.change >= 0
  const hasChange = quote && quote.change != null && quote.changePercent != null
  const updatedLabel = quote ? formatUpdatedAt(quote.updatedAt) : null

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
      {showResults && search.fromSaved && search.results.length > 0 && (
        <p className="stock-status">
          Alpha Vantage nepasiekiamas — rodomos anksčiau išsaugotos akcijos.
        </p>
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

              {quote.source === 'saved' ? (
                <span className="stock-saved-badge">Išsaugota kaina</span>
              ) : null}

              {hasChange ? (
                <span className={isUp ? 'stock-up' : 'stock-down'}>
                  {isUp ? '+' : ''}
                  {quote.change.toFixed(2)} ({isUp ? '+' : ''}
                  {quote.changePercent.toFixed(2)}%)
                </span>
              ) : quote.source === 'saved' ? (
                <span className="stock-status">Pokytis nepasiekiamas (atsarginė kaina)</span>
              ) : null}

              {quote.source === 'live' && quote.date ? (
                <span className="stock-date">Paskutinė prekybos diena: {quote.date}</span>
              ) : null}

              {quote.source === 'saved' ? (
                <span className="stock-date">
                  {updatedLabel
                    ? `Paskutinį kartą atnaujinta: ${updatedLabel}`
                    : 'Paskutinio atnaujinimo data nežinoma'}
                </span>
              ) : null}
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

          {quote && (
            <TradeForm key={`${quote.symbol}-${quote.source}`} symbol={quote.symbol} price={quote.price} />
          )}
        </div>
      )}
    </section>
  )
}

export default StockSearch

import { useEffect, useRef, useState } from 'react'
import { ApiError, searchSymbols } from '../api/alphaVantage'
import { searchSavedInstruments } from '../lib/instruments'
import { resolveQuote } from '../lib/resolveQuote'
import TradeForm from './TradeForm'
import './StockSearch.css'

const DEBOUNCE_MS = 500

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

function StockSearch() {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState({
    query: '',
    results: [],
    error: '',
    fromSaved: false,
  })
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
        if (!cancelled) {
          setSearch({ query: trimmed, results, error: '', fromSaved: false })
        }
      } catch (err) {
        if (cancelled) return

        const canFallback =
          err instanceof ApiError &&
          (err.type === 'limit' ||
            err.type === 'network' ||
            err.type === 'config' ||
            err.type === 'api')

        if (canFallback) {
          const saved = await searchSavedInstruments(trimmed)
          if (!cancelled && saved.length > 0) {
            setSearch({
              query: trimmed,
              results: saved,
              error: '',
              fromSaved: true,
            })
            return
          }
        }

        if (!cancelled) {
          setSearch({
            query: trimmed,
            results: [],
            error: err.message,
            fromSaved: false,
          })
        }
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
      const result = await resolveQuote(match.symbol, { company: match.name })
      if (latestSymbol.current !== match.symbol) return
      setQuote(result)
      if (result.saveMessage) setSaveMessage(result.saveMessage)
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

          {quote && (
            <TradeForm key={`${quote.symbol}-${quote.source}`} symbol={quote.symbol} price={quote.price} />
          )}
        </div>
      )}
    </section>
  )
}

export default StockSearch

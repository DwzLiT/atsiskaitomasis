import { useState } from 'react'
import { getQuote } from '../api/alphaVantage'
import './StockSearch.css'

function StockSearch() {
  const [symbol, setSymbol] = useState('')
  const [quote, setQuote] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = symbol.trim().toUpperCase()

    if (!/^[A-Z0-9.]{1,10}$/.test(trimmed)) {
      setError('Įveskite akcijos simbolį, pvz. AAPL, MSFT, IBM')
      setQuote(null)
      return
    }

    setLoading(true)
    setError('')
    setQuote(null)

    try {
      setQuote(await getQuote(trimmed))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isUp = quote && quote.change >= 0

  return (
    <section className="stock-search">
      <h2>Akcijų paieška</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Simbolis, pvz. AAPL"
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Ieškoma...' : 'Ieškoti'}
        </button>
      </form>

      {error && <p className="stock-error">{error}</p>}

      {quote && (
        <div className="stock-quote">
          <span className="stock-symbol">{quote.symbol}</span>
          <span className="stock-price">${quote.price.toFixed(2)}</span>
          <span className={isUp ? 'stock-up' : 'stock-down'}>
            {isUp ? '+' : ''}
            {quote.change.toFixed(2)} ({quote.changePercent})
          </span>
          <span className="stock-date">Paskutinė prekybos diena: {quote.date}</span>
        </div>
      )}
    </section>
  )
}

export default StockSearch

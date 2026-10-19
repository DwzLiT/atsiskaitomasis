import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ChartPlaceholder from '../components/ui/ChartPlaceholder'
import Input from '../components/ui/Input'
import Table from '../components/ui/Table'

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

const ticketColumns = [
  {
    key: 'side',
    label: 'Side',
    render: (row) => (
      <Badge variant={row.side === 'BUY' ? 'buy' : 'sell'}>{row.side}</Badge>
    ),
  },
  { key: 'symbol', label: 'Symbol' },
  { key: 'quantity', label: 'Qty', align: 'right' },
  {
    key: 'price',
    label: 'Price',
    align: 'right',
    render: (row) => formatMoney(row.price),
  },
  {
    key: 'created_at',
    label: 'Time',
    render: (row) => new Date(row.created_at).toLocaleString(),
  },
]

export default function Trade() {
  const [traders, setTraders] = useState([])
  const [traderId, setTraderId] = useState('')
  const [tickets, setTickets] = useState([])
  const [symbol, setSymbol] = useState('')
  const [quantity, setQuantity] = useState('')
  const [quote, setQuote] = useState(null)
  const [quoteError, setQuoteError] = useState('')
  const [message, setMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const normalizedSymbol = symbol.trim().toUpperCase()
  const trader = traders.find((t) => t.id === traderId)

  const loadTraders = useCallback(async () => {
    const list = await api.traders()
    setTraders(list)
    setTraderId((current) => current || list[0]?.id || '')
  }, [])

  useEffect(() => {
    loadTraders().catch((err) => setMessage({ type: 'error', text: err.message }))
  }, [loadTraders])

  useEffect(() => {
    if (!traderId) return
    api.tickets(traderId).then(setTickets).catch(() => setTickets([]))
  }, [traderId])

  useEffect(() => {
    if (!normalizedSymbol) return
    let cancelled = false
    const timer = setTimeout(() => {
      api
        .quote(normalizedSymbol)
        .then((q) => {
          if (cancelled) return
          setQuote(q)
          setQuoteError('')
        })
        .catch((err) => {
          if (cancelled) return
          setQuote(null)
          setQuoteError(err.message)
        })
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [normalizedSymbol])

  const quoteMatches = quote && quote.symbol === normalizedSymbol
  const qty = Number(quantity)
  const validQty = Number.isInteger(qty) && qty > 0
  const estimate = quoteMatches && validQty ? quote.price * qty : null

  async function submit(side) {
    setSubmitting(true)
    setMessage(null)
    try {
      const ticket = await api.placeTicket({
        trader_id: traderId,
        symbol: normalizedSymbol,
        side,
        quantity: qty,
      })
      setMessage({
        type: 'success',
        text: `${ticket.side} ${ticket.quantity} ${ticket.symbol} @ ${formatMoney(ticket.price)} filled.`,
      })
      setQuantity('')
      const [, latest] = await Promise.all([loadTraders(), api.tickets(traderId)])
      setTickets(latest)
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = Boolean(traderId && quoteMatches && validQty) && !submitting

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Trade</h1>
          <p>Place virtual BUY / SELL order tickets for a stock symbol.</p>
        </div>
        {trader ? <Badge variant="demo">Cash {formatMoney(trader.cash_balance)}</Badge> : null}
      </div>

      <div className="page-grid page-grid--split">
        <Card title="Order ticket">
          <form
            className="trade-form"
            onSubmit={(event) => {
              event.preventDefault()
            }}
          >
            <div className="field">
              <label className="field__label" htmlFor="trader">
                Trader
              </label>
              <select
                id="trader"
                className="field__input"
                value={traderId}
                onChange={(event) => setTraderId(event.target.value)}
              >
                {traders.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              id="symbol"
              name="symbol"
              label="Stock symbol"
              placeholder="e.g. AAPL"
              value={symbol}
              onChange={(event) => setSymbol(event.target.value)}
              autoComplete="off"
            />

            <div className="price-display">
              <span className="price-display__label">Current price</span>
              <span className="price-display__value">
                {quoteMatches ? formatMoney(quote.price) : '—'}
              </span>
              <span className="field__hint">
                {quoteMatches
                  ? quote.company
                  : normalizedSymbol
                    ? quoteError || 'Looking up price…'
                    : 'Enter a symbol to prepare a trade.'}
              </span>
            </div>

            <Input
              id="quantity"
              name="quantity"
              label="Quantity"
              type="number"
              min="1"
              step="1"
              placeholder="0"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              hint={
                estimate != null
                  ? `Estimated value: ${formatMoney(estimate)}`
                  : 'Number of shares to buy or sell.'
              }
            />

            <div className="btn-row">
              <Button
                variant="buy"
                disabled={!canSubmit}
                onClick={() => submit('BUY')}
              >
                BUY
              </Button>
              <Button
                variant="sell"
                disabled={!canSubmit}
                onClick={() => submit('SELL')}
              >
                SELL
              </Button>
            </div>

            {message ? (
              <p className="ui-note" role={message.type === 'error' ? 'alert' : 'status'}>
                {message.text}
              </p>
            ) : null}
          </form>
        </Card>

        <Card title="Price chart">
          <ChartPlaceholder
            title={
              normalizedSymbol
                ? `${normalizedSymbol} price chart`
                : 'Selected symbol price'
            }
            description="Reserved for the selected stock price chart. Charts will be added by the team."
          />
        </Card>
      </div>

      <Card title="Order tickets">
        <Table
          columns={ticketColumns}
          rows={tickets}
          emptyMessage="No tickets yet."
        />
      </Card>
    </div>
  )
}

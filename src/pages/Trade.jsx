import { useCallback, useState } from 'react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ChartPlaceholder from '../components/ui/ChartPlaceholder'
import Input from '../components/ui/Input'
import StatePanel from '../components/ui/StatePanel'
import useResource from '../hooks/useResource'
import { getQuote } from '../services/tradeService'
import { formatMoney } from '../utils/format'

export default function Trade() {
  const [symbol, setSymbol] = useState('')
  const [quantity, setQuantity] = useState('')
  const [lookupSymbol, setLookupSymbol] = useState('')

  const normalizedSymbol = symbol.trim().toUpperCase()
  const hasLookup = Boolean(lookupSymbol)

  const loadQuote = useCallback(() => getQuote(lookupSymbol), [lookupSymbol])
  const quote = useResource(loadQuote, { enabled: hasLookup })

  function handleSymbolBlur() {
    setLookupSymbol(normalizedSymbol)
  }

  function handleSymbolKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      setLookupSymbol(normalizedSymbol)
    }
  }

  function renderPriceDisplay() {
    if (!hasLookup) {
      return (
        <div className="price-display">
          <span className="price-display__label">Current price</span>
          <span className="price-display__value">—</span>
          <span className="field__hint">Enter a symbol to prepare a trade.</span>
        </div>
      )
    }

    if (quote.status === 'loading') {
      return <StatePanel variant="loading" message="Loading quote…" />
    }

    if (quote.status === 'error') {
      return (
        <StatePanel
          variant="error"
          message={quote.error?.message || 'Failed to load quote.'}
          onRetry={quote.reload}
        />
      )
    }

    if (quote.status === 'success' && quote.data) {
      const priceLabel =
        quote.data.price == null
          ? '— · DEMO'
          : formatMoney(quote.data.price)

      return (
        <div className="price-display">
          <span className="price-display__label">Current price</span>
          <span className="price-display__value">{priceLabel}</span>
          <span className="field__hint">
            {quote.data.isDemo
              ? `Price for ${quote.data.symbol} will appear when the market API is connected.`
              : `Quote for ${quote.data.symbol}`}
          </span>
        </div>
      )
    }

    return null
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Trade</h1>
          <p>Place virtual BUY / SELL orders for a stock symbol.</p>
        </div>
        <Badge variant="demo">UI only</Badge>
      </div>

      <div className="page-grid page-grid--split">
        <Card title="Order ticket" action={<Badge variant="demo">DEMO</Badge>}>
          <form
            className="trade-form"
            onSubmit={(event) => {
              event.preventDefault()
              setLookupSymbol(normalizedSymbol)
            }}
          >
            <Input
              id="symbol"
              name="symbol"
              label="Stock symbol"
              placeholder="e.g. AAPL"
              value={symbol}
              onChange={(event) => setSymbol(event.target.value)}
              onBlur={handleSymbolBlur}
              onKeyDown={handleSymbolKeyDown}
              autoComplete="off"
              hint="Press Enter or leave the field to look up (DEMO stub for now)."
            />

            {renderPriceDisplay()}

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
              hint="Number of shares to buy or sell."
            />

            <div className="btn-row">
              <Button
                variant="buy"
                type="button"
                disabled
                title="BUY logic coming soon"
              >
                BUY
              </Button>
              <Button
                variant="sell"
                type="button"
                disabled
                title="SELL logic coming soon"
              >
                SELL
              </Button>
            </div>

            <p className="ui-note">
              BUY / SELL buttons are UI placeholders only. No orders are executed
              and no prices are live.
            </p>
          </form>
        </Card>

        <Card title="Price chart">
          <ChartPlaceholder
            title={
              lookupSymbol || normalizedSymbol
                ? `${lookupSymbol || normalizedSymbol} price chart`
                : 'Selected symbol price'
            }
            description="Reserved for the selected stock price chart. Charts will be added by the team."
          />
        </Card>
      </div>
    </div>
  )
}

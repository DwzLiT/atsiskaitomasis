import { useState } from 'react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ChartPlaceholder from '../components/ui/ChartPlaceholder'
import Input from '../components/ui/Input'
import { isDemo } from '../data/demoData'

export default function Trade() {
  const [symbol, setSymbol] = useState('')
  const [quantity, setQuantity] = useState('')

  const normalizedSymbol = symbol.trim().toUpperCase()

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Trade</h1>
          <p>Place virtual BUY / SELL orders for a stock symbol.</p>
        </div>
        {isDemo ? <Badge variant="demo">UI only</Badge> : null}
      </div>

      <div className="page-grid page-grid--split">
        <Card title="Order ticket" action={<Badge variant="demo">DEMO</Badge>}>
          <form
            className="trade-form"
            onSubmit={(event) => {
              event.preventDefault()
            }}
          >
            <Input
              id="symbol"
              name="symbol"
              label="Stock symbol"
              placeholder="e.g. AAPL"
              value={symbol}
              onChange={(event) => setSymbol(event.target.value)}
              autoComplete="off"
              hint="Symbol lookup will use Alpha Vantage later."
            />

            <div className="price-display">
              <span className="price-display__label">Current price</span>
              <span className="price-display__value">
                {normalizedSymbol ? '— · DEMO' : '—'}
              </span>
              <span className="field__hint">
                {normalizedSymbol
                  ? `Price for ${normalizedSymbol} will appear when the market API is connected.`
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
              hint="Number of shares to buy or sell."
            />

            <div className="btn-row">
              <Button variant="buy" type="button" disabled title="BUY logic coming soon">
                BUY
              </Button>
              <Button variant="sell" type="button" disabled title="SELL logic coming soon">
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
              normalizedSymbol
                ? `${normalizedSymbol} price chart`
                : 'Selected symbol price'
            }
            description="Reserved for the selected stock price chart. Charts will be added by the team."
          />
        </Card>
      </div>
    </div>
  )
}

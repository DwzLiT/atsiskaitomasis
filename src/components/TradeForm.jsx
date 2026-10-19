import { useState } from 'react'
import { notifyPortfolioChanged } from '../lib/portfolioEvents'
import { supabase } from '../lib/supabase'
import useAuth from '../lib/useAuth'
import usePortfolio from '../lib/usePortfolio'
import Button from './ui/Button'
import Input from './ui/Input'

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

// BUY / SELL forma pasirinktai akcijai. Prekybos vykdo place_ticket RPC.
export default function TradeForm({ symbol, price }) {
  const [side, setSide] = useState('BUY')
  const [quantity, setQuantity] = useState('1')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)
  const { user } = useAuth()
  const { trader, positions } = usePortfolio(user?.id)

  const shares = Number(quantity)
  const isValidQuantity = Number.isInteger(shares) && shares > 0
  const estimatedTotal = isValidQuantity ? shares * price : 0
  const owned = Number(positions.find((p) => p.symbol === symbol)?.shares ?? 0)

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage(null)

    if (!supabase || !user) {
      setMessage({ type: 'error', text: 'Prisijunkite, kad galėtumėte prekiauti.' })
      return
    }
    if (!isValidQuantity) {
      setMessage({ type: 'error', text: 'Kiekis turi būti teigiamas sveikasis skaičius.' })
      return
    }

    setSubmitting(true)
    const { error } = await supabase.rpc('place_ticket', {
      p_symbol: symbol,
      p_side: side,
      p_quantity: shares,
    })
    setSubmitting(false)

    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }

    setMessage({
      type: 'success',
      text: `${side === 'BUY' ? 'Nupirkta' : 'Parduota'}: ${shares} × ${symbol}`,
    })
    setQuantity('1')
    notifyPortfolioChanged()
  }

  return (
    <form className="trade-form stock-trade" onSubmit={handleSubmit}>
      <div className="btn-row trade-toggle" role="group" aria-label="Sandorio tipas">
        <Button
          variant={side === 'BUY' ? 'buy' : 'ghost'}
          aria-pressed={side === 'BUY'}
          onClick={() => setSide('BUY')}
        >
          BUY
        </Button>
        <Button
          variant={side === 'SELL' ? 'sell' : 'ghost'}
          aria-pressed={side === 'SELL'}
          onClick={() => setSide('SELL')}
        >
          SELL
        </Button>
      </div>

      <Input
        id="trade-quantity"
        name="quantity"
        label="Kiekis"
        type="number"
        min="1"
        step="1"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        hint={
          user
            ? `Turimi pinigai: ${trader ? formatMoney(Number(trader.cash_balance)) : '…'} · Turite: ${owned} akc.`
            : 'Prisijunkite, kad galėtumėte prekiauti.'
        }
      />

      <div className="price-display">
        <span className="price-display__label">Apytikslė suma</span>
        <span className="price-display__value">{formatMoney(estimatedTotal)}</span>
        <span className="field__hint">
          {formatMoney(price)} × {isValidQuantity ? shares : 0}
        </span>
      </div>

      <Button
        type="submit"
        variant={side === 'BUY' ? 'buy' : 'sell'}
        disabled={submitting || !user}
      >
        {submitting ? 'Vykdoma...' : `${side} ${symbol}`}
      </Button>

      {message && (
        <p className={`auth-message auth-message--${message.type}`} role="alert">
          {message.text}
        </p>
      )}
    </form>
  )
}

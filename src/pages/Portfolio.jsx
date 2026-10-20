import { useState } from 'react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ChartPlaceholder from '../components/ui/ChartPlaceholder'
import Input from '../components/ui/Input'
import StatCard from '../components/ui/StatCard'
import StatePanel from '../components/ui/StatePanel'
import Table from '../components/ui/Table'
import useAuth from '../lib/useAuth'
import usePortfolio from '../lib/usePortfolio'
import { formatChange, formatMoney } from '../utils/format'

function buildPositionRows(positions) {
  return (positions ?? [])
    .filter((position) => Number(position.shares) > 0)
    .map((position) => {
      const shares = Number(position.shares)
      const avgCost = Number(position.avg_cost)
      const rawPrice = position.instruments?.price
      const price =
        rawPrice == null || rawPrice === '' ? null : Number(rawPrice)
      const marketValue =
        price != null && Number.isFinite(price) ? shares * price : null
      const costBasis = shares * avgCost
      const pnl =
        marketValue != null && Number.isFinite(marketValue)
          ? marketValue - costBasis
          : null
      const pnlPercent =
        pnl != null && costBasis > 0 ? (pnl / costBasis) * 100 : null

      return {
        id: `${position.trader_id}-${position.symbol}`,
        symbol: position.symbol,
        company: position.instruments?.company ?? '—',
        shares,
        avgCost,
        price,
        marketValue,
        pnl,
        pnlPercent,
      }
    })
}

function summarizePortfolio(trader, positionRows) {
  const cash = Number(trader?.cash_balance ?? 0)
  const portfolioValue = positionRows.reduce(
    (sum, row) => sum + (row.marketValue ?? 0),
    0,
  )
  const costBasis = positionRows.reduce(
    (sum, row) => sum + row.shares * row.avgCost,
    0,
  )
  const profitLoss = portfolioValue - costBasis
  const profitLossPercent =
    costBasis > 0 ? (profitLoss / costBasis) * 100 : 0
  const totalValue = cash + portfolioValue

  return {
    cash,
    portfolioValue,
    totalValue,
    profitLoss,
    profitLossPercent,
  }
}

export default function Portfolio({ onNavigate }) {
  const { user, loading: authLoading } = useAuth()
  const { trader, positions, loading, error, reload } = usePortfolio(user?.id)

  const [watchlist, setWatchlist] = useState([])
  const [watchSymbol, setWatchSymbol] = useState('')

  const positionRows = buildPositionRows(positions)
  const summary = summarizePortfolio(trader, positionRows)

  const plTone = summary.profitLoss >= 0 ? 'positive' : 'negative'
  const plSign = summary.profitLoss >= 0 ? '+' : ''

  const positionColumns = [
    { key: 'symbol', label: 'Symbol' },
    { key: 'company', label: 'Company' },
    {
      key: 'shares',
      label: 'Shares',
      align: 'right',
      render: (row) => row.shares,
    },
    {
      key: 'avgCost',
      label: 'Avg Cost',
      align: 'right',
      render: (row) => formatMoney(row.avgCost),
    },
    {
      key: 'price',
      label: 'Saved Price',
      align: 'right',
      render: (row) =>
        row.price == null ? (
          <span className="mono">—</span>
        ) : (
          formatMoney(row.price)
        ),
    },
    {
      key: 'marketValue',
      label: 'Market Value',
      align: 'right',
      render: (row) =>
        row.marketValue == null ? '—' : formatMoney(row.marketValue),
    },
    {
      key: 'pnl',
      label: 'P/L',
      align: 'right',
      render: (row) => {
        if (row.pnl == null) return '—'
        const tone = row.pnl >= 0 ? 'positive' : 'negative'
        const sign = row.pnl >= 0 ? '+' : ''
        return (
          <span className={`mono ${tone}`}>
            {sign}
            {formatMoney(row.pnl)}
            {row.pnlPercent != null
              ? ` (${formatChange(row.pnlPercent)})`
              : ''}
          </span>
        )
      },
    },
  ]

  const watchlistColumns = [
    { key: 'symbol', label: 'Symbol' },
    { key: 'company', label: 'Company' },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <Button
          variant="ghost"
          type="button"
          className="btn--compact"
          onClick={() =>
            setWatchlist((prev) => prev.filter((item) => item.id !== row.id))
          }
        >
          Remove
        </Button>
      ),
    },
  ]

  function handleAddToWatchlist(event) {
    event.preventDefault()
    const symbol = watchSymbol.trim().toUpperCase()
    if (!symbol) return
    if (watchlist.some((item) => item.symbol === symbol)) {
      setWatchSymbol('')
      return
    }
    setWatchlist((prev) => [
      ...prev,
      {
        id: `watch-${symbol}-${Date.now()}`,
        symbol,
        company: 'Session only',
      },
    ])
    setWatchSymbol('')
  }

  if (authLoading) {
    return (
      <div className="page">
        <StatePanel variant="loading" message="Checking session…" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Portfolio</h1>
            <p>Your paper-trading cash, holdings, and performance.</p>
          </div>
        </div>
        <Card title="Sign in required">
          <StatePanel
            variant="empty"
            message="Prisijunkite, kad matytumėte savo portfelį. DEMO duomenys čia nerodomi."
          />
          <div className="btn-row" style={{ marginTop: '1rem' }}>
            <Button variant="primary" type="button" onClick={() => onNavigate?.('login')}>
              Log in
            </Button>
            <Button variant="ghost" type="button" onClick={() => onNavigate?.('register')}>
              Register
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Portfolio</h1>
          <p>Live paper-trading data from your Supabase account.</p>
        </div>
        <Badge variant="neutral">Live</Badge>
      </div>

      {loading ? (
        <div className="page-grid page-grid--stats">
          <Card>
            <StatePanel variant="loading" message="Loading portfolio…" />
          </Card>
        </div>
      ) : null}

      {!loading && error ? (
        <Card>
          <StatePanel variant="error" message={error} onRetry={reload} />
        </Card>
      ) : null}

      {!loading && !error && trader ? (
        <>
          <div className="page-grid page-grid--stats">
            <StatCard
              label="Cash Balance"
              value={formatMoney(summary.cash)}
              hint="Available cash"
            />
            <StatCard
              label="Portfolio Value"
              value={formatMoney(summary.portfolioValue)}
              hint="Holdings at saved instrument prices"
            />
            <StatCard
              label="Total Value"
              value={formatMoney(summary.totalValue)}
              hint="Cash + holdings"
            />
            <StatCard
              label="Profit / Loss"
              value={`${plSign}${formatMoney(summary.profitLoss)}`}
              hint={`${plSign}${summary.profitLossPercent.toFixed(2)}% vs cost basis`}
              tone={plTone}
            />
          </div>

          <div className="page-grid page-grid--split">
            <Card title="Positions">
              {positionRows.length === 0 ? (
                <StatePanel
                  variant="empty"
                  message="No open positions yet. Buy shares on the Trade page."
                />
              ) : (
                <Table
                  columns={positionColumns}
                  rows={positionRows}
                  emptyMessage="No open positions yet."
                />
              )}
            </Card>

            <Card title="Portfolio value">
              <ChartPlaceholder
                title="Portfolio value over time"
                description="Reserved for portfolio value chart. Uses saved instrument prices (no live Alpha Vantage calls here)."
              />
            </Card>
          </div>

          <Card
            title="Watchlist"
            action={<Badge variant="demo">Session only</Badge>}
          >
            <form className="watchlist-form" onSubmit={handleAddToWatchlist}>
              <Input
                id="watch-symbol"
                name="watchSymbol"
                label="Stock symbol"
                placeholder="e.g. GOOGL"
                value={watchSymbol}
                onChange={(event) => setWatchSymbol(event.target.value)}
                autoComplete="off"
              />
              <div className="watchlist-form__action">
                <Button variant="primary" type="submit">
                  Add to Watchlist
                </Button>
              </div>
            </form>

            {watchlist.length === 0 ? (
              <StatePanel
                variant="empty"
                message="Watchlist is empty. Add a symbol above."
              />
            ) : (
              <Table
                columns={watchlistColumns}
                rows={watchlist}
                emptyMessage="Watchlist is empty."
              />
            )}

            <p className="ui-note watchlist-note">
              Watchlist is session-only UI and is not saved to Supabase.
            </p>
          </Card>
        </>
      ) : null}
    </div>
  )
}

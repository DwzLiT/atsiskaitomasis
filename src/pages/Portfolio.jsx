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
import useResource from '../hooks/useResource'
import { getWatchlist } from '../services/portfolioService'
import { formatChange, formatMoney } from '../utils/format'

function formatSignedMoney(value) {
  return `${value > 0 ? '+' : ''}${formatMoney(value)}`
}

function formatSignedPercent(value) {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

function toneOf(value) {
  return value > 0 ? 'positive' : value < 0 ? 'negative' : ''
}

// Adds market value and P&L to each position. Falls back to avg cost when
// the instrument has no price yet, so P&L shows as 0 instead of -100%.
function toHoldings(positions) {
  return (positions ?? []).map((position) => {
    const shares = Number(position.shares)
    const avgCost = Number(position.avg_cost)
    const rawPrice = position.instruments?.price
    const price = rawPrice == null ? null : Number(rawPrice)
    const costBasis = shares * avgCost
    const marketValue = shares * (price ?? avgCost)
    const profitLoss = marketValue - costBasis

    return {
      id: position.symbol,
      symbol: position.symbol,
      company: position.instruments?.company ?? '—',
      shares,
      avgCost,
      price,
      costBasis,
      marketValue,
      profitLoss,
      profitLossPercent: costBasis > 0 ? (profitLoss / costBasis) * 100 : 0,
    }
  })
}

const holdingColumns = [
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
    label: 'Price',
    align: 'right',
    render: (row) => (row.price == null ? '—' : formatMoney(row.price)),
  },
  {
    key: 'marketValue',
    label: 'Market Value',
    align: 'right',
    render: (row) => formatMoney(row.marketValue),
  },
  {
    key: 'profitLoss',
    label: 'P&L ($)',
    align: 'right',
    render: (row) => (
      <span className={`mono ${toneOf(row.profitLoss)}`.trim()}>
        {formatSignedMoney(row.profitLoss)}
      </span>
    ),
  },
  {
    key: 'profitLossPercent',
    label: 'P&L (%)',
    align: 'right',
    render: (row) => (
      <span className={`mono ${toneOf(row.profitLoss)}`.trim()}>
        {formatSignedPercent(row.profitLossPercent)}
      </span>
    ),
  },
]

export default function Portfolio() {
  const { user, loading: authLoading } = useAuth()
  const { trader, positions, loading, error, reload } = usePortfolio(user?.id)
  const watchlistResource = useResource(getWatchlist)

  /** Local UI-only edits; null means show server/DEMO payload as-is. */
  const [watchlistOverride, setWatchlistOverride] = useState(null)
  const [watchSymbol, setWatchSymbol] = useState('')

  const holdings = toHoldings(positions)
  const cash = Number(trader?.cash_balance ?? 0)
  const portfolioValue = holdings.reduce((sum, row) => sum + row.marketValue, 0)
  const totalCost = holdings.reduce((sum, row) => sum + row.costBasis, 0)
  const totalValue = cash + portfolioValue
  const totalProfitLoss = portfolioValue - totalCost
  const totalProfitLossPercent =
    totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0
  const isLoading = authLoading || loading

  const watchlist =
    watchlistOverride ??
    (watchlistResource.status === 'success'
      ? watchlistResource.data.items
      : [])

  function handleAddToWatchlist(event) {
    event.preventDefault()
    const symbol = watchSymbol.trim().toUpperCase()
    if (!symbol) return
    if (watchlist.some((item) => item.symbol === symbol)) {
      setWatchSymbol('')
      return
    }

    setWatchlistOverride([
      ...watchlist,
      {
        id: `demo-watch-${symbol.toLowerCase()}-${Date.now()}`,
        symbol,
        company: 'DEMO · Pending',
        price: null,
        changePercent: null,
      },
    ])
    setWatchSymbol('')
  }

  function handleRemoveFromWatchlist(id) {
    setWatchlistOverride(watchlist.filter((item) => item.id !== id))
  }

  function handleRetryWatchlist() {
    setWatchlistOverride(null)
    watchlistResource.reload()
  }

  const watchlistColumns = [
    { key: 'symbol', label: 'Symbol' },
    { key: 'company', label: 'Company' },
    {
      key: 'price',
      label: 'Price',
      align: 'right',
      render: (row) =>
        row.price == null ? '— · DEMO' : formatMoney(row.price),
    },
    {
      key: 'changePercent',
      label: 'Change (%)',
      align: 'right',
      render: (row) => {
        if (row.changePercent == null) {
          return <span className="mono">— · DEMO</span>
        }
        return (
          <span className={`mono ${toneOf(row.changePercent)}`.trim()}>
            {formatChange(row.changePercent)}
          </span>
        )
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <Button
          variant="ghost"
          type="button"
          className="btn--compact"
          onClick={() => handleRemoveFromWatchlist(row.id)}
          title="UI-only remove — not saved to a database"
        >
          Remove
        </Button>
      ),
    },
  ]

  function renderHoldingsBody() {
    if (isLoading) {
      return <StatePanel variant="loading" message="Loading positions…" />
    }
    if (error) {
      return (
        <StatePanel
          variant="error"
          message={typeof error === 'string' ? error : 'Failed to load positions.'}
          onRetry={reload}
        />
      )
    }
    if (holdings.length === 0) {
      return <StatePanel variant="empty" message="No positions yet." />
    }
    return (
      <Table
        columns={holdingColumns}
        rows={holdings}
        emptyMessage="No positions yet."
      />
    )
  }

  function renderWatchlistBody() {
    if (watchlistResource.status === 'loading') {
      return <StatePanel variant="loading" message="Loading watchlist…" />
    }
    if (watchlistResource.status === 'error') {
      return (
        <StatePanel
          variant="error"
          message={
            watchlistResource.error?.message || 'Failed to load watchlist.'
          }
          onRetry={handleRetryWatchlist}
        />
      )
    }
    if (watchlistResource.status === 'success' && watchlist.length === 0) {
      return (
        <StatePanel
          variant="empty"
          message="Watchlist is empty. Add a symbol above."
        />
      )
    }
    if (watchlistResource.status === 'success') {
      return (
        <Table
          columns={watchlistColumns}
          rows={watchlist}
          emptyMessage="Watchlist is empty. Add a symbol above."
        />
      )
    }
    return null
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Portfolio</h1>
          <p>Virtual balance, holdings, and portfolio overview.</p>
        </div>
      </div>

      {!authLoading && !user ? (
        <p className="auth-message auth-message--error" role="alert">
          Log in to see your portfolio.
        </p>
      ) : null}

      <div className="page-grid page-grid--stats page-grid--stats-4">
        <StatCard
          label="Cash"
          value={isLoading ? '…' : formatMoney(cash)}
          hint="Available to trade"
        />
        <StatCard
          label="Portfolio Value"
          value={isLoading ? '…' : formatMoney(portfolioValue)}
          hint="Market value of positions"
        />
        <StatCard
          label="Total Value"
          value={isLoading ? '…' : formatMoney(totalValue)}
          hint="Cash + positions"
        />
        <StatCard
          label="Total P&L"
          value={isLoading ? '…' : formatSignedMoney(totalProfitLoss)}
          hint={
            isLoading
              ? 'Unrealized, on positions held'
              : `${formatSignedPercent(totalProfitLossPercent)} on cost · unrealized`
          }
          tone={isLoading ? undefined : toneOf(totalProfitLoss)}
        />
      </div>

      <Card title="Positions">{renderHoldingsBody()}</Card>

      <Card title="Portfolio value">
        <ChartPlaceholder
          title="Portfolio value over time"
          description="Reserved for portfolio value chart. Charts will be added by the team."
        />
      </Card>

      <Card
        title="Watchlist"
        action={
          watchlistResource.data?.isDemo ? (
            <Badge variant="demo">DEMO · UI only</Badge>
          ) : null
        }
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
            disabled={watchlistResource.status !== 'success'}
          />
          <div className="watchlist-form__action">
            <Button
              variant="primary"
              type="submit"
              disabled={watchlistResource.status !== 'success'}
            >
              Add to Watchlist
            </Button>
          </div>
        </form>

        {renderWatchlistBody()}

        <p className="ui-note watchlist-note">
          Add / Remove are UI-only. Changes stay in this session and are not
          saved to a database. Prices are DEMO stubs, not live market data.
        </p>
      </Card>
    </div>
  )
}
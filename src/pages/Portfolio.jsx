import { useState } from 'react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ChartPlaceholder from '../components/ui/ChartPlaceholder'
import Input from '../components/ui/Input'
import StatCard from '../components/ui/StatCard'
import StatePanel from '../components/ui/StatePanel'
import Table from '../components/ui/Table'
import useResource from '../hooks/useResource'
import {
  getHoldings,
  getPortfolioSummary,
  getWatchlist,
} from '../services/portfolioService'
import { formatChange, formatMoney } from '../utils/format'

const holdingColumns = [
  { key: 'symbol', label: 'Symbol' },
  { key: 'traders', label: 'Traders' },
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
    key: 'marketValue',
    label: 'Market Value',
    align: 'right',
    render: (row) => formatMoney(row.marketValue),
  },
]

export default function Portfolio() {
  const summary = useResource(getPortfolioSummary)
  const holdings = useResource(getHoldings)
  const watchlistResource = useResource(getWatchlist)

  /** Local UI-only edits; null means show server/DEMO payload as-is. */
  const [watchlistOverride, setWatchlistOverride] = useState(null)
  const [watchSymbol, setWatchSymbol] = useState('')

  const watchlist =
    watchlistOverride ??
    (watchlistResource.status === 'success'
      ? watchlistResource.data.items
      : [])

  const showDemoBadge = summary.data?.isDemo || holdings.data?.isDemo

  const pl = summary.data?.profitLoss ?? 0
  const plTone = pl >= 0 ? 'positive' : 'negative'
  const plSign = pl >= 0 ? '+' : ''

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
        const tone =
          row.changePercent > 0
            ? 'positive'
            : row.changePercent < 0
              ? 'negative'
              : ''
        return (
          <span className={`mono ${tone}`.trim()}>
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
    if (holdings.status === 'loading') {
      return <StatePanel variant="loading" message="Loading holdings…" />
    }
    if (holdings.status === 'error') {
      return (
        <StatePanel
          variant="error"
          message={holdings.error?.message || 'Failed to load holdings.'}
          onRetry={holdings.reload}
        />
      )
    }
    if (holdings.status === 'success' && holdings.data?.items.length === 0) {
      return (
        <StatePanel variant="empty" message="No holdings yet." />
      )
    }
    if (holdings.status === 'success') {
      return (
        <Table
          columns={holdingColumns}
          rows={holdings.data.items}
          emptyMessage="No holdings yet."
        />
      )
    }
    return null
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
        {showDemoBadge ? <Badge variant="demo">DEMO data</Badge> : null}
      </div>

      <div className="page-grid page-grid--stats">
        {summary.status === 'loading' ? (
          <>
            <Card>
              <StatePanel variant="loading" message="Loading balance…" />
            </Card>
            <Card>
              <StatePanel variant="loading" message="Loading value…" />
            </Card>
            <Card>
              <StatePanel variant="loading" message="Loading P/L…" />
            </Card>
          </>
        ) : null}

        {summary.status === 'error' ? (
          <Card>
            <StatePanel
              variant="error"
              message={
                summary.error?.message || 'Failed to load portfolio summary.'
              }
              onRetry={summary.reload}
            />
          </Card>
        ) : null}

        {summary.status === 'success' && summary.data ? (
          <>
            <StatCard
              label="Virtual Balance"
              value={formatMoney(summary.data.cash)}
              hint={`Available cash across ${summary.data.traderCount} trader${summary.data.traderCount === 1 ? '' : 's'}`}
              isDemo={summary.data.isDemo}
            />
            <StatCard
              label="Portfolio Value"
              value={formatMoney(summary.data.portfolioValue)}
              hint="Cash + holdings at current prices"
              isDemo={summary.data.isDemo}
            />
            <StatCard
              label="Profit / Loss"
              value={`${plSign}${formatMoney(summary.data.profitLoss)}`}
              hint={`${plSign}${summary.data.profitLossPercent}% unrealized vs cost basis`}
              tone={plTone}
              isDemo={summary.data.isDemo}
            />
          </>
        ) : null}
      </div>

      <div className="page-grid page-grid--split">
        <Card
          title="Holdings"
          action={
            holdings.data?.isDemo ? <Badge variant="demo">DEMO</Badge> : null
          }
        >
          {renderHoldingsBody()}
        </Card>

        <Card title="Portfolio value">
          <ChartPlaceholder
            title="Portfolio value over time"
            description="Reserved for portfolio value chart. Charts will be added by the team."
          />
        </Card>
      </div>

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

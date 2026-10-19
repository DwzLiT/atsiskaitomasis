import { useState } from 'react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ChartPlaceholder from '../components/ui/ChartPlaceholder'
import Input from '../components/ui/Input'
import StatCard from '../components/ui/StatCard'
import Table from '../components/ui/Table'
import {
  demoBalance,
  demoHoldings,
  demoWatchlist,
  isDemo,
} from '../data/demoData'

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function formatChange(changePercent) {
  if (changePercent == null) return '— · DEMO'
  const sign = changePercent > 0 ? '+' : ''
  return `${sign}${changePercent.toFixed(2)}%`
}

const holdingColumns = [
  { key: 'symbol', label: 'Symbol' },
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
  const [watchlist, setWatchlist] = useState(demoWatchlist)
  const [watchSymbol, setWatchSymbol] = useState('')

  const plTone = demoBalance.profitLoss >= 0 ? 'positive' : 'negative'
  const plSign = demoBalance.profitLoss >= 0 ? '+' : ''

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
    setWatchlist((prev) => prev.filter((item) => item.id !== id))
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

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Portfolio</h1>
          <p>Virtual balance, holdings, and portfolio overview.</p>
        </div>
        {isDemo ? <Badge variant="demo">DEMO data</Badge> : null}
      </div>

      <div className="page-grid page-grid--stats">
        <StatCard
          label="Virtual Balance"
          value={formatMoney(demoBalance.cash)}
          hint="Available cash (paper trading)"
          isDemo={isDemo}
        />
        <StatCard
          label="Portfolio Value"
          value={formatMoney(demoBalance.portfolioValue)}
          hint="Cash + holdings (DEMO)"
          isDemo={isDemo}
        />
        <StatCard
          label="Profit / Loss"
          value={`${plSign}${formatMoney(demoBalance.profitLoss)}`}
          hint={`${plSign}${demoBalance.profitLossPercent}% vs starting capital`}
          tone={plTone}
          isDemo={isDemo}
        />
      </div>

      <div className="page-grid page-grid--split">
        <Card
          title="Holdings"
          action={isDemo ? <Badge variant="demo">DEMO</Badge> : null}
        >
          <Table
            columns={holdingColumns}
            rows={demoHoldings}
            emptyMessage="No holdings yet."
          />
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
        action={isDemo ? <Badge variant="demo">DEMO · UI only</Badge> : null}
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

        <Table
          columns={watchlistColumns}
          rows={watchlist}
          emptyMessage="Watchlist is empty. Add a symbol above."
        />

        <p className="ui-note watchlist-note">
          Add / Remove are UI-only. Changes stay in this session and are not
          saved to a database. Prices are DEMO stubs, not live market data.
        </p>
      </Card>
    </div>
  )
}

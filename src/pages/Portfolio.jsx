import { useState } from 'react'
import PortfolioValueChart from '../components/charts/PortfolioValueChart'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import StatCard from '../components/ui/StatCard'
import StatePanel from '../components/ui/StatePanel'
import Table from '../components/ui/Table'
import useAuth from '../lib/useAuth'
import { notifyPortfolioChanged } from '../lib/portfolioEvents'
import usePortfolio from '../lib/usePortfolio'
import { refreshQuotes } from '../lib/quotes'
import { supabase } from '../lib/supabase'
import useSnapshots from '../lib/useSnapshots'
import Watchlist from '../components/Watchlist'
import { formatDateTime, formatMoney, formatSignedMoney } from '../utils/format'

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
      updatedAt: position.instruments?.updated_at ?? null,
    }
  })
}

const holdingColumns = [
  { key: 'symbol', label: 'Simbolis' },
  { key: 'company', label: 'Įmonė' },
  {
    key: 'shares',
    label: 'Kiekis',
    align: 'right',
    render: (row) => row.shares,
  },
  {
    key: 'avgCost',
    label: 'Vid. kaina',
    align: 'right',
    render: (row) => formatMoney(row.avgCost),
  },
  {
    key: 'price',
    label: 'Kaina',
    align: 'right',
    render: (row) => (row.price == null ? '—' : formatMoney(row.price)),
  },
  {
    key: 'marketValue',
    label: 'Rinkos vertė',
    align: 'right',
    render: (row) => formatMoney(row.marketValue),
  },
  {
    key: 'profitLoss',
    label: 'P/N ($)',
    align: 'right',
    render: (row) => (
      <span className={`mono ${toneOf(row.profitLoss)}`.trim()}>
        {formatSignedMoney(row.profitLoss)}
      </span>
    ),
  },
  {
    key: 'profitLossPercent',
    label: 'P/N (%)',
    align: 'right',
    render: (row) => (
      <span className={`mono ${toneOf(row.profitLoss)}`.trim()}>
        {formatSignedPercent(row.profitLossPercent)}
      </span>
    ),
  },
]

export default function Portfolio({ onNavigate }) {
  const { user, loading: authLoading } = useAuth()
  const { trader, positions, loading, error, reload } = usePortfolio(user?.id)
  const history = useSnapshots(user?.id, { record: true })
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState(null)

  const holdings = toHoldings(positions)
  const cash = Number(trader?.cash_balance ?? 0)
  const portfolioValue = holdings.reduce((sum, row) => sum + row.marketValue, 0)
  const totalCost = holdings.reduce((sum, row) => sum + row.costBasis, 0)
  const totalValue = cash + portfolioValue
  const totalProfitLoss = portfolioValue - totalCost
  const totalProfitLossPercent =
    totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0
  const isLoading = authLoading || loading

  // The oldest price among positions, so "updated" is never overstated.
  const pricesUpdatedAt = holdings
    .map((row) => row.updatedAt)
    .filter(Boolean)
    .sort()[0]

  // Fetches fresh quotes for every position, then reloads cash, positions and
  // the charts. A snapshot is saved too (at most one per hour, see the DB).
  async function handleRefreshPrices() {
    setRefreshing(true)
    setRefreshMessage(null)
    try {
      const text = await refreshQuotes(holdings.map((row) => row.symbol))
      await supabase.rpc('record_snapshot')
      setRefreshMessage({ type: 'success', text })
    } catch (err) {
      setRefreshMessage({ type: 'error', text: err.message })
    } finally {
      setRefreshing(false)
      notifyPortfolioChanged()
    }
  }

  function renderHoldingsBody() {
    if (isLoading) {
      return <StatePanel variant="loading" message="Kraunamos pozicijos…" />
    }
    if (error) {
      return (
        <StatePanel
          variant="error"
          message={typeof error === 'string' ? error : 'Nepavyko įkelti pozicijų.'}
          onRetry={reload}
        />
      )
    }
    if (holdings.length === 0) {
      return <StatePanel variant="empty" message="Pozicijų dar nėra." />
    }
    return (
      <Table
        columns={holdingColumns}
        rows={holdings}
        emptyMessage="Pozicijų dar nėra."
      />
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Portfelis</h1>
          <p>Virtualus balansas, turimos akcijos ir portfelio apžvalga.</p>
        </div>
      </div>

      {!authLoading && !user ? (
        <p className="auth-message auth-message--error" role="alert">
          Prisijunkite, kad matytumėte savo portfelį.
        </p>
      ) : null}

      <div className="page-grid page-grid--stats page-grid--stats-4">
        <StatCard
          label="Pinigai"
          value={isLoading ? '…' : formatMoney(cash)}
          hint="Galima prekiauti"
        />
        <StatCard
          label="Portfelio vertė"
          value={isLoading ? '…' : formatMoney(portfolioValue)}
          hint="Pozicijų rinkos vertė"
        />
        <StatCard
          label="Bendra vertė"
          value={isLoading ? '…' : formatMoney(totalValue)}
          hint="Pinigai + pozicijos"
        />
        <StatCard
          label="Bendras pelnas / nuostolis"
          value={isLoading ? '…' : formatSignedMoney(totalProfitLoss)}
          hint={
            isLoading
              ? 'Nerealizuotas, turimų pozicijų'
              : `${formatSignedPercent(totalProfitLossPercent)} nuo kainos · nerealizuotas`
          }
          tone={isLoading ? undefined : toneOf(totalProfitLoss)}
        />
      </div>

      <Card
        title="Pozicijos"
        action={
          user && holdings.length > 0 ? (
            <div className="card-action">
              <span className="card-action__meta">
                Kainos atnaujintos: {formatDateTime(pricesUpdatedAt)}
              </span>
              <Button
                variant="ghost"
                className="btn--compact"
                disabled={refreshing}
                onClick={handleRefreshPrices}
              >
                {refreshing ? 'Atnaujinama…' : 'Atnaujinti kainas'}
              </Button>
            </div>
          ) : null
        }
      >
        {refreshMessage ? (
          <p className={`auth-message auth-message--${refreshMessage.type}`} role="alert">
            {refreshMessage.text}
          </p>
        ) : null}
        {renderHoldingsBody()}
      </Card>

      <PortfolioValueChart
        user={user}
        snapshots={history.snapshots}
        loading={isLoading || history.loading}
        error={history.error}
        currentValue={isLoading || error ? null : totalValue}
      />

      <Watchlist
        user={user}
        onOpen={(symbol, company) => onNavigate('trade', { symbol, company })}
      />
    </div>
  )
}
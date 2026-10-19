import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import ChartPlaceholder from '../components/ui/ChartPlaceholder'
import StatCard from '../components/ui/StatCard'
import Table from '../components/ui/Table'
import { demoBalance, demoHoldings, isDemo } from '../data/demoData'

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
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
  const plTone = demoBalance.profitLoss >= 0 ? 'positive' : 'negative'
  const plSign = demoBalance.profitLoss >= 0 ? '+' : ''

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
        <Card title="Holdings" action={isDemo ? <Badge variant="demo">DEMO</Badge> : null}>
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
    </div>
  )
}

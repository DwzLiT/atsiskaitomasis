import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import ChartPlaceholder from '../components/ui/ChartPlaceholder'
import Table from '../components/ui/Table'
import { demoTransactions, isDemo } from '../data/demoData'

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

const transactionColumns = [
  {
    key: 'type',
    label: 'Type',
    render: (row) => (
      <Badge variant={row.type === 'BUY' ? 'buy' : 'sell'}>{row.type}</Badge>
    ),
  },
  { key: 'symbol', label: 'Symbol' },
  {
    key: 'quantity',
    label: 'Quantity',
    align: 'right',
    render: (row) => row.quantity,
  },
  {
    key: 'price',
    label: 'Price',
    align: 'right',
    render: (row) => formatMoney(row.price),
  },
  { key: 'date', label: 'Date' },
]

export default function History() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>History / Stats</h1>
          <p>Past paper trades and performance overview.</p>
        </div>
        {isDemo ? <Badge variant="demo">DEMO data</Badge> : null}
      </div>

      <div className="page-grid page-grid--split">
        <Card
          title="Transaction history"
          action={isDemo ? <Badge variant="demo">DEMO</Badge> : null}
        >
          <Table
            columns={transactionColumns}
            rows={demoTransactions}
            emptyMessage="No transactions yet."
          />
        </Card>

        <Card title="Performance">
          <ChartPlaceholder
            title="Profit & Loss"
            description="Reserved for P/L performance chart. Charts will be added by the team."
          />
        </Card>
      </div>
    </div>
  )
}

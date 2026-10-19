import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import ChartPlaceholder from '../components/ui/ChartPlaceholder'
import Table from '../components/ui/Table'
import useAuth from '../lib/useAuth'
import useTickets from '../lib/useTickets'

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

const transactionColumns = [
  {
    key: 'side',
    label: 'Type',
    render: (row) => (
      <Badge variant={row.side === 'BUY' ? 'buy' : 'sell'}>{row.side}</Badge>
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
    render: (row) => formatMoney(Number(row.price)),
  },
  {
    key: 'total',
    label: 'Total',
    align: 'right',
    render: (row) => formatMoney(Number(row.price) * Number(row.quantity)),
  },
  { key: 'status', label: 'Status' },
  {
    key: 'created_at',
    label: 'Date',
    render: (row) => new Date(row.created_at).toLocaleString(),
  },
]

export default function History() {
  const { user, loading: authLoading } = useAuth()
  const { tickets, loading, error } = useTickets(user?.id)
  const isLoading = authLoading || loading

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>History / Stats</h1>
          <p>Past paper trades and performance overview.</p>
        </div>
      </div>

      {!authLoading && !user ? (
        <p className="auth-message auth-message--error" role="alert">
          Log in to see your trade history.
        </p>
      ) : null}

      {error ? (
        <p className="auth-message auth-message--error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="page-grid page-grid--split">
        <Card title="Transaction history">
          <Table
            columns={transactionColumns}
            rows={isLoading ? [] : tickets}
            emptyMessage={isLoading ? 'Loading trades…' : 'No trades yet.'}
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

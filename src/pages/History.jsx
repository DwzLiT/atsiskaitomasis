import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import ChartPlaceholder from '../components/ui/ChartPlaceholder'
import StatePanel from '../components/ui/StatePanel'
import Table from '../components/ui/Table'
import useAuth from '../lib/useAuth'
import useTickets from '../lib/useTickets'
import { formatMoney } from '../utils/format'

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

  function renderTransactionsBody() {
    if (isLoading) {
      return <StatePanel variant="loading" message="Loading transactions…" />
    }
    if (error) {
      return (
        <StatePanel
          variant="error"
          message={typeof error === 'string' ? error : 'Failed to load transactions.'}
        />
      )
    }
    if (!tickets || tickets.length === 0) {
      return <StatePanel variant="empty" message="No transactions yet." />
    }
    return (
      <Table
        columns={transactionColumns}
        rows={tickets}
        emptyMessage="No transactions yet."
      />
    )
  }

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

      <div className="page-grid page-grid--split">
        <Card title="Transaction history">{renderTransactionsBody()}</Card>

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
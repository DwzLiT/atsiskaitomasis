import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import ChartPlaceholder from '../components/ui/ChartPlaceholder'
import StatePanel from '../components/ui/StatePanel'
import Table from '../components/ui/Table'
import useResource from '../hooks/useResource'
import { getTransactions } from '../services/historyService'
import { formatMoney } from '../utils/format'

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
  const transactions = useResource(getTransactions)

  function renderTransactionsBody() {
    if (transactions.status === 'loading') {
      return (
        <StatePanel variant="loading" message="Loading transactions…" />
      )
    }
    if (transactions.status === 'error') {
      return (
        <StatePanel
          variant="error"
          message={
            transactions.error?.message || 'Failed to load transactions.'
          }
          onRetry={transactions.reload}
        />
      )
    }
    if (
      transactions.status === 'success' &&
      transactions.data?.items.length === 0
    ) {
      return (
        <StatePanel variant="empty" message="No transactions yet." />
      )
    }
    if (transactions.status === 'success') {
      return (
        <Table
          columns={transactionColumns}
          rows={transactions.data.items}
          emptyMessage="No transactions yet."
        />
      )
    }
    return null
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>History / Stats</h1>
          <p>Past paper trades and performance overview.</p>
        </div>
        {transactions.data?.isDemo ? (
          <Badge variant="demo">DEMO data</Badge>
        ) : null}
      </div>

      <div className="page-grid page-grid--split">
        <Card
          title="Transaction history"
          action={
            transactions.data?.isDemo ? (
              <Badge variant="demo">DEMO</Badge>
            ) : null
          }
        >
          {renderTransactionsBody()}
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

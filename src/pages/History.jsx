import { useEffect, useState } from 'react'
import { api } from '../api'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import ChartPlaceholder from '../components/ui/ChartPlaceholder'
import Table from '../components/ui/Table'

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
      <Badge variant={row.side === 'BUY' ? 'buy' : 'sell'}>{row.side}</Badge>
    ),
  },
  { key: 'symbol', label: 'Symbol' },
  { key: 'trader_name', label: 'Trader' },
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
  {
    key: 'total',
    label: 'Total',
    align: 'right',
    render: (row) => formatMoney(row.price * row.quantity),
  },
  {
    key: 'date',
    label: 'Date',
    render: (row) => new Date(row.created_at).toLocaleString(),
  },
]

export default function History() {
  const [transactions, setTransactions] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .allTickets()
      .then(setTransactions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>History / Stats</h1>
          <p>Past paper trades and performance overview.</p>
        </div>
      </div>

      <div className="page-grid page-grid--split">
        <Card title="Transaction history">
          {error ? (
            <p className="ui-note" role="alert">
              {error}
            </p>
          ) : (
            <Table
              columns={transactionColumns}
              rows={transactions}
              emptyMessage={loading ? 'Loading…' : 'No transactions yet.'}
            />
          )}
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

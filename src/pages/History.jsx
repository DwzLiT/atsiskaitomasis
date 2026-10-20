import ProfitLossChart from '../components/charts/ProfitLossChart'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import StatePanel from '../components/ui/StatePanel'
import Table from '../components/ui/Table'
import useAuth from '../lib/useAuth'
import usePortfolio from '../lib/usePortfolio'
import useSnapshots from '../lib/useSnapshots'
import useTickets from '../lib/useTickets'
import { computeTotalValue } from '../utils/chart'
import { formatMoney } from '../utils/format'

const STATUS_LABELS = { FILLED: 'Įvykdyta', REJECTED: 'Atmesta' }

const transactionColumns = [
  {
    key: 'side',
    label: 'Tipas',
    render: (row) => (
      <Badge variant={row.side === 'BUY' ? 'buy' : 'sell'}>{row.side === 'BUY' ? 'Pirkimas' : 'Pardavimas'}
      </Badge>
    ),
  },
  { key: 'symbol', label: 'Simbolis' },
  {
    key: 'quantity',
    label: 'Kiekis',
    align: 'right',
    render: (row) => row.quantity,
  },
  {
    key: 'price',
    label: 'Kaina',
    align: 'right',
    render: (row) => formatMoney(Number(row.price)),
  },
  {
    key: 'total',
    label: 'Suma',
    align: 'right',
    render: (row) => formatMoney(Number(row.price) * Number(row.quantity)),
  },
  {
    key: 'status',
    label: 'Būsena',
    render: (row) => STATUS_LABELS[row.status] ?? row.status,
  },
  {
    key: 'created_at',
    label: 'Data',
    render: (row) => new Date(row.created_at).toLocaleString('lt-LT'),
  },
]

export default function History() {
  const { user, loading: authLoading } = useAuth()
  const { tickets, loading, error } = useTickets(user?.id)
  const portfolio = usePortfolio(user?.id)
  const history = useSnapshots(user?.id)
  const isLoading = authLoading || loading

  function renderTransactionsBody() {
    if (isLoading) {
      return <StatePanel variant="loading" message="Kraunami sandoriai…" />
    }
    if (error) {
      return (
        <StatePanel
          variant="error"
          message={typeof error === 'string' ? error : 'Nepavyko įkelti sandorių.'}
        />
      )
    }
    if (!tickets || tickets.length === 0) {
      return <StatePanel variant="empty" message="Sandorių dar nėra." />
    }
    return (
      <Table
        columns={transactionColumns}
        rows={tickets}
        emptyMessage="Sandorių dar nėra."
      />
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Istorija / statistika</h1>
          <p>Ankstesni virtualūs sandoriai ir rezultatų apžvalga.</p>
        </div>
      </div>

      {!authLoading && !user ? (
        <p className="auth-message auth-message--error" role="alert">
          Prisijunkite, kad matytumėte savo sandorių istoriją.
        </p>
      ) : null}

      <div className="page-grid page-grid--split">
        <Card title="Sandorių istorija">{renderTransactionsBody()}</Card>

        <ProfitLossChart
          user={user}
          snapshots={history.snapshots}
          tickets={tickets}
          loading={authLoading || history.loading}
          error={history.error}
          currentValue={computeTotalValue(portfolio.trader, portfolio.positions)}
        />
      </div>
    </div>
  )
}
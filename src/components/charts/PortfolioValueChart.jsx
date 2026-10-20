import { useState } from 'react'
import { STARTING_BALANCE, filterByDays, withCurrentPoint } from '../../utils/chart'
import { formatCompactMoney, formatMoney } from '../../utils/format'
import Card from '../ui/Card'
import LineChart from '../ui/LineChart'
import RangeTabs from '../ui/RangeTabs'
import StatePanel from '../ui/StatePanel'

const RANGES = [
  { id: '1W', label: '1 sav.', days: 7 },
  { id: '1M', label: '1 mėn.', days: 31 },
  { id: 'ALL', label: 'Viskas', days: null },
]

// Total value (cash + positions) over time from portfolio_snapshots.
export default function PortfolioValueChart({ user, snapshots, loading, error, currentValue }) {
  const [range, setRange] = useState('ALL')
  const points = withCurrentPoint(snapshots, currentValue)
  const visible = filterByDays(points, RANGES.find((r) => r.id === range).days)

  function renderBody() {
    if (!user) {
      return <StatePanel variant="empty" message="Prisijunkite, kad matytumėte portfelio vertės pokyčius." />
    }
    if (loading) {
      return <StatePanel variant="loading" message="Kraunama portfelio istorija…" />
    }
    if (error) {
      return <StatePanel variant="error" message={error} />
    }
    if (visible.length < 2) {
      return (
        <StatePanel
          variant="empty"
          message="Vertės istorija prasidės nuo pirmojo sandorio."
        />
      )
    }
    return (
      <LineChart
        points={visible}
        baseline={STARTING_BALANCE}
        formatValue={formatMoney}
        formatAxis={formatCompactMoney}
        ariaLabel="Portfelio bendra vertė laikui bėgant, punktyrinė linija – pradiniai $10,000"
      />
    )
  }

  return (
    <Card
      title="Portfelio vertė"
      action={user ? <RangeTabs ranges={RANGES} value={range} onChange={setRange} /> : null}
    >
      {renderBody()}
      <p className="ui-note">Pinigai + pozicijų rinkos vertė. Punktyrinė linija – pradiniai $10,000.</p>
    </Card>
  )
}

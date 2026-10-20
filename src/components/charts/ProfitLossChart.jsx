import { useState } from 'react'
import { STARTING_BALANCE, filterByDays, withCurrentPoint } from '../../utils/chart'
import { formatCompactMoney, formatMoney, formatSignedMoney } from '../../utils/format'
import Card from '../ui/Card'
import LineChart from '../ui/LineChart'
import RangeTabs from '../ui/RangeTabs'
import StatePanel from '../ui/StatePanel'

const RANGES = [
  { id: '1W', label: '1 sav.', days: 7 },
  { id: '1M', label: '1 mėn.', days: 31 },
  { id: 'ALL', label: 'Viskas', days: null },
]

// One dot per trade, placed on the snapshot taken with it (same created_at),
// or the first snapshot after it for older data.
function toMarkers(tickets, points) {
  return tickets.flatMap((ticket) => {
    const t = new Date(ticket.created_at).getTime()
    const point = points.find((p) => p.t >= t)
    if (!point) return []
    return [
      {
        t: point.t,
        value: point.value,
        side: ticket.side,
        label: `${ticket.side === 'BUY' ? 'Pirkta' : 'Parduota'} ${ticket.quantity} × ${ticket.symbol} @ ${formatMoney(Number(ticket.price))}`,
      },
    ]
  })
}

// Profit / loss over time: total value minus the $10,000 starting balance.
export default function ProfitLossChart({ user, snapshots, tickets, loading, error, currentValue }) {
  const [range, setRange] = useState('ALL')
  const points = withCurrentPoint(snapshots, currentValue).map((p) => ({
    t: p.t,
    value: p.value - STARTING_BALANCE,
  }))
  const visible = filterByDays(points, RANGES.find((r) => r.id === range).days)
  const markers = toMarkers(tickets, visible)
  const latest = points[points.length - 1]?.value ?? 0
  const latestPercent = (latest / STARTING_BALANCE) * 100

  function renderBody() {
    if (!user) {
      return <StatePanel variant="empty" message="Prisijunkite, kad matytumėte savo pelną ir nuostolį." />
    }
    if (loading) {
      return <StatePanel variant="loading" message="Kraunami rezultatai…" />
    }
    if (error) {
      return <StatePanel variant="error" message={error} />
    }
    if (visible.length < 2) {
      return <StatePanel variant="empty" message="Atlikite pirmąjį sandorį, kad pradėtumėte sekti pelną / nuostolį." />
    }
    return (
      <>
        <p className="chart-summary">
          <span className={`mono ${latest >= 0 ? 'positive' : 'negative'}`}>
            {formatSignedMoney(latest)}
          </span>
          <span className={`mono ${latest >= 0 ? 'positive' : 'negative'}`}>
            {latestPercent > 0 ? '+' : ''}
            {latestPercent.toFixed(2)}%
          </span>
          <span>nuo pradinių $10,000</span>
        </p>
        <LineChart
          points={visible}
          baseline={0}
          split
          markers={markers}
          formatValue={formatSignedMoney}
          formatAxis={formatCompactMoney}
          ariaLabel="Pelnas ir nuostolis laikui bėgant su sandorių žymomis"
        />
      </>
    )
  }

  return (
    <Card
      title="Rezultatai"
      action={user ? <RangeTabs ranges={RANGES} value={range} onChange={setRange} /> : null}
    >
      {renderBody()}
      <p className="ui-note">
        Taškai – sandoriai: <span className="positive">pirkimas</span> /{' '}
        <span className="negative">pardavimas</span>. Įskaičiuotas ir nerealizuotas
        turimų pozicijų pelnas / nuostolis.
      </p>
    </Card>
  )
}

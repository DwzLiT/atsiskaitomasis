import { useCallback, useState } from 'react'
import useResource from '../../hooks/useResource'
import { resolveDailyPrices } from '../../lib/resolveQuote'
import { filterByDays } from '../../utils/chart'
import { formatChange, formatCompactMoney, formatMoney } from '../../utils/format'
import Card from '../ui/Card'
import LineChart from '../ui/LineChart'
import RangeTabs from '../ui/RangeTabs'
import StatePanel from '../ui/StatePanel'

const RANGES = [
  { id: '1M', label: '1 mėn.', days: 31 },
  { id: '3M', label: '3 mėn.', days: 92 },
  { id: 'ALL', label: 'Viskas', days: null },
]

// Daily closing prices of the selected stock (TIME_SERIES_DAILY, ~100 days).
// Falls back to a demo history when the API limit is reached.
export default function PriceChart({ symbol }) {
  const [range, setRange] = useState('3M')
  const loader = useCallback(() => resolveDailyPrices(symbol), [symbol])
  const prices = useResource(loader, { enabled: Boolean(symbol) })

  const points =
    prices.status === 'success'
      ? prices.data.prices.map((row) => ({ t: new Date(`${row.date}T00:00`).getTime(), value: row.close }))
      : []
  const visible = filterByDays(points, RANGES.find((r) => r.id === range).days)
  const first = visible[0]?.value
  const last = visible[visible.length - 1]?.value
  const change = first ? ((last - first) / first) * 100 : null

  function renderBody() {
    if (!symbol) {
      return <StatePanel variant="empty" message="Suraskite akciją, kad matytumėte jos kainų istoriją." />
    }
    if (prices.status === 'loading') {
      return <StatePanel variant="loading" message="Kraunama kainų istorija…" />
    }
    if (prices.status === 'error') {
      return <StatePanel variant="error" message={prices.error.message} onRetry={prices.reload} />
    }
    if (visible.length < 2) {
      return <StatePanel variant="empty" message="Šiai akcijai nepakanka kainų duomenų." />
    }
    return (
      <>
        <p className="chart-summary">
          <span className="mono">{formatMoney(last)}</span>
          <span className={`mono ${change >= 0 ? 'positive' : 'negative'}`}>
            {formatChange(change)} per laikotarpį
          </span>
        </p>
        <LineChart
          points={visible}
          formatValue={formatMoney}
          formatAxis={formatCompactMoney}
          ariaLabel={`${symbol} dienos uždarymo kaina`}
        />
        {prices.data.source === 'demo' ? (
          <p className="ui-note">
            Alpha Vantage limitas pasiektas – rodoma demonstracinė kainų istorija.
          </p>
        ) : null}
      </>
    )
  }

  return (
    <Card
      title={symbol ? `${symbol} kaina` : 'Kainos grafikas'}
      action={
        symbol ? <RangeTabs ranges={RANGES} value={range} onChange={setRange} /> : null
      }
    >
      {renderBody()}
    </Card>
  )
}

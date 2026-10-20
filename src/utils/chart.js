export const STARTING_BALANCE = 10000

const DAY_MS = 24 * 60 * 60 * 1000

// Keeps points newer than `days` ago (all when days is null). Always keeps at
// least the last two points so the chart can draw a line.
export function filterByDays(points, days) {
  if (days == null) return points
  const from = Date.now() - days * DAY_MS
  const kept = points.filter((p) => p.t >= from)
  return kept.length >= 2 ? kept : points.slice(-2)
}

// Adds a live "now" point from the values on screen, so the line always ends
// at the current total even between stored snapshots.
export function withCurrentPoint(snapshots, currentValue) {
  const points = snapshots.map((s) => ({ t: s.t, value: s.totalValue }))
  if (currentValue == null || points.length === 0) return points
  const last = points[points.length - 1]
  if (Math.abs(last.value - currentValue) < 0.005) return points
  return [...points, { t: Math.max(Date.now(), last.t + 1), value: currentValue }]
}

// Cash + market value of positions (avg cost when a price is missing), the
// same way the database snapshots it.
export function computeTotalValue(trader, positions) {
  if (!trader) return null
  const positionsValue = (positions ?? []).reduce((sum, p) => {
    const price = p.instruments?.price
    return sum + Number(p.shares) * Number(price ?? p.avg_cost)
  }, 0)
  return Number(trader.cash_balance) + positionsValue
}

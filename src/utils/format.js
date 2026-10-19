export function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export function formatChange(changePercent) {
  if (changePercent == null) return '— · DEMO'
  const sign = changePercent > 0 ? '+' : ''
  return `${sign}${changePercent.toFixed(2)}%`
}

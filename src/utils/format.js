export function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export function formatSignedMoney(value) {
  return `${value > 0 ? '+' : ''}${formatMoney(value)}`
}

// Short axis labels: $10.2k, -$350
export function formatCompactMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

// Date + time in Lithuanian format, e.g. "spal. 20 10:15".
export function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('lt-LT', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatChange(changePercent) {
  if (changePercent == null) return '—'
  const sign = changePercent > 0 ? '+' : ''
  return `${sign}${changePercent.toFixed(2)}%`
}

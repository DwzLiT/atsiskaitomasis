async function request(path, options) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
  return body
}

export const api = {
  traders: () => request('/traders'),
  tickets: (traderId) => request(`/traders/${traderId}/tickets`),
  quote: (symbol) => request(`/quotes/${encodeURIComponent(symbol)}`),
  placeTicket: (ticket) =>
    request('/tickets', { method: 'POST', body: JSON.stringify(ticket) }),
}

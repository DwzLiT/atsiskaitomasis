import { supabase } from './lib/supabase'

// Every call carries the signed-in user's token: the API only returns the
// traders that user may see.
async function request(path, options = {}) {
  const { data } = (await supabase?.auth.getSession()) ?? {}
  const token = data?.session?.access_token
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
  return body
}

export const api = {
  traders: () => request('/traders'),
  allTickets: () => request('/tickets'),
  tickets: (traderId) => request(`/traders/${traderId}/tickets`),
  quote: (symbol) => request(`/quotes/${encodeURIComponent(symbol)}`),
  placeTicket: (ticket) =>
    request('/tickets', { method: 'POST', body: JSON.stringify(ticket) }),
  assignableTraders: () => request('/trusted'),
  setTraderTrusted: (traderId, trusted) =>
    request(`/trusted/${traderId}`, { method: 'PUT', body: JSON.stringify({ trusted }) }),
}

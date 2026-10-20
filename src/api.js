import { supabase } from './lib/supabase'

async function request(path, options) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
  return body
}

// Tickets of the signed-in user's traders; the API identifies them by token.
async function userTickets() {
  const { data } = (await supabase?.auth.getSession()) ?? {}
  const token = data?.session?.access_token
  if (!token) throw new Error('Sign in to see your history.')
  return request('/tickets', { headers: { Authorization: `Bearer ${token}` } })
}

export const api = {
  traders: () => request('/traders'),
  allTickets: userTickets,
  tickets: (traderId) => request(`/traders/${traderId}/tickets`),
  quote: (symbol) => request(`/quotes/${encodeURIComponent(symbol)}`),
  placeTicket: (ticket) =>
    request('/tickets', { method: 'POST', body: JSON.stringify(ticket) }),
}

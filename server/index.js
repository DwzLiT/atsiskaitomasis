import express from 'express'
import { aggregatePortfolio } from './portfolio.js'
import { supabase } from './supabase.js'

const app = express()
app.use(express.json())

const wrap = (handler) => (req, res) =>
  Promise.resolve(handler(req, res)).catch((err) => {
    console.error(err)
    res.status(500).json({ error: err.message })
  })

// Exceptions raised by place_ticket() (P0001) carry user-facing messages.
const isRuleViolation = (error) => error.code === 'P0001'

// Resolves the signed-in user from the Supabase access token sent as a
// Bearer token. Sends the 401 itself and returns null when there is none.
async function requireUser(req, res, missingMessage = 'Sign in to continue') {
  const token = (req.headers.authorization ?? '').replace(/^Bearer /i, '')
  if (!token) {
    res.status(401).json({ error: missingMessage })
    return null
  }
  const { data: auth, error } = await supabase.auth.getUser(token)
  if (error || !auth?.user) {
    res.status(401).json({ error: 'Session expired, please sign in again' })
    return null
  }
  return auth.user
}

// Ids of the traders a user sees throughout the app: the traders they own
// (always, "including himself by default") plus the traders of every user who
// trusts one of theirs. A user trusts a trader by ticking it on the Traders
// page, which stores (user_id, trader_id) in trusted_traders.
async function assignedTraderIds(userId) {
  const { data: owned, error: ownedError } = await supabase
    .from('traders').select('id').eq('user_id', userId)
  if (ownedError) throw ownedError
  const ownedIds = owned.map((t) => t.id)
  if (ownedIds.length === 0) return { ownedIds, ids: [] }

  const { data: trusting, error: trustError } = await supabase
    .from('trusted_traders').select('user_id').in('trader_id', ownedIds)
  if (trustError) throw trustError
  const trustingUserIds = [...new Set(trusting.map((r) => r.user_id))]

  let trustedByIds = []
  if (trustingUserIds.length > 0) {
    const { data, error } = await supabase
      .from('traders').select('id').in('user_id', trustingUserIds)
    if (error) throw error
    trustedByIds = data.map((t) => t.id)
  }
  return { ownedIds, ids: [...new Set([...ownedIds, ...trustedByIds])] }
}

// Signed-in user plus their visible trader ids; null once a 401 was sent.
async function requireScope(req, res, missingMessage) {
  const user = await requireUser(req, res, missingMessage)
  if (!user) return null
  return { user, ...(await assignedTraderIds(user.id)) }
}

// Every trader with whether the user owns it / has trusted it (so that trader
// can see the user's data). Names only: other traders' email and cash stay
// private.
app.get('/api/trusted', wrap(async (req, res) => {
  const user = await requireUser(req, res, 'Sign in to manage your traders')
  if (!user) return
  const [traders, trusted] = await Promise.all([
    supabase.from('traders').select('id, name, user_id').order('created_at'),
    supabase.from('trusted_traders').select('trader_id').eq('user_id', user.id),
  ])
  if (traders.error) throw traders.error
  if (trusted.error) throw trusted.error
  const trustedIds = new Set(trusted.data.map((r) => r.trader_id))
  res.json(traders.data.map((t) => {
    const own = t.user_id === user.id
    return { id: t.id, name: t.name, own, selected: own || trustedIds.has(t.id) }
  }))
}))

// Replaces the traders the user trusts. Owned traders are always trusted, so
// they are ignored here.
app.put('/api/trusted', wrap(async (req, res) => {
  const user = await requireUser(req, res, 'Sign in to manage your traders')
  if (!user) return
  const requested = req.body?.trader_ids
  if (!Array.isArray(requested) || requested.some((id) => typeof id !== 'string')) {
    return res.status(400).json({ error: 'trader_ids must be an array of trader ids' })
  }

  const { data: known, error: knownError } = await supabase
    .from('traders').select('id, user_id').in('id', requested)
  if (knownError) throw knownError
  if (known.length !== new Set(requested).size) {
    return res.status(400).json({ error: 'unknown trader in trader_ids' })
  }
  const rows = known
    .filter((t) => t.user_id !== user.id)
    .map((t) => ({ user_id: user.id, trader_id: t.id }))

  const { error: deleteError } = await supabase
    .from('trusted_traders').delete().eq('user_id', user.id)
  if (deleteError) throw deleteError
  if (rows.length > 0) {
    const { error: insertError } = await supabase.from('trusted_traders').insert(rows)
    if (insertError) throw insertError
  }
  res.json({ trader_ids: rows.map((r) => r.trader_id) })
}))

app.get('/api/traders', wrap(async (req, res) => {
  const scope = await requireScope(req, res, 'Sign in to see your traders')
  if (!scope) return
  const { data, error } = await supabase
    .from('traders').select('*').in('id', scope.ids).order('created_at')
  if (error) throw error
  res.json(data)
}))

app.get('/api/traders/:id', wrap(async (req, res) => {
  const scope = await requireScope(req, res)
  if (!scope) return
  if (!scope.ids.includes(req.params.id)) return res.status(404).json({ error: 'trader not found' })
  const { data, error } = await supabase
    .from('traders').select('*').eq('id', req.params.id).maybeSingle()
  if (error) throw error
  if (!data) return res.status(404).json({ error: 'trader not found' })
  res.json(data)
}))

app.get('/api/traders/:id/tickets', wrap(async (req, res) => {
  const scope = await requireScope(req, res)
  if (!scope) return
  if (!scope.ids.includes(req.params.id)) return res.status(404).json({ error: 'trader not found' })
  const { data, error } = await supabase
    .from('tickets').select('*').eq('trader_id', req.params.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  res.json(data)
}))

app.get('/api/traders/:id/positions', wrap(async (req, res) => {
  const scope = await requireScope(req, res)
  if (!scope) return
  if (!scope.ids.includes(req.params.id)) return res.status(404).json({ error: 'trader not found' })
  const { data, error } = await supabase
    .from('positions').select('*').eq('trader_id', req.params.id).order('symbol')
  if (error) throw error
  res.json(data)
}))

app.get('/api/quotes/:symbol', wrap(async (req, res) => {
  const symbol = req.params.symbol.trim().toUpperCase()
  const { data, error } = await supabase
    .from('instruments').select('*').eq('symbol', symbol).maybeSingle()
  if (error) throw error
  if (!data) return res.status(404).json({ error: 'unknown symbol' })
  res.json(data)
}))

// Aggregated portfolio of the traders assigned to the signed-in user.
app.get('/api/portfolio', wrap(async (req, res) => {
  const scope = await requireScope(req, res, 'Sign in to see your portfolio')
  if (!scope) return

  let traders = []
  let positions = []
  let prices = {}
  if (scope.ids.length > 0) {
    const { data: found, error: tradersError } = await supabase
      .from('traders').select('id, name, cash_balance').in('id', scope.ids)
    if (tradersError) throw tradersError
    traders = found

    const { data, error } = await supabase
      .from('positions').select('trader_id, symbol, shares, avg_cost').in('trader_id', scope.ids)
    if (error) throw error
    positions = data
    const symbols = [...new Set(positions.map((p) => p.symbol))]
    if (symbols.length > 0) {
      const { data: instruments, error: priceError } = await supabase
        .from('instruments').select('symbol, price').in('symbol', symbols)
      if (priceError) throw priceError
      prices = Object.fromEntries(instruments.map((i) => [i.symbol, Number(i.price)]))
    }
  }
  res.json(aggregatePortfolio({ traders, positions, prices }))
}))

// Tickets of the traders assigned to the signed-in user, newest first, with
// the trader's name.
app.get('/api/tickets', wrap(async (req, res) => {
  const scope = await requireScope(req, res, 'Sign in to see your history')
  if (!scope) return
  const { data, error } = await supabase
    .from('tickets').select('*, traders(name)').in('trader_id', scope.ids)
    .order('created_at', { ascending: false })
  if (error) throw error
  res.json(data.map(({ traders, ...ticket }) => ({ ...ticket, trader_name: traders?.name })))
}))

// Create (and execute) a BUY or SELL ticket at the current instrument price.
app.post('/api/tickets', wrap(async (req, res) => {
  const scope = await requireScope(req, res, 'Sign in to place orders')
  if (!scope) return
  const { trader_id, symbol, side, quantity } = req.body ?? {}
  const normalizedSide = String(side).toUpperCase()
  const qty = Number(quantity)
  if (
    !trader_id ||
    !symbol ||
    !['BUY', 'SELL'].includes(normalizedSide) ||
    !Number.isInteger(qty) ||
    qty <= 0
  ) {
    return res.status(400).json({
      error: 'trader_id, symbol, side (BUY|SELL) and a positive integer quantity are required',
    })
  }
  if (!scope.ids.includes(trader_id)) {
    return res.status(403).json({ error: 'You do not have access to that trader' })
  }
  const { data, error } = await supabase.rpc('place_ticket', {
    p_trader_id: trader_id,
    p_symbol: symbol,
    p_side: normalizedSide,
    p_quantity: qty,
  })
  if (error) {
    if (isRuleViolation(error)) return res.status(422).json({ error: error.message })
    throw error
  }
  res.status(201).json(data)
}))

const port = process.env.API_PORT || 3001
app.listen(port, () => console.log(`API listening on http://localhost:${port}`))

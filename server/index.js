import express from 'express'
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

app.get('/api/traders', wrap(async (_req, res) => {
  const { data, error } = await supabase.from('traders').select('*').order('created_at')
  if (error) throw error
  res.json(data)
}))

app.get('/api/traders/:id', wrap(async (req, res) => {
  const { data, error } = await supabase
    .from('traders').select('*').eq('id', req.params.id).maybeSingle()
  if (error) throw error
  if (!data) return res.status(404).json({ error: 'trader not found' })
  res.json(data)
}))

app.get('/api/traders/:id/tickets', wrap(async (req, res) => {
  const { data, error } = await supabase
    .from('tickets').select('*').eq('trader_id', req.params.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  res.json(data)
}))

app.get('/api/traders/:id/positions', wrap(async (req, res) => {
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

// Create (and execute) a BUY or SELL ticket at the current instrument price.
app.post('/api/tickets', wrap(async (req, res) => {
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

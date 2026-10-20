import { supabase } from './supabase.js'

const instruments = [
  { symbol: 'AAPL', company: 'Apple Inc.', price: 190.0 },
  { symbol: 'MSFT', company: 'Microsoft Corp.', price: 420.15 },
  { symbol: 'NVDA', company: 'NVIDIA Corp.', price: 875.3 },
  { symbol: 'AMZN', company: 'Amazon.com Inc.', price: 178.9 },
  { symbol: 'TSLA', company: 'Tesla Inc.', price: 262.15 },
  { symbol: 'GOOGL', company: 'Alphabet Inc.', price: 141.25 },
]

const traders = [
  { name: 'Demo Trader', email: 'demo@example.com', cash_balance: 10000 },
  { name: 'Second Trader', email: 'second@example.com', cash_balance: 25000 },
]

// Seeded through place_ticket() so cash and positions stay consistent.
const tickets = [
  ['demo@example.com', 'AAPL', 'BUY', 12],
  ['demo@example.com', 'MSFT', 'BUY', 8],
  ['demo@example.com', 'TSLA', 'BUY', 5],
  ['demo@example.com', 'AAPL', 'SELL', 2],
  ['second@example.com', 'NVDA', 'BUY', 10],
  ['second@example.com', 'GOOGL', 'BUY', 20],
]

function check({ error }, what) {
  if (error) {
    console.error(`${what}: ${error.message}`)
    process.exit(1)
  }
}

// Idempotent: instruments are upserted, seeded traders are recreated.
check(await supabase.from('instruments').upsert(instruments), 'instruments')
check(
  await supabase.from('traders').delete().in('email', traders.map((t) => t.email)),
  'reset traders',
)
const { data: created, error } = await supabase.from('traders').insert(traders).select()
check({ error }, 'traders')

// Optional: give both sample traders to one signed-up user, so that user's
// portfolio aggregates them. SEED_USER_EMAIL=<email of a Supabase Auth user>
const ownerEmail = process.env.SEED_USER_EMAIL
if (ownerEmail) {
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  check({ error: usersError }, 'list users')
  const owner = users.users.find((u) => u.email?.toLowerCase() === ownerEmail.toLowerCase())
  if (!owner) {
    console.error(`No Supabase Auth user with email ${ownerEmail}; register first.`)
    process.exit(1)
  }
  check(
    await supabase.from('traders').update({ user_id: owner.id }).in('id', created.map((t) => t.id)),
    'link traders to user',
  )
  console.log(`Linked ${created.length} traders to ${ownerEmail}.`)
}

const idByEmail = Object.fromEntries(created.map((t) => [t.email, t.id]))

for (const [email, symbol, side, quantity] of tickets) {
  check(
    await supabase.rpc('place_ticket', {
      p_trader_id: idByEmail[email],
      p_symbol: symbol,
      p_side: side,
      p_quantity: quantity,
    }),
    `ticket ${side} ${symbol}`,
  )
}
console.log(
  `Seeded ${instruments.length} instruments, ${created.length} traders, ${tickets.length} tickets.`,
)

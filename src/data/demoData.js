/**
 * DEMO stub data for UI layout only.
 * Not live market prices. Not connected to Supabase / Alpha Vantage.
 * Replace with real data when backend integrations are ready.
 */
export const isDemo = true

export const demoBalance = {
  cash: 10000,
  portfolioValue: 12450.75,
  profitLoss: 450.75,
  profitLossPercent: 3.76,
}

export const demoHoldings = [
  {
    id: 'demo-aapl',
    symbol: 'AAPL',
    shares: 12,
    avgCost: 178.5,
    marketValue: 2280,
  },
  {
    id: 'demo-msft',
    symbol: 'MSFT',
    shares: 8,
    avgCost: 390.2,
    marketValue: 3360,
  },
  {
    id: 'demo-tsla',
    symbol: 'TSLA',
    shares: 5,
    avgCost: 245.0,
    marketValue: 1310.75,
  },
]

export const demoTransactions = [
  {
    id: 'demo-tx-1',
    type: 'BUY',
    symbol: 'AAPL',
    quantity: 12,
    price: 178.5,
    date: '2026-03-10',
  },
  {
    id: 'demo-tx-2',
    type: 'BUY',
    symbol: 'MSFT',
    quantity: 8,
    price: 390.2,
    date: '2026-03-12',
  },
  {
    id: 'demo-tx-3',
    type: 'SELL',
    symbol: 'GOOGL',
    quantity: 3,
    price: 141.25,
    date: '2026-03-15',
  },
  {
    id: 'demo-tx-4',
    type: 'BUY',
    symbol: 'TSLA',
    quantity: 5,
    price: 245.0,
    date: '2026-03-18',
  },
]

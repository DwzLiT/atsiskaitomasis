const round2 = (n) => Math.round(n * 100) / 100

/**
 * Aggregates every trader owned by one user into a single portfolio.
 * - cash: sum of the traders' cash balances
 * - holdings: positions merged per symbol (weighted average cost)
 * - profitLoss: unrealized, i.e. market value minus cost basis
 */
export function aggregatePortfolio({ traders, positions, prices }) {
  const bySymbol = new Map()
  for (const p of positions) {
    const row = bySymbol.get(p.symbol) ?? { symbol: p.symbol, shares: 0, cost: 0 }
    row.shares += p.shares
    row.cost += p.shares * p.avg_cost
    bySymbol.set(p.symbol, row)
  }

  const holdings = [...bySymbol.values()]
    .sort((a, b) => a.symbol.localeCompare(b.symbol))
    .map(({ symbol, shares, cost }) => ({
      id: symbol,
      symbol,
      shares,
      avgCost: round2(cost / shares),
      marketValue: round2(shares * (prices[symbol] ?? cost / shares)),
    }))

  const cash = round2(traders.reduce((sum, t) => sum + Number(t.cash_balance), 0))
  const marketValue = round2(holdings.reduce((sum, h) => sum + h.marketValue, 0))
  const costBasis = round2([...bySymbol.values()].reduce((sum, h) => sum + h.cost, 0))
  const profitLoss = round2(marketValue - costBasis)

  return {
    traderCount: traders.length,
    cash,
    marketValue,
    costBasis,
    portfolioValue: round2(cash + marketValue),
    profitLoss,
    profitLossPercent: costBasis > 0 ? round2((profitLoss / costBasis) * 100) : 0,
    holdings,
  }
}

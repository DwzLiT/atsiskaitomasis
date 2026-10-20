import { demoWatchlist, isDemo } from '../data/demoData'
import { supabase } from '../lib/supabase'
import { demoDelay } from './delay'

/**
 * Portfolio data access. Summary and holdings are real: the API aggregates
 * every trader owned by the signed-in user. The watchlist is still DEMO.
 */

// Summary and holdings load together; share one request between them.
let inflight = null

async function fetchPortfolio() {
  const { data } = (await supabase?.auth.getSession()) ?? {}
  const token = data?.session?.access_token
  if (!token) throw new Error('Sign in to see your portfolio.')

  const res = await fetch('/api/portfolio', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
  return body
}

function loadPortfolio() {
  inflight ??= fetchPortfolio().finally(() => {
    inflight = null
  })
  return inflight
}

export async function getPortfolioSummary() {
  const p = await loadPortfolio()
  return {
    isDemo: false,
    traderCount: p.traderCount,
    cash: p.cash,
    portfolioValue: p.portfolioValue,
    profitLoss: p.profitLoss,
    profitLossPercent: p.profitLossPercent,
  }
}

export async function getHoldings() {
  const p = await loadPortfolio()
  return {
    isDemo: false,
    items: p.holdings,
  }
}

export async function getWatchlist() {
  await demoDelay()
  return {
    isDemo,
    items: [...demoWatchlist],
  }
}

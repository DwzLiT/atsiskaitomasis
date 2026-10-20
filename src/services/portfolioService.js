import {
  demoBalance,
  demoHoldings,
  demoWatchlist,
  isDemo,
} from '../data/demoData'
import { demoDelay } from './delay'

/**
 * Portfolio data access. Currently returns DEMO stubs.
 * Swap implementations here when Supabase is ready — pages stay unchanged.
 */
export async function getPortfolioSummary() {
  await demoDelay()
  return {
    isDemo,
    cash: demoBalance.cash,
    portfolioValue: demoBalance.portfolioValue,
    profitLoss: demoBalance.profitLoss,
    profitLossPercent: demoBalance.profitLossPercent,
  }
}

export async function getHoldings() {
  await demoDelay()
  return {
    isDemo,
    items: [...demoHoldings],
  }
}

export async function getWatchlist() {
  await demoDelay()
  return {
    isDemo,
    items: [...demoWatchlist],
  }
}

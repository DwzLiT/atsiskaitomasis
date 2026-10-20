import {
  demoBalance,
  demoHoldings,
  demoWatchlist,
  isDemo,
} from '../data/demoData'
import { demoDelay } from './delay'

/**
 * Legacy DEMO helpers (unused by Portfolio page).
 * Live portfolio data comes from src/lib/usePortfolio.js + Supabase.
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

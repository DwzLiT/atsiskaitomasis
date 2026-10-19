import { demoTransactions, isDemo } from '../data/demoData'
import { demoDelay } from './delay'

/**
 * Transaction history access. Currently returns DEMO stubs.
 * Swap implementation when Supabase is ready.
 */
export async function getTransactions() {
  await demoDelay()
  return {
    isDemo,
    items: [...demoTransactions],
  }
}

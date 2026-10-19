import { isDemo } from '../data/demoData'
import { demoDelay } from './delay'

/**
 * Quote lookup placeholder. No Alpha Vantage yet.
 * Returns a DEMO-shaped quote so Trade UI can show loading / empty price states.
 */
export async function getQuote(symbol) {
  await demoDelay()
  const normalized = String(symbol || '')
    .trim()
    .toUpperCase()

  if (!normalized) {
    throw new Error('Symbol is required')
  }

  return {
    isDemo: true,
    symbol: normalized,
    price: null,
    company: null,
  }
}

export { isDemo }

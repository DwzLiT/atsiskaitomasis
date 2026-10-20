const PORTFOLIO_CHANGED = 'portfolio:changed'

// Call after a trade so every mounted data hook refetches.
export function notifyPortfolioChanged() {
  window.dispatchEvent(new Event(PORTFOLIO_CHANGED))
}

// Returns an unsubscribe function.
export function onPortfolioChanged(callback) {
  window.addEventListener(PORTFOLIO_CHANGED, callback)
  return () => window.removeEventListener(PORTFOLIO_CHANGED, callback)
}

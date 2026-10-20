import { resolveQuote } from './resolveQuote'

// Refreshes prices one by one (cached for 5 min by alphaVantage.js). Live
// prices are saved; when the API limit is reached resolveQuote falls back to
// the saved / demo price, so one symbol never blocks the others.
// Returns a Lithuanian message for the user.
export async function refreshQuotes(symbols) {
  let live = 0
  let fallback = 0
  let failed = 0

  for (const symbol of symbols) {
    try {
      const quote = await resolveQuote(symbol)
      if (quote.source === 'live') live += 1
      else fallback += 1
    } catch {
      failed += 1
    }
  }

  if (fallback === 0 && failed === 0) return 'Kainos atnaujintos.'
  if (live === 0 && failed === 0) {
    return 'Alpha Vantage šiuo metu nepasiekiamas (dienos limitas) – rodomos paskutinės išsaugotos kainos.'
  }
  return `Atnaujinta: ${live}, išsaugotos / demonstracinės kainos: ${fallback}${failed ? `, nepavyko: ${failed}` : ''}.`
}

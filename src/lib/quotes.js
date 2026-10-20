import { getQuote } from '../api/alphaVantage'
import { toLithuanianError } from '../utils/errors'
import { supabase } from './supabase'

// Saves a quote to instruments. `company` may be null to keep the stored name.
export async function saveQuote(symbol, company, quote) {
  const { error } = await supabase.rpc('upsert_instrument', {
    p_symbol: symbol,
    p_company: company,
    p_price: quote.price,
    p_change_percent: quote.changePercent,
  })
  if (error) throw new Error(toLithuanianError(error.message))
}

// Fetches fresh quotes one by one (cached for 5 min by alphaVantage.js) and
// saves them. Stops at the first error, e.g. the free-tier rate limit; the
// prices saved before it are kept.
export async function refreshQuotes(symbols) {
  for (const symbol of symbols) {
    const quote = await getQuote(symbol)
    await saveQuote(symbol, null, quote)
  }
}

import { supabase } from './supabase'

/**
 * Perskaito paskutinę išsaugotą kainą iš instruments.
 * RLS leidžia skaityti; rašymas vyksta tik per upsert_instrument RPC.
 */
export async function getSavedInstrument(symbol) {
  if (!supabase || !symbol) return null

  const { data, error } = await supabase
    .from('instruments')
    .select('symbol, company, price, change_percent, updated_at')
    .eq('symbol', String(symbol).trim().toUpperCase())
    .maybeSingle()

  if (error) {
    console.warn('getSavedInstrument failed:', error.message)
    return null
  }

  return data
}

/**
 * Paieška išsaugotose akcijjose (kai Alpha Vantage paieška nepasiekiama).
 * Nesiunčia jokių Alpha Vantage užklausų.
 */
export async function searchSavedInstruments(query) {
  if (!supabase || !query?.trim()) return []

  // Pašaliname PostgREST filtro metacharacterius
  const q = query.trim().replace(/[%_,.()]/g, '')
  if (!q) return []

  const { data, error } = await supabase
    .from('instruments')
    .select('symbol, company, price, change_percent, updated_at')
    .or(`symbol.ilike.%${q}%,company.ilike.%${q}%`)
    .order('symbol')
    .limit(10)

  if (error) {
    console.warn('searchSavedInstruments failed:', error.message)
    return []
  }

  return (data ?? []).map((row) => ({
    symbol: row.symbol,
    name: row.company || row.symbol,
    region: 'Išsaugota',
    currency: 'USD',
    price: row.price,
    changePercent: row.change_percent == null ? null : Number(row.change_percent),
    updated_at: row.updated_at,
    fromSaved: true,
  }))
}

/**
 * Saugus kainos atnaujinimas per esamą upsert_instrument RPC.
 */
export async function upsertInstrumentPrice(symbol, company, price, changePercent = null) {
  if (!supabase) {
    return { ok: false, message: 'Kaina neišsaugota: Supabase nesukonfigūruotas.' }
  }

  const { error } = await supabase.rpc('upsert_instrument', {
    p_symbol: symbol,
    p_company: company,
    p_price: price,
    p_change_percent: changePercent,
  })

  if (error) {
    return { ok: false, message: 'Kaina neišsaugota. Ar esate prisijungę?' }
  }

  return { ok: true, message: 'Kaina išsaugota duomenų bazėje.' }
}

/**
 * Išsaugo dienos uždarymo kainas price_history lentelėje (per RPC),
 * kad grafikas veiktų ir pasiekus Alpha Vantage limitą.
 */
export async function savePriceHistory(symbol, prices) {
  if (!supabase || !symbol || !prices?.length) return

  const { error } = await supabase.rpc('save_price_history', {
    p_symbol: String(symbol).trim().toUpperCase(),
    p_rows: prices.map((row) => ({ date: row.date, close: row.close })),
  })

  if (error) {
    console.warn('savePriceHistory failed:', error.message)
  }
}

/**
 * Išsaugota dienos kainų istorija (seniausia -> naujausia).
 */
export async function getSavedPriceHistory(symbol) {
  if (!supabase || !symbol) return []

  const { data, error } = await supabase
    .from('price_history')
    .select('date, close')
    .eq('symbol', String(symbol).trim().toUpperCase())
    .order('date', { ascending: true })

  if (error) {
    console.warn('getSavedPriceHistory failed:', error.message)
    return []
  }

  return (data ?? []).map((row) => ({ date: row.date, close: Number(row.close) }))
}

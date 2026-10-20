import { supabase } from './supabase'

/**
 * Perskaito paskutinę išsaugotą kainą iš instruments.
 * RLS leidžia skaityti; rašymas vyksta tik per upsert_instrument RPC.
 */
export async function getSavedInstrument(symbol) {
  if (!supabase || !symbol) return null

  const normalized = String(symbol).trim().toUpperCase()

  // Pirma tikslus match, tada case-insensitive (jei DB saugo mišrų registrą)
  let { data, error } = await supabase
    .from('instruments')
    .select('symbol, company, price, updated_at')
    .eq('symbol', normalized)
    .maybeSingle()

  if (!data && !error) {
    const fallback = await supabase
      .from('instruments')
      .select('symbol, company, price, updated_at')
      .ilike('symbol', normalized)
      .limit(1)
      .maybeSingle()
    data = fallback.data
    error = fallback.error
  }

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
    .select('symbol, company, price, updated_at')
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
    updated_at: row.updated_at,
    fromSaved: true,
  }))
}

/**
 * Saugus kainos atnaujinimas per esamą upsert_instrument RPC.
 */
export async function upsertInstrumentPrice(symbol, company, price) {
  if (!supabase) {
    return { ok: false, message: 'Kaina neišsaugota: Supabase nesukonfigūruotas.' }
  }

  const { error } = await supabase.rpc('upsert_instrument', {
    p_symbol: symbol,
    p_company: company,
    p_price: price,
  })

  if (error) {
    return { ok: false, message: 'Kaina neišsaugota. Ar esate prisijungę?' }
  }

  return { ok: true, message: 'Kaina išsaugota duomenų bazėje.' }
}

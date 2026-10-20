import { ApiError, getQuote } from '../api/alphaVantage'
import { getSavedInstrument, upsertInstrumentPrice } from './instruments'

const FALLBACK_ERROR_TYPES = new Set(['limit', 'daily_limit', 'network', 'config', 'api'])

function canUseSavedPrice(err) {
  return err instanceof ApiError && FALLBACK_ERROR_TYPES.has(err.type)
}

/**
 * 1) Bando Alpha Vantage kainą.
 * 2) Jei limitas / tinklas / API nepasiekiamas — naudoja instruments.
 * 3) Jei nėra nė vienur — aiški klaida (kainos neišgalvoja).
 *
 * Sėkmingą API kainą išsaugo per upsert_instrument.
 */
export async function resolveQuote(symbol, { company } = {}) {
  const normalized = String(symbol || '')
    .trim()
    .toUpperCase()

  if (!normalized) {
    throw new ApiError('Simbolis privalomas', 'not_found')
  }

  try {
    const quote = await getQuote(normalized)
    const companyName = company || quote.symbol || normalized
    const save = await upsertInstrumentPrice(
      normalized,
      company || null, // null palieka jau išsaugotą pavadinimą
      quote.price,
      quote.changePercent,
    )

    return {
      symbol: quote.symbol || normalized,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      date: quote.date,
      company: companyName,
      source: 'live',
      updatedAt: new Date().toISOString(),
      saveMessage: save.message,
    }
  } catch (err) {
    if (!canUseSavedPrice(err)) {
      throw err
    }

    const saved = await getSavedInstrument(normalized)
    const price = saved?.price != null ? Number(saved.price) : NaN

    if (!saved || !Number.isFinite(price) || price <= 0) {
      throw new ApiError(
        `Akcijos „${normalized}“ kaina nepasiekiama. Alpha Vantage šiuo metu neveikia (arba pasiektas limitas), o šios akcijos nėra išsaugotoje instruments lentelėje.`,
        'unavailable',
      )
    }

    return {
      symbol: saved.symbol || normalized,
      price,
      change: null,
      changePercent: saved.change_percent == null ? null : Number(saved.change_percent),
      date: null,
      company: saved.company || company || normalized,
      source: 'saved',
      updatedAt: saved.updated_at || null,
      saveMessage: '',
      fallbackReason: err.message,
    }
  }
}

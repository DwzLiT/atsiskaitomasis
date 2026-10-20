import { ApiError, getDailyPrices, getQuote } from '../api/alphaVantage'
import { getDemoHistory, getDemoQuote } from './demoMarket'
import { getSavedInstrument, upsertInstrumentPrice } from './instruments'

const FALLBACK_ERROR_TYPES = new Set(['limit', 'daily_limit', 'network', 'config', 'api'])

export function canUseFallback(err) {
  return err instanceof ApiError && FALLBACK_ERROR_TYPES.has(err.type)
}

function normalize(symbol) {
  return String(symbol || '')
    .trim()
    .toUpperCase()
}

/**
 * 1) Bando Alpha Vantage kainą.
 * 2) Jei limitas / tinklas / API nepasiekiamas — naudoja instruments.
 * 3) Jei ten nėra — demonstracinę kainą (demoMarket.js), kuri išsaugoma,
 *    kad su ja būtų galima prekiauti ir pridėti prie stebimų.
 * 4) Jei nėra nė vienur — aiški klaida.
 *
 * source: 'live' | 'saved' | 'demo'
 */
export async function resolveQuote(symbol, { company } = {}) {
  const normalized = normalize(symbol)

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
    if (!canUseFallback(err)) {
      throw err
    }

    const saved = await getSavedInstrument(normalized)
    const price = saved?.price != null ? Number(saved.price) : NaN

    if (saved && Number.isFinite(price) && price > 0) {
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

    const demo = getDemoQuote(normalized)
    if (demo) {
      // Išsaugome, nes place_ticket ir add_to_watchlist ima kainą iš instruments
      const save = await upsertInstrumentPrice(
        normalized,
        company || demo.company,
        demo.price,
        demo.changePercent,
      )
      return {
        ...demo,
        company: company || demo.company,
        source: 'demo',
        updatedAt: new Date().toISOString(),
        saveMessage: save.ok ? '' : save.message,
        fallbackReason: err.message,
      }
    }

    throw new ApiError(
      `Akcijos „${normalized}“ kaina nepasiekiama. Alpha Vantage šiuo metu neveikia (arba pasiektas limitas), o šios akcijos nėra nei išsaugotų, nei demonstracinių sąraše.`,
      'unavailable',
    )
  }
}

/**
 * Dienos kainų istorija grafikui: Alpha Vantage, o jei nepasiekiamas –
 * demonstracinė istorija, kuri baigiasi paskutine žinoma kaina.
 * Grąžina { prices, source: 'live' | 'demo' }.
 */
export async function resolveDailyPrices(symbol) {
  const normalized = normalize(symbol)

  try {
    return { prices: await getDailyPrices(normalized), source: 'live' }
  } catch (err) {
    if (!canUseFallback(err)) throw err

    const saved = await getSavedInstrument(normalized)
    const endPrice = saved?.price != null ? Number(saved.price) : getDemoQuote(normalized)?.price
    const prices = getDemoHistory(normalized, endPrice)

    if (prices.length === 0) {
      throw new ApiError(`Nėra kainų duomenų akcijai „${normalized}“`, 'unavailable')
    }
    return { prices, source: 'demo' }
  }
}

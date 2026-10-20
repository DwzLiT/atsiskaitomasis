const BASE_URL = 'https://www.alphavantage.co/query'
const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY

// Nemokamas planas labai ribotas, todėl atsakymai saugomi kelias minutes
const CACHE_TTL_MS = 5 * 60 * 1000
const CACHE_PREFIX = 'alphaVantage:'
const memoryCache = new Map()
const pendingRequests = new Map()

// Nemokamas planas leidžia ~1 užklausą per sekundę (ir ~25 per dieną),
// todėl užklausos siunčiamos ne dažniau kaip kas 1,2 s.
const MIN_GAP_MS = 1200
const BURST_RETRY_MS = 2000
let nextSlot = 0

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Laukia savo eilės, kad kelios užklausos iš eilės neviršytų limito.
async function waitForTurn() {
  const now = Date.now()
  const wait = Math.max(0, nextSlot - now)
  nextSlot = Math.max(now, nextSlot) + MIN_GAP_MS
  if (wait > 0) await sleep(wait)
}

export class ApiError extends Error {
  constructor(message, type) {
    super(message)
    this.name = 'ApiError'
    // type: 'config' | 'network' | 'limit' | 'daily_limit' | 'not_found' | 'api' | 'unavailable'
    this.type = type
  }
}

/** Pašalina API raktą iš Alpha Vantage teksto, kad jis nepatektų į UI / logus. */
function sanitizeApiMessage(message) {
  if (!message) return ''
  let text = String(message)
  if (API_KEY) {
    text = text.split(API_KEY).join('[REDACTED]')
  }
  // Kartais raktas pasirodo kaip query parametro dalis
  text = text.replace(/([?&]apikey=)[^&\s]+/gi, '$1[REDACTED]')
  return text.trim()
}

/** Tikras užklausų limito / dažnio pranešimas (Note arba Information). */
function isRateLimitMessage(message) {
  const text = String(message).toLowerCase()
  return (
    text.includes('api call frequency') ||
    text.includes('call volume') ||
    text.includes('rate limit') ||
    text.includes('calls per minute') ||
    text.includes('calls per day') ||
    text.includes('25 requests per day') ||
    text.includes('higher api call') ||
    text.includes('standard api rate limit') ||
    text.includes('thank you for using alpha vantage')
  )
}

function readCache(key) {
  const now = Date.now()
  const cached = memoryCache.get(key)
  if (cached && now - cached.time < CACHE_TTL_MS) return cached.data

  // localStorage gali būti nepasiekiamas (privatus langas ir pan.)
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const stored = JSON.parse(raw)
    if (now - stored.time < CACHE_TTL_MS) {
      memoryCache.set(key, stored)
      return stored.data
    }
    localStorage.removeItem(CACHE_PREFIX + key)
  } catch {
    // ignoruojame – tiesiog kreipsimės į API
  }
  return null
}

function writeCache(key, data) {
  const entry = { time: Date.now(), data }
  memoryCache.set(key, entry)
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry))
  } catch {
    // ignoruojame – liks tik atminties talpykla
  }
}

async function fetchFromApi(params, retried = false) {
  if (!API_KEY) {
    throw new ApiError('Nerastas API raktas (VITE_ALPHA_VANTAGE_KEY faile .env)', 'config')
  }

  const url = `${BASE_URL}?${new URLSearchParams({ ...params, apikey: API_KEY })}`

  await waitForTurn()

  let response
  try {
    response = await fetch(url)
  } catch {
    throw new ApiError('Nepavyko prisijungti prie Alpha Vantage', 'network')
  }

  if (!response.ok) {
    throw new ApiError(`Serverio klaida: ${response.status}`, 'network')
  }

  const data = await response.json()

  // Alpha Vantage visada grąžina 200, klaidas reikia tikrinti atsakymo turinyje
  const notice = data.Note || data.Information
  if (notice) {
    const detail = sanitizeApiMessage(notice)

    if (/per day|daily/i.test(notice)) {
      throw new ApiError(
        'Pasiektas šios dienos Alpha Vantage užklausų limitas (nemokamas planas – apie 25 per dieną). Kainos vėl atsinaujins rytoj.',
        'daily_limit',
      )
    }

    if (isRateLimitMessage(notice)) {
      // Per greitai išsiųstos užklausos – vieną kartą bandome dar kartą
      if (!retried) {
        await sleep(BURST_RETRY_MS)
        return fetchFromApi(params, true)
      }
      throw new ApiError(
        `Per daug Alpha Vantage užklausų per trumpą laiką. Palaukite minutę ir bandykite dar kartą. (${detail})`,
        'limit',
      )
    }

    throw new ApiError(
      `Alpha Vantage API pranešimas: ${detail || 'nežinoma klaida'}`,
      'api',
    )
  }

  if (data['Error Message']) {
    const detail = sanitizeApiMessage(data['Error Message'])
    throw new ApiError(
      `Akcija nerasta arba neteisinga užklausa. (${detail})`,
      'not_found',
    )
  }

  return data
}

// Visos užklausos eina per čia: pirma talpykla, tada jau vykstanti ta pati
// užklausa, tik tada naujas kreipimasis. Klaidos nesaugomos.
async function request(params) {
  const key = new URLSearchParams(params).toString()

  const cached = readCache(key)
  if (cached) return cached

  if (pendingRequests.has(key)) return pendingRequests.get(key)

  const promise = fetchFromApi(params)
    .then((data) => {
      writeCache(key, data)
      return data
    })
    .finally(() => pendingRequests.delete(key))

  pendingRequests.set(key, promise)
  return promise
}

// Akcijų paieška pagal simbolį ar pavadinimą
export async function searchSymbols(keywords) {
  const data = await request({ function: 'SYMBOL_SEARCH', keywords })

  return (data.bestMatches ?? []).map((match) => ({
    symbol: match['1. symbol'],
    name: match['2. name'],
    region: match['4. region'],
    currency: match['8. currency'],
  }))
}

// Dabartinė akcijos kaina
export async function getQuote(symbol) {
  const data = await request({ function: 'GLOBAL_QUOTE', symbol })
  const quote = data['Global Quote']

  if (!quote || !quote['05. price']) {
    throw new ApiError(`Akcija „${symbol}“ nerasta`, 'not_found')
  }

  return {
    symbol: quote['01. symbol'],
    price: Number(quote['05. price']),
    change: Number(quote['09. change']),
    changePercent: Number.parseFloat(quote['10. change percent']),
    date: quote['07. latest trading day'],
  }
}

// Dienos kainų istorija (seniausia -> naujausia), skirta grafikams
export async function getDailyPrices(symbol) {
  const data = await request({ function: 'TIME_SERIES_DAILY', symbol })
  const series = data['Time Series (Daily)']

  if (!series) {
    throw new ApiError(`Nėra kainų duomenų akcijai „${symbol}“`, 'not_found')
  }

  return Object.entries(series)
    .map(([date, values]) => ({ date, close: Number(values['4. close']) }))
    .reverse()
}

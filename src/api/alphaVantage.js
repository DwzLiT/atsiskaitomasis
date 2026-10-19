const BASE_URL = 'https://www.alphavantage.co/query'
const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY

export class ApiError extends Error {
  constructor(message, type) {
    super(message)
    this.name = 'ApiError'
    // type: 'config' | 'network' | 'limit' | 'not_found' | 'api'
    this.type = type
  }
}

async function request(params) {
  if (!API_KEY) {
    throw new ApiError('Nerastas API raktas (VITE_ALPHA_VANTAGE_KEY faile .env)', 'config')
  }

  const url = `${BASE_URL}?${new URLSearchParams({ ...params, apikey: API_KEY })}`

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
  if (data.Note || data.Information) {
    throw new ApiError('Viršytas API užklausų limitas. Pabandykite vėliau.', 'limit')
  }
  if (data['Error Message']) {
    throw new ApiError('Akcija nerasta arba neteisinga užklausa', 'not_found')
  }

  return data
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
    changePercent: quote['10. change percent'],
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

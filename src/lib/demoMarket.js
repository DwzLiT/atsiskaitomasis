// Demonstraciniai rinkos duomenys, naudojami kai Alpha Vantage nepasiekiamas
// (pvz. pasiektas dienos limitas) ir akcijos kainos nėra išsaugotos.
// Kainos yra apytikslės ir NĖRA tikros rinkos kainos – UI jas pažymi.

const DEMO_STOCKS = [
  { symbol: 'AAPL', company: 'Apple Inc.', price: 228 },
  { symbol: 'MSFT', company: 'Microsoft Corporation', price: 425 },
  { symbol: 'GOOGL', company: 'Alphabet Inc. (Class A)', price: 172 },
  { symbol: 'AMZN', company: 'Amazon.com Inc.', price: 186 },
  { symbol: 'META', company: 'Meta Platforms Inc.', price: 560 },
  { symbol: 'NVDA', company: 'NVIDIA Corporation', price: 130 },
  { symbol: 'TSLA', company: 'Tesla Inc.', price: 245 },
  { symbol: 'NFLX', company: 'Netflix Inc.', price: 700 },
  { symbol: 'AMD', company: 'Advanced Micro Devices Inc.', price: 155 },
  { symbol: 'INTC', company: 'Intel Corporation', price: 22 },
  { symbol: 'IBM', company: 'International Business Machines', price: 215 },
  { symbol: 'ORCL', company: 'Oracle Corporation', price: 170 },
  { symbol: 'ADBE', company: 'Adobe Inc.', price: 500 },
  { symbol: 'CRM', company: 'Salesforce Inc.', price: 290 },
  { symbol: 'PYPL', company: 'PayPal Holdings Inc.', price: 78 },
  { symbol: 'UBER', company: 'Uber Technologies Inc.', price: 75 },
  { symbol: 'SPOT', company: 'Spotify Technology S.A.', price: 380 },
  { symbol: 'DIS', company: 'The Walt Disney Company', price: 95 },
  { symbol: 'KO', company: 'The Coca-Cola Company', price: 70 },
  { symbol: 'PEP', company: 'PepsiCo Inc.', price: 168 },
  { symbol: 'MCD', company: "McDonald's Corporation", price: 295 },
  { symbol: 'NKE', company: 'Nike Inc.', price: 82 },
  { symbol: 'WMT', company: 'Walmart Inc.', price: 80 },
  { symbol: 'JPM', company: 'JPMorgan Chase & Co.', price: 215 },
  { symbol: 'V', company: 'Visa Inc.', price: 280 },
  { symbol: 'MA', company: 'Mastercard Inc.', price: 490 },
  { symbol: 'BAC', company: 'Bank of America Corporation', price: 40 },
  { symbol: 'XOM', company: 'Exxon Mobil Corporation', price: 118 },
  { symbol: 'JNJ', company: 'Johnson & Johnson', price: 160 },
  { symbol: 'PFE', company: 'Pfizer Inc.', price: 29 },
  { symbol: 'BA', company: 'The Boeing Company', price: 155 },
  { symbol: 'SBUX', company: 'Starbucks Corporation', price: 97 },
]

const BY_SYMBOL = new Map(DEMO_STOCKS.map((stock) => [stock.symbol, stock]))
const HISTORY_DAYS = 100

// Deterministinis pseudo-atsitiktinis skaičius [0, 1) pagal tekstą,
// kad ta pati akcija tą pačią dieną visada turėtų tą pačią kainą.
function seeded(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 100000) / 100000
}

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

// Paskutinė darbo diena (savaitgaliais rinka neveikia)
function lastTradingDay(from = new Date()) {
  const day = new Date(Date.UTC(from.getFullYear(), from.getMonth(), from.getDate()))
  while (day.getUTCDay() === 0 || day.getUTCDay() === 6) day.setUTCDate(day.getUTCDate() - 1)
  return day
}

function round2(value) {
  return Math.round(value * 100) / 100
}

export function isDemoSymbol(symbol) {
  return BY_SYMBOL.has(String(symbol || '').trim().toUpperCase())
}

export function getDemoCompany(symbol) {
  return BY_SYMBOL.get(String(symbol || '').trim().toUpperCase())?.company ?? null
}

// Šiandienos demonstracinė kaina (bazinė ±~2 %) su dienos pokyčiu.
export function getDemoQuote(symbol) {
  const stock = BY_SYMBOL.get(String(symbol || '').trim().toUpperCase())
  if (!stock) return null

  const today = isoDate(lastTradingDay())
  const drift = (seeded(`${stock.symbol}:${today}:level`) - 0.5) * 0.04
  const changePercent = round2((seeded(`${stock.symbol}:${today}:change`) - 0.5) * 4)
  const price = round2(stock.price * (1 + drift))
  const previous = price / (1 + changePercent / 100)

  return {
    symbol: stock.symbol,
    company: stock.company,
    price,
    change: round2(price - previous),
    changePercent,
    date: today,
  }
}

// Paieška demonstracinių akcijų sąraše (tas pats formatas kaip searchSymbols).
export function searchDemoStocks(query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return []

  return DEMO_STOCKS.filter(
    (stock) => stock.symbol.toLowerCase().includes(q) || stock.company.toLowerCase().includes(q),
  )
    .sort((a, b) => Number(b.symbol.toLowerCase() === q) - Number(a.symbol.toLowerCase() === q))
    .slice(0, 10)
    .map((stock) => ({
      symbol: stock.symbol,
      name: stock.company,
      region: 'Demo',
      currency: 'USD',
      fromDemo: true,
    }))
}

// ~100 darbo dienų uždarymo kainų istorija (seniausia -> naujausia),
// kuri baigiasi `endPrice`. Tinka bet kuriai akcijai, kurios kaina žinoma.
export function getDemoHistory(symbol, endPrice) {
  const key = String(symbol || '').trim().toUpperCase()
  if (!key || !Number.isFinite(endPrice) || endPrice <= 0) return []

  const rows = []
  const day = lastTradingDay()
  let close = endPrice

  while (rows.length < HISTORY_DAYS) {
    const date = isoDate(day)
    rows.push({ date, close: round2(close) })
    // Einame atgal: vakar dienos kaina = šiandienos / (1 + dienos grąža)
    const dailyReturn = (seeded(`${key}:${date}:history`) - 0.48) * 0.035
    close /= 1 + dailyReturn
    do day.setUTCDate(day.getUTCDate() - 1)
    while (day.getUTCDay() === 0 || day.getUTCDay() === 6)
  }

  return rows.reverse()
}

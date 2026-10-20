import { useState } from 'react'
import PriceChart from '../components/charts/PriceChart'
import StockSearch from '../components/StockSearch'

// `params` ({ symbol, company }) opens a stock directly, e.g. from the watchlist.
export default function Trade({ params }) {
  const [symbol, setSymbol] = useState(params?.symbol ?? null)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Prekyba</h1>
          <p>Suraskite akciją ir pateikite virtualų pirkimo / pardavimo pavedimą.</p>
        </div>
      </div>

      <StockSearch initialStock={params} onSelect={setSymbol} />

      <PriceChart symbol={symbol} />
    </div>
  )
}

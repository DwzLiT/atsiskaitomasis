import Card from '../components/ui/Card'
import ChartPlaceholder from '../components/ui/ChartPlaceholder'
import StockSearch from '../components/StockSearch'

export default function Trade() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Trade</h1>
          <p>Search for a stock, then place a virtual BUY / SELL order.</p>
        </div>
      </div>

      <StockSearch />

      <Card title="Price chart">
        <ChartPlaceholder
          title="Selected symbol price"
          description="Reserved for the selected stock price chart. Charts will be added by the team."
        />
      </Card>
    </div>
  )
}

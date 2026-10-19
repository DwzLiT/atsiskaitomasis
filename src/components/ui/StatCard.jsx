import Card from './Card'
import Badge from './Badge'

export default function StatCard({ label, value, hint, tone, isDemo }) {
  const valueClass =
    tone === 'positive'
      ? 'stat-card__value positive'
      : tone === 'negative'
        ? 'stat-card__value negative'
        : 'stat-card__value'

  return (
    <Card>
      <div className="stat-card">
        <div className="stat-card__top">
          <span className="stat-card__label">{label}</span>
          {isDemo ? <Badge variant="demo">DEMO</Badge> : null}
        </div>
        <div className={valueClass}>{value}</div>
        {hint ? <p className="stat-card__hint">{hint}</p> : null}
      </div>
    </Card>
  )
}

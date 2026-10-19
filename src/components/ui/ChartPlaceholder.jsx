import Badge from './Badge'

export default function ChartPlaceholder({ title, description }) {
  return (
    <div className="chart-placeholder" role="img" aria-label={title}>
      <div className="chart-placeholder__icon" aria-hidden="true" />
      <div className="chart-placeholder__title">{title}</div>
      <p className="chart-placeholder__text">
        {description || 'Chart placeholder — charts will be added by the team.'}
      </p>
      <Badge variant="demo">DEMO · Placeholder</Badge>
    </div>
  )
}

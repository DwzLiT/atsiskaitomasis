export default function Card({ title, action, children, className = '' }) {
  return (
    <section className={`card ${className}`.trim()}>
      {(title || action) && (
        <div className="card__header">
          {title ? <h2 className="card__title">{title}</h2> : <span />}
          {action}
        </div>
      )}
      <div className="card__body">{children}</div>
    </section>
  )
}

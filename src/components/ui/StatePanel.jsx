import Button from './Button'

const DEFAULT_MESSAGES = {
  loading: 'Kraunama…',
  error: 'Įvyko klaida.',
  empty: 'Kol kas nėra ką rodyti.',
}

export default function StatePanel({
  variant = 'empty',
  message,
  onRetry,
  retryLabel = 'Bandyti dar kartą',
}) {
  return (
    <div className={`state-panel state-panel--${variant}`} role="status">
      {variant === 'loading' ? (
        <div className="state-panel__spinner" aria-hidden="true" />
      ) : null}
      <p className="state-panel__message">
        {message || DEFAULT_MESSAGES[variant] || DEFAULT_MESSAGES.empty}
      </p>
      {variant === 'error' && onRetry ? (
        <Button variant="ghost" type="button" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  )
}

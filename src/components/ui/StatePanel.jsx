import Button from './Button'

const DEFAULT_MESSAGES = {
  loading: 'Loading…',
  error: 'Something went wrong.',
  empty: 'Nothing to show yet.',
}

export default function StatePanel({
  variant = 'empty',
  message,
  onRetry,
  retryLabel = 'Retry',
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

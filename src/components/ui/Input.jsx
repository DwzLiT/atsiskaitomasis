export default function Input({
  id,
  label,
  hint,
  type = 'text',
  className = '',
  ...props
}) {
  const inputId = id || props.name

  return (
    <div className={`field ${className}`.trim()}>
      {label ? (
        <label className="field__label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <input id={inputId} type={type} className="field__input" {...props} />
      {hint ? <span className="field__hint">{hint}</span> : null}
    </div>
  )
}

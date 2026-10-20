// Small segmented control for chart ranges, e.g. 1W / 1M / All.
export default function RangeTabs({ ranges, value, onChange, label = 'Grafiko laikotarpis' }) {
  return (
    <div className="range-tabs" role="group" aria-label={label}>
      {ranges.map((range) => (
        <button
          key={range.id}
          type="button"
          className={range.id === value ? 'range-tabs__btn range-tabs__btn--active' : 'range-tabs__btn'}
          aria-pressed={range.id === value}
          onClick={() => onChange(range.id)}
        >
          {range.label}
        </button>
      ))}
    </div>
  )
}

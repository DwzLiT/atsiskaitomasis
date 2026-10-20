import { useEffect, useId, useRef, useState } from 'react'

const HEIGHT = 220
const PAD = { top: 12, right: 12, bottom: 24, left: 56 }

// Tracks the rendered width of an element so the SVG can be drawn in real
// pixels (text and dots keep their size on every screen).
function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, width]
}

function formatDate(t, withTime) {
  const date = new Date(t)
  return withTime
    ? date.toLocaleString('lt-LT', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('lt-LT', { month: 'short', day: 'numeric' })
}

/**
 * Small dependency-free SVG line chart.
 *
 * points:   [{ t: timestamp (ms), value }] sorted oldest -> newest
 * baseline: optional value drawn as a dashed line (e.g. 10 000 start, 0 P/L)
 * split:    colour above the baseline green and below it red
 * markers:  optional [{ t, value, side: 'BUY' | 'SELL', label }] dots
 */
export default function LineChart({
  points,
  baseline,
  split = false,
  markers = [],
  formatValue,
  formatAxis = formatValue,
  ariaLabel,
}) {
  const [wrapRef, width] = useWidth()
  const [hover, setHover] = useState(null)
  const clipId = useId()

  const innerW = Math.max(width - PAD.left - PAD.right, 1)
  const innerH = HEIGHT - PAD.top - PAD.bottom

  const values = points.map((p) => p.value)
  if (baseline != null) values.push(baseline)
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  const pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.02 || 1
  lo -= pad
  hi += pad

  const t0 = points[0].t
  const t1 = points[points.length - 1].t
  const span = t1 - t0 || 1
  const x = (t) => PAD.left + ((t - t0) / span) * innerW
  const y = (v) => PAD.top + ((hi - v) / (hi - lo)) * innerH

  const linePath = points
    .map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(' ')
  const baseY = y(baseline ?? lo)
  const areaPath = `${linePath} L${x(t1).toFixed(1)} ${baseY} L${x(t0).toFixed(1)} ${baseY} Z`

  const up = points[points.length - 1].value >= (baseline ?? points[0].value)
  const tone = up ? 'up' : 'down'
  const ticks = [hi - pad, (hi + lo) / 2, lo + pad]
  const withTime = span < 3 * 24 * 60 * 60 * 1000

  function handlePointerMove(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const px = event.clientX - rect.left
    let nearest = 0
    points.forEach((p, i) => {
      if (Math.abs(x(p.t) - px) < Math.abs(x(points[nearest].t) - px)) nearest = i
    })
    setHover(nearest)
  }

  const hovered = hover == null ? null : points[hover]
  const hoveredMarkers = hovered ? markers.filter((m) => m.t === hovered.t) : []

  return (
    <div className="line-chart" ref={wrapRef}>
      {width > 0 ? (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={ariaLabel}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHover(null)}
        >
          {split ? (
            <defs>
              <clipPath id={`${clipId}-up`}>
                <rect x="0" y="0" width={width} height={baseY} />
              </clipPath>
              <clipPath id={`${clipId}-down`}>
                <rect x="0" y={baseY} width={width} height={HEIGHT} />
              </clipPath>
            </defs>
          ) : null}

          {ticks.map((v) => (
            <g key={v}>
              <line className="line-chart__grid" x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} />
              <text className="line-chart__label" x={PAD.left - 8} y={y(v) + 4} textAnchor="end">
                {formatAxis(v)}
              </text>
            </g>
          ))}

          {split ? (
            <>
              <path className="line-chart__area line-chart__area--up" d={areaPath} clipPath={`url(#${clipId}-up)`} />
              <path className="line-chart__area line-chart__area--down" d={areaPath} clipPath={`url(#${clipId}-down)`} />
              <path className="line-chart__line line-chart__line--up" d={linePath} clipPath={`url(#${clipId}-up)`} />
              <path className="line-chart__line line-chart__line--down" d={linePath} clipPath={`url(#${clipId}-down)`} />
            </>
          ) : (
            <>
              <path className={`line-chart__area line-chart__area--${tone}`} d={areaPath} />
              <path className={`line-chart__line line-chart__line--${tone}`} d={linePath} />
            </>
          )}

          {baseline != null ? (
            <line className="line-chart__baseline" x1={PAD.left} x2={width - PAD.right} y1={baseY} y2={baseY} />
          ) : null}

          {markers.map((m) => (
            <circle
              key={`${m.t}-${m.label}`}
              className={`line-chart__marker line-chart__marker--${m.side === 'BUY' ? 'up' : 'down'}`}
              cx={x(m.t)}
              cy={y(m.value)}
              r="4.5"
            />
          ))}

          <text className="line-chart__label" x={PAD.left} y={HEIGHT - 6}>
            {formatDate(t0, withTime)}
          </text>
          <text className="line-chart__label" x={width - PAD.right} y={HEIGHT - 6} textAnchor="end">
            {formatDate(t1, withTime)}
          </text>

          {hovered ? (
            <>
              <line className="line-chart__cursor" x1={x(hovered.t)} x2={x(hovered.t)} y1={PAD.top} y2={PAD.top + innerH} />
              <circle className="line-chart__dot" cx={x(hovered.t)} cy={y(hovered.value)} r="4" />
            </>
          ) : null}

          {/* Transparent layer so the whole plot reacts to the pointer. */}
          <rect x={PAD.left} y={PAD.top} width={innerW} height={innerH} fill="transparent" />
        </svg>
      ) : null}

      {hovered ? (
        <div
          className="line-chart__tooltip"
          style={{
            left: Math.min(x(hovered.t) + 12, width - 190),
            top: Math.max(y(hovered.value) - 52, 0),
          }}
        >
          <span className="line-chart__tooltip-date">{formatDate(hovered.t, withTime)}</span>
          <strong>{formatValue(hovered.value)}</strong>
          {hoveredMarkers.map((m) => (
            <span key={m.label}>{m.label}</span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

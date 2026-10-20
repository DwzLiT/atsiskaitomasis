import { useEffect, useState } from 'react'
import { api } from '../api'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import StatePanel from '../components/ui/StatePanel'

// Pick the traders you trust: they get to see your cash, holdings and orders
// in their own Portfolio, History and Trade. Each tick is saved right away.
// Your own trader is always included and cannot be unchecked.
export default function Traders() {
  const [traders, setTraders] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState(null)

  function load() {
    api
      .assignableTraders()
      .then((list) => {
        setError('')
        setTraders(list)
      })
      .catch((err) => setError(err.message))
  }

  useEffect(load, [])

  function setSelected(id, selected) {
    setTraders((list) => list.map((t) => (t.id === id ? { ...t, selected } : t)))
  }

  async function toggle(trader) {
    const selected = !trader.selected
    setMessage(null)
    setSelected(trader.id, selected)
    try {
      await api.setTraderTrusted(trader.id, selected)
    } catch (err) {
      setSelected(trader.id, !selected)
      setMessage({ type: 'error', text: err.message })
    }
  }

  function renderList() {
    if (error) return <StatePanel variant="error" message={error} onRetry={load} />
    if (!traders) return <StatePanel variant="loading" message="Loading traders…" />
    if (traders.length === 0) return <StatePanel variant="empty" message="No traders yet." />
    return (
      <>
        <ul className="trader-list">
          {traders.map((t) => (
            <li key={t.id}>
              <label className="trader-list__item">
                <input
                  type="checkbox"
                  checked={t.selected}
                  disabled={t.own}
                  onChange={() => toggle(t)}
                />
                <span className="trader-list__name">{t.name}</span>
                {t.own ? <Badge variant="demo">You</Badge> : null}
              </label>
            </li>
          ))}
        </ul>
        {message ? (
          <p className="ui-note" role="alert">
            {message.text}
          </p>
        ) : null}
      </>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Traders</h1>
          <p>Tick the traders you trust. They see your holdings and orders; you see those of the traders who trust you.</p>
        </div>
      </div>

      <Card title="Traders I trust">{renderList()}</Card>
    </div>
  )
}

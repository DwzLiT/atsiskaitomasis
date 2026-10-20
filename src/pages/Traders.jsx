import { useEffect, useState } from 'react'
import { api } from '../api'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import StatePanel from '../components/ui/StatePanel'

// Pick the traders you trust: they get to see your cash, holdings and orders
// in their own Portfolio, History and Trade. Your own
// trader is always included and cannot be unchecked.
export default function Traders() {
  const [traders, setTraders] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [error, setError] = useState('')
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  function load() {
    api
      .assignableTraders()
      .then((list) => {
        setError('')
        setTraders(list)
        setSelected(new Set(list.filter((t) => t.selected).map((t) => t.id)))
      })
      .catch((err) => setError(err.message))
  }

  useEffect(load, [])

  function toggle(id) {
    setMessage(null)
    setSelected((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      const ids = traders.filter((t) => !t.own && selected.has(t.id)).map((t) => t.id)
      await api.saveAssignedTraders(ids)
      setMessage({ type: 'success', text: 'Saved. These traders can now see your data.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
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
                  checked={selected.has(t.id)}
                  disabled={t.own}
                  onChange={() => toggle(t.id)}
                />
                <span className="trader-list__name">{t.name}</span>
                {t.own ? <Badge variant="demo">You</Badge> : null}
              </label>
            </li>
          ))}
        </ul>
        <div className="btn-row">
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save traders'}
          </Button>
        </div>
        {message ? (
          <p className="ui-note" role={message.type === 'error' ? 'alert' : 'status'}>
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

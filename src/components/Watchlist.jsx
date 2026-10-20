import { useState } from 'react'
import useSymbolSearch from '../lib/useSymbolSearch'
import useWatchlist from '../lib/useWatchlist'
import { formatChange, formatDateTime, formatMoney } from '../utils/format'
import Button from './ui/Button'
import Card from './ui/Card'
import Input from './ui/Input'
import StatePanel from './ui/StatePanel'
import Table from './ui/Table'

function toneOf(value) {
  return value > 0 ? 'positive' : value < 0 ? 'negative' : ''
}

// Saved watchlist for the logged-in user. `onOpen(symbol, company)` opens the
// stock on the Trade page.
export default function Watchlist({ user, onOpen }) {
  const { items, loading, error, add, remove, refreshPrices } = useWatchlist(user?.id)
  const [symbol, setSymbol] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const search = useSymbolSearch(symbol)
  const showDropdown = open && symbol.trim() !== ''

  async function run(action, success) {
    setBusy(true)
    setMessage(null)
    try {
      await action()
      if (success) setMessage({ type: 'success', text: success })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  function addStock(value, company = null) {
    setSymbol('')
    setOpen(false)
    setActive(-1)
    if (items.some((item) => item.symbol === value)) {
      setMessage({ type: 'success', text: `${value} jau yra stebimų sąraše.` })
      return
    }
    run(() => add(value, company), `${value} pridėta prie stebimų.`)
  }

  // Enter / mygtukas: pažymėtas rezultatas, kitaip pirmas rezultatas,
  // o jei paieška dar nebaigta – tiesiog įvestas simbolis.
  function handleAdd(event) {
    event.preventDefault()
    const pick = search.results[active] ?? search.results[0]
    if (pick) {
      addStock(pick.symbol.toUpperCase(), pick.name)
      return
    }
    const value = symbol.trim().toUpperCase()
    if (value) addStock(value)
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      setOpen(false)
    } else if (event.key === 'ArrowDown' && search.results.length > 0) {
      event.preventDefault()
      setOpen(true)
      setActive((i) => (i + 1) % search.results.length)
    } else if (event.key === 'ArrowUp' && search.results.length > 0) {
      event.preventDefault()
      setActive((i) => (i <= 0 ? search.results.length - 1 : i - 1))
    }
  }

  function renderDropdown() {
    if (search.isSearching) {
      return <p className="symbol-dropdown__status">Ieškoma...</p>
    }
    if (search.error) {
      return <p className="symbol-dropdown__status stock-error">{search.error}</p>
    }
    if (search.results.length === 0) {
      return <p className="symbol-dropdown__status">Nieko nerasta.</p>
    }
    return (
      <ul className="symbol-dropdown__list" id="watch-symbol-results" role="listbox">
        {search.results.map((match, index) => {
          const value = match.symbol.toUpperCase()
          const saved = items.some((item) => item.symbol === value)
          return (
            <li key={match.symbol} role="option" aria-selected={index === active}>
              <button
                type="button"
                className={
                  index === active
                    ? 'symbol-dropdown__item symbol-dropdown__item--active'
                    : 'symbol-dropdown__item'
                }
                // mousedown, kad laukelis neprarastų fokuso prieš paspaudimą
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => addStock(value, match.name)}
              >
                <span className="stock-symbol">{match.symbol}</span>
                <span className="stock-name">{match.name}</span>
                <span className="stock-region">{saved ? '✓ sąraše' : match.region}</span>
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  const columns = [
    { key: 'symbol', label: 'Simbolis' },
    { key: 'company', label: 'Įmonė' },
    {
      key: 'price',
      label: 'Kaina',
      align: 'right',
      render: (row) => (row.price == null ? '—' : formatMoney(row.price)),
    },
    {
      key: 'changePercent',
      label: 'Pokytis (%)',
      align: 'right',
      render: (row) => (
        <span className={`mono ${toneOf(row.changePercent)}`.trim()}>
          {formatChange(row.changePercent)}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      label: 'Atnaujinta',
      align: 'right',
      render: (row) => formatDateTime(row.updatedAt),
    },
    {
      key: 'actions',
      label: 'Veiksmai',
      align: 'right',
      render: (row) => (
        <div className="table-actions">
          <Button
            variant="ghost"
            className="btn--compact"
            onClick={() => onOpen(row.symbol, row.company)}
          >
            Prekiauti
          </Button>
          <Button
            variant="ghost"
            className="btn--compact"
            disabled={busy}
            onClick={() => run(() => remove(row.symbol))}
          >
            Pašalinti
          </Button>
        </div>
      ),
    },
  ]

  function renderBody() {
    if (!user) {
      return <StatePanel variant="empty" message="Prisijunkite, kad galėtumėte sudaryti stebimų sąrašą." />
    }
    if (loading) {
      return <StatePanel variant="loading" message="Kraunamas stebimų sąrašas…" />
    }
    if (error) {
      return <StatePanel variant="error" message={error} />
    }
    if (items.length === 0) {
      return <StatePanel variant="empty" message="Stebimų sąrašas tuščias. Pridėkite simbolį aukščiau." />
    }
    return <Table columns={columns} rows={items} emptyMessage="Stebimų sąrašas tuščias." />
  }

  return (
    <Card
      title="Stebimos akcijos"
      action={
        user && items.length > 0 ? (
          <Button
            variant="ghost"
            className="btn--compact"
            disabled={busy}
            onClick={() => run(refreshPrices, 'Kainos atnaujintos.')}
          >
            {busy ? 'Vykdoma…' : 'Atnaujinti kainas'}
          </Button>
        ) : null
      }
    >
      <form className="watchlist-form" onSubmit={handleAdd}>
        <div className="symbol-search">
          <Input
            id="watch-symbol"
            name="watchSymbol"
            label="Akcijos simbolis arba pavadinimas"
            placeholder="GOOGL, Microsoft"
            value={symbol}
            onChange={(event) => {
              setSymbol(event.target.value)
              setOpen(true)
              setActive(-1)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls="watch-symbol-results"
            aria-autocomplete="list"
            disabled={!user || busy}
          />
          {showDropdown ? <div className="symbol-dropdown">{renderDropdown()}</div> : null}
        </div>
        <div className="watchlist-form__action">
          <Button variant="primary" type="submit" disabled={!user || busy}>
            Pridėti prie stebimų
          </Button>
        </div>
      </form>

      {message ? (
        <p className={`auth-message auth-message--${message.type}`} role="alert">
          {message.text}
        </p>
      ) : null}

      {renderBody()}

      <p className="ui-note watchlist-note">
        Kainos gaunamos iš Alpha Vantage (nemokamas planas – apie 25 užklausos
        per dieną), todėl jos atnaujinamos paspaudus „Atnaujinti kainas“,
        ieškant akcijos arba prekiaujant.
      </p>
    </Card>
  )
}

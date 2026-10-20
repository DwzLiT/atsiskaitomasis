import Button from '../ui/Button'
import '../../styles/auth.css'

const NAV_ITEMS = [
  { id: 'portfolio', label: 'Portfelis' },
  { id: 'trade', label: 'Prekyba' },
  { id: 'history', label: 'Istorija' },
]

export default function Navbar({ currentPage, onNavigate, user, onSignOut }) {
  return (
    <header className="navbar">
      <div className="navbar__inner">
        <div className="navbar__brand">
          <div className="navbar__mark" aria-hidden="true">
            RP
          </div>
          <div>
            <div className="navbar__title">Real Paper Trading</div>
            <span className="navbar__subtitle">Simuliatorius</span>
          </div>
        </div>

        <nav className="navbar__nav" aria-label="Pagrindinis meniu">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                currentPage === item.id
                  ? 'navbar__link navbar__link--active'
                  : 'navbar__link'
              }
              onClick={() => onNavigate(item.id)}
              aria-current={currentPage === item.id ? 'page' : undefined}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="navbar__account">
          {user ? (
            <>
              <span className="navbar__user" title={user.email}>
                {user.email}
              </span>
              <Button variant="ghost" className="btn--compact" onClick={onSignOut}>
                Atsijungti
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                className="btn--compact"
                onClick={() => onNavigate('login')}
              >
                Prisijungti
              </Button>
              <Button
                variant="primary"
                className="btn--compact"
                onClick={() => onNavigate('register')}
              >
                Registruotis
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

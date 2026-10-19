const NAV_ITEMS = [
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'trade', label: 'Trade' },
  { id: 'history', label: 'History' },
]

export default function Navbar({ currentPage, onNavigate }) {
  return (
    <header className="navbar">
      <div className="navbar__inner">
        <div className="navbar__brand">
          <div className="navbar__mark" aria-hidden="true">
            RP
          </div>
          <div>
            <div className="navbar__title">Real Paper Trading</div>
            <span className="navbar__subtitle">Simulator</span>
          </div>
        </div>

        <nav className="navbar__nav" aria-label="Main">
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
      </div>
    </header>
  )
}

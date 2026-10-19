import Navbar from './Navbar'

export default function Layout({ currentPage, onNavigate, children }) {
  return (
    <div className="app-layout">
      <Navbar currentPage={currentPage} onNavigate={onNavigate} />
      <main className="app-main">{children}</main>
    </div>
  )
}

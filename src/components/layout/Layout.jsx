import Navbar from './Navbar'

export default function Layout({
  currentPage,
  onNavigate,
  user,
  onSignOut,
  children,
}) {
  return (
    <div className="app-layout">
      <Navbar
        currentPage={currentPage}
        onNavigate={onNavigate}
        user={user}
        onSignOut={onSignOut}
      />
      <main className="app-main">{children}</main>
    </div>
  )
}

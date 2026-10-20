import { useState } from 'react'
import Layout from './components/layout/Layout'
import { supabase } from './lib/supabase'
import useAuth from './lib/useAuth'
import History from './pages/History'
import Login from './pages/Login'
import Portfolio from './pages/Portfolio'
import Register from './pages/Register'
import Trade from './pages/Trade'
import './App.css'
import './styles/components.css'

const PAGES = {
  portfolio: Portfolio,
  trade: Trade,
  history: History,
  login: Login,
  register: Register,
}

function App() {
  // params lets one page open another with context, e.g. a watchlist
  // symbol opened on Trade.
  const [route, setRoute] = useState({ page: 'portfolio', params: null, key: 0 })
  const { user } = useAuth()
  const currentPage = route.page
  const Page = PAGES[currentPage] ?? Portfolio

  function navigate(page, params = null) {
    setRoute((prev) => ({ page, params, key: prev.key + 1 }))
  }

  async function handleSignOut() {
    await supabase?.auth.signOut()
    navigate('login')
  }

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={navigate}
      user={user}
      onSignOut={handleSignOut}
    >
      <Page key={route.key} onNavigate={navigate} params={route.params} />
    </Layout>
  )
}

export default App

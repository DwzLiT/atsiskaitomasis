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
  const [currentPage, setCurrentPage] = useState('portfolio')
  const { user } = useAuth()
  const Page = PAGES[currentPage] ?? Portfolio

  async function handleSignOut() {
    await supabase?.auth.signOut()
    setCurrentPage('login')
  }

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      user={user}
      onSignOut={handleSignOut}
    >
      <Page onNavigate={setCurrentPage} />
    </Layout>
  )
}

export default App

import { useState } from 'react'
import Layout from './components/layout/Layout'
import History from './pages/History'
import Portfolio from './pages/Portfolio'
import Trade from './pages/Trade'
import './App.css'
import './styles/components.css'

const PAGES = {
  portfolio: Portfolio,
  trade: Trade,
  history: History,
}

function App() {
  const [currentPage, setCurrentPage] = useState('portfolio')
  const Page = PAGES[currentPage] ?? Portfolio

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      <Page />
    </Layout>
  )
}

export default App

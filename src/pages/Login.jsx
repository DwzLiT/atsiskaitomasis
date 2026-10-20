import { useState } from 'react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { supabase } from '../lib/supabase'
import { toLithuanianError } from '../utils/errors'
import '../styles/auth.css'

export default function Login({ onNavigate }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!supabase) {
      setError('Prisijungti negalima: Supabase nesukonfigūruotas.')
      return
    }

    if (!email.trim() || !password) {
      setError('Įveskite el. paštą ir slaptažodį.')
      return
    }

    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(toLithuanianError(signInError.message))
      return
    }

    onNavigate('portfolio')
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Prisijungimas</h1>
          <p>Prisijunkite prie savo virtualios prekybos paskyros.</p>
        </div>
      </div>

      <Card title="Sveiki sugrįžę" className="auth-card">
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <Input
            id="login-email"
            name="email"
            label="El. paštas"
            type="email"
            placeholder="vardas@pastas.lt"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={loading}
            required
          />

          <Input
            id="login-password"
            name="password"
            label="Slaptažodis"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading}
            required
          />

          {error ? (
            <p className="auth-message auth-message--error" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" variant="primary" block disabled={loading}>
            {loading ? 'Jungiamasi…' : 'Prisijungti'}
          </Button>

          <p className="auth-switch">
            Neturite paskyros?{' '}
            <button
              type="button"
              className="auth-switch__link"
              onClick={() => onNavigate('register')}
            >
              Registruotis
            </button>
          </p>
        </form>
      </Card>
    </div>
  )
}

import { useState } from 'react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { supabase } from '../lib/supabase'
import '../styles/auth.css'

function friendlyError(message) {
  if (/email not confirmed/i.test(message)) {
    return 'Please confirm your email first. Check your inbox for the link.'
  }
  if (/invalid login credentials/i.test(message)) {
    return 'Wrong email or password.'
  }
  return message
}

export default function Login({ onNavigate }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!supabase) {
      setError('Login is not available: Supabase is not configured.')
      return
    }

    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }

    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(friendlyError(signInError.message))
      return
    }

    onNavigate('portfolio')
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Log in</h1>
          <p>Sign in to your paper trading account.</p>
        </div>
      </div>

      <Card title="Welcome back" className="auth-card">
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <Input
            id="login-email"
            name="email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={loading}
            required
          />

          <Input
            id="login-password"
            name="password"
            label="Password"
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
            {loading ? 'Logging in…' : 'Log in'}
          </Button>

          <p className="auth-switch">
            No account yet?{' '}
            <button
              type="button"
              className="auth-switch__link"
              onClick={() => onNavigate('register')}
            >
              Register
            </button>
          </p>
        </form>
      </Card>
    </div>
  )
}

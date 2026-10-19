import { useState } from 'react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { supabase } from '../lib/supabase'
import '../styles/auth.css'

const MIN_PASSWORD_LENGTH = 6

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!supabase) {
      setError('Registration is not available: Supabase is not configured.')
      return
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    setPassword('')
    setConfirmPassword('')
    setSuccess(
      data.session
        ? 'Account created. You are now signed in.'
        : 'Account created. Check your email to confirm your address.',
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Register</h1>
          <p>Create an account to save your paper trading portfolio.</p>
        </div>
      </div>

      <Card title="Create account" className="auth-card">
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <Input
            id="register-email"
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
            id="register-password"
            name="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
            disabled={loading}
            required
          />

          <Input
            id="register-confirm-password"
            name="confirmPassword"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={loading}
            required
          />

          {error ? (
            <p className="auth-message auth-message--error" role="alert">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="auth-message auth-message--success" role="status">
              {success}
            </p>
          ) : null}

          <Button type="submit" variant="primary" block disabled={loading}>
            {loading ? 'Creating account…' : 'Register'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

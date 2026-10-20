import { useState } from 'react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { supabase } from '../lib/supabase'
import { toLithuanianError } from '../utils/errors'
import '../styles/auth.css'

const MIN_PASSWORD_LENGTH = 6

export default function Register({ onNavigate }) {
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
      setError('Registruotis negalima: Supabase nesukonfigūruotas.')
      return
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Slaptažodis turi būti bent ${MIN_PASSWORD_LENGTH} simbolių.`)
      return
    }

    if (password !== confirmPassword) {
      setError('Slaptažodžiai nesutampa.')
      return
    }

    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (signUpError) {
      setError(toLithuanianError(signUpError.message))
      return
    }

    if (data.session) {
      onNavigate('portfolio')
      return
    }

    setPassword('')
    setConfirmPassword('')
    setSuccess('Paskyra sukurta. Patvirtinkite el. paštą paspaudę nuorodą laiške, tada prisijunkite.')
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Registracija</h1>
          <p>Susikurkite paskyrą, kad jūsų virtualus portfelis būtų išsaugotas.</p>
        </div>
      </div>

      <Card title="Sukurti paskyrą" className="auth-card">
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <Input
            id="register-email"
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
            id="register-password"
            name="password"
            label="Slaptažodis"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            hint={`Bent ${MIN_PASSWORD_LENGTH} simboliai.`}
            disabled={loading}
            required
          />

          <Input
            id="register-confirm-password"
            name="confirmPassword"
            label="Pakartokite slaptažodį"
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
            {loading ? 'Kuriama paskyra…' : 'Registruotis'}
          </Button>

          <p className="auth-switch">
            Jau turite paskyrą?{' '}
            <button
              type="button"
              className="auth-switch__link"
              onClick={() => onNavigate('login')}
            >
              Prisijungti
            </button>
          </p>
        </form>
      </Card>
    </div>
  )
}

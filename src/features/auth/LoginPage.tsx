import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { loginSchema, type LoginFormData } from '@/lib/validators'
import { LOGO_URL } from '@/lib/constants'

export function LoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<LoginFormData>({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const result = loginSchema.safeParse(form)
    if (!result.success) {
      setError(result.error.errors[0]?.message ?? 'Erreur de validation')
      return
    }

    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    if (authError) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }

    navigate('/')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <img src={LOGO_URL} alt="Konectik" className="h-12 mb-8" />

      <div className="w-full max-w-md bg-white rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-primary text-center mb-6">
          Connexion
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">
              Adresse email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              placeholder="vous@entreprise.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">
              Mot de passe
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-full transition disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-primary hover:underline font-medium">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}

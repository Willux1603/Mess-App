import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import { USER_ROLES } from '@/lib/constants'
import { Save } from 'lucide-react'

export function ProfilePage() {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    first_name: profile?.first_name ?? '',
    last_name: profile?.last_name ?? '',
    company: profile?.company ?? '',
    phone: profile?.phone ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setSaved(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    await supabase.from('profiles').update(form).eq('id', profile.id)
    setSaving(false)
    setSaved(true)
  }

  if (!profile) return null

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-primary text-center mb-6">Mon profil</h1>

        <div className="text-center mb-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-light text-primary">
            {USER_ROLES[profile.role]}
          </span>
          <p className="text-sm text-muted mt-2">{profile.email}</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">Prénom</label>
              <input type="text" name="first_name" value={form.first_name} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">Nom</label>
              <input type="text" name="last_name" value={form.last_name} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">Société</label>
            <input type="text" name="company" value={form.company} onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">Téléphone</label>
            <input type="tel" name="phone" value={form.phone} onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
          </div>

          <button type="submit" disabled={saving}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-full transition disabled:opacity-50 flex items-center justify-center gap-2">
            <Save size={18} />
            {saving ? 'Enregistrement...' : saved ? 'Enregistré !' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  )
}

import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { LogOut, Home, PlusCircle, Settings, List, User } from 'lucide-react'
import { LOGO_URL } from '@/lib/constants'

export function AppLayout() {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'technician'

  function isActive(path: string) {
    return location.pathname === path
      ? 'text-primary font-semibold'
      : 'text-muted hover:text-dark'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={LOGO_URL} alt="Konectik" className="h-8" />
          </Link>

          <nav className="flex items-center gap-6">
            {/* Client nav */}
            <Link to="/" className={`flex items-center gap-1.5 text-sm transition ${isActive('/')}`}>
              <Home size={16} />
              <span className="hidden sm:inline">Accueil</span>
            </Link>

            <Link to="/requests/new" className={`flex items-center gap-1.5 text-sm transition ${isActive('/requests/new')}`}>
              <PlusCircle size={16} />
              <span className="hidden sm:inline">Nouvelle demande</span>
            </Link>

            {/* Admin nav */}
            {isAdmin && (
              <Link to="/admin" className={`flex items-center gap-1.5 text-sm transition ${isActive('/admin')}`}>
                <Settings size={16} />
                <span className="hidden sm:inline">Administration</span>
              </Link>
            )}

            {isAdmin && (
              <Link to="/admin/requests" className={`flex items-center gap-1.5 text-sm transition ${isActive('/admin/requests')}`}>
                <List size={16} />
                <span className="hidden sm:inline">Demandes</span>
              </Link>
            )}

            {/* Profile / Logout */}
            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
              <Link to="/profile" className={`flex items-center gap-1.5 text-sm transition ${isActive('/profile')}`}>
                <User size={16} />
                <span className="hidden sm:inline">{profile?.first_name}</span>
              </Link>
              <button
                onClick={signOut}
                className="text-muted hover:text-red-500 transition"
                title="Déconnexion"
              >
                <LogOut size={16} />
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

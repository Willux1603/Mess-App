import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDateTime } from '@/lib/utils'
import { type RequestStatusKey } from '@/lib/constants'
import { Clock, Search, ChevronRight } from 'lucide-react'
import type { Request } from '@/lib/types'

type Filter = 'all' | RequestStatusKey

const FILTERS: { key: Filter; label: string; color: string; activeColor: string }[] = [
  { key: 'all', label: 'Toutes', color: 'text-dark', activeColor: 'bg-dark text-white' },
  { key: 'received', label: 'Reçues', color: 'text-blue-600', activeColor: 'bg-blue-600 text-white' },
  { key: 'assigned', label: 'Attribuées', color: 'text-orange-600', activeColor: 'bg-orange-500 text-white' },
  { key: 'completed', label: 'Terminées', color: 'text-green-600', activeColor: 'bg-green-600 text-white' },
  { key: 'cancelled', label: 'Annulées', color: 'text-red-500', activeColor: 'bg-red-500 text-white' },
]

export function AdminDashboard() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<Filter>('all')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data } = await supabase
      .from('requests')
      .select('*')
      .neq('status', 'draft')
      .order('created_at', { ascending: false })

    setRequests((data as Request[]) ?? [])
    setLoading(false)
  }

  const filtered = requests.filter((r) => {
    if (activeFilter !== 'all' && r.status !== activeFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        r.reference.toLowerCase().includes(q) ||
        r.company.toLowerCase().includes(q) ||
        r.first_name.toLowerCase().includes(q) ||
        r.last_name.toLowerCase().includes(q)
      )
    }
    return true
  })

  function countByStatus(status: Filter) {
    if (status === 'all') return requests.length
    return requests.filter((r) => r.status === status).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">Dashboard</h1>

      {/* Status tabs */}
      <div className="bg-white rounded-xl shadow-sm mb-6">
        <div className="flex items-center gap-1 p-1.5 overflow-x-auto">
          {FILTERS.map((f) => {
            const count = countByStatus(f.key)
            const isActive = activeFilter === f.key
            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  isActive
                    ? f.activeColor
                    : `${f.color} hover:bg-gray-50`
                }`}
              >
                {f.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-dark'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-muted" />
          <input
            type="text"
            placeholder="Rechercher par référence, société, nom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
      </div>

      {/* Request list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-muted">Aucune demande trouvée.</p>
          </div>
        )}

        {filtered.map((req) => {
          const isUrgent = new Date(req.start_datetime).getTime() - Date.now() < 24 * 60 * 60 * 1000
          const isCancelled = req.status === 'cancelled'

          return (
            <Link
              key={req.id}
              to={`/admin/requests/${req.id}`}
              className={`flex items-center bg-white rounded-xl shadow-sm px-5 py-4 hover:shadow-md transition border-l-4 ${
                isCancelled ? 'border-red-400 opacity-60' : isUrgent ? 'border-orange-400' : 'border-transparent'
              }`}
            >
              {/* Left: ref + client */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm font-bold text-primary">{req.reference}</span>
                  <StatusBadge status={req.status as RequestStatusKey} />
                </div>
                <p className="text-sm text-dark font-medium">{req.first_name} {req.last_name} — <span className="text-muted">{req.company}</span></p>
              </div>

              {/* Center: period + type */}
              <div className="hidden md:flex items-center gap-6 px-6">
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <Clock size={12} />
                  <span>{formatDateTime(req.start_datetime)}</span>
                  <span className="mx-1">→</span>
                  <span>{formatDateTime(req.end_datetime)}</span>
                </div>
                {req.has_audio && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                    Audio fourni
                  </span>
                )}
                {req.needs_tts && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-orange-50 text-orange-600">
                    Texte à enregistrer
                  </span>
                )}
              </div>

              {/* Right: arrow */}
              <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}

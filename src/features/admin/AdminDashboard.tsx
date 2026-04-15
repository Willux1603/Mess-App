import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDateTime } from '@/lib/utils'
import { type RequestStatusKey } from '@/lib/constants'
import { Clock, Search, Inbox, Loader2, CheckCircle2, LayoutGrid, List as ListIcon, Eye, ArrowRight } from 'lucide-react'
import type { Request } from '@/lib/types'

type ViewMode = 'kanban' | 'table'
type Tab = 'submitted' | 'in_progress' | 'done'

const TABS: { key: Tab; label: string; icon: React.ReactNode; statuses: RequestStatusKey[]; accent: string }[] = [
  { key: 'submitted', label: 'Soumises', icon: <Inbox size={16} />, statuses: ['submitted'], accent: 'border-blue-500' },
  { key: 'in_progress', label: 'En cours', icon: <Loader2 size={16} />, statuses: ['to_process', 'assigned', 'pending'], accent: 'border-orange-500' },
  { key: 'done', label: 'Traitées', icon: <CheckCircle2 size={16} />, statuses: ['completed', 'cancelled'], accent: 'border-green-500' },
]

function RequestCard({ req }: { req: Request }) {
  const isUrgent = new Date(req.start_datetime).getTime() - Date.now() < 24 * 60 * 60 * 1000
  const isCancelled = req.status === 'cancelled'

  return (
    <Link
      to={`/admin/requests/${req.id}`}
      className={`block bg-white rounded-lg border-l-4 shadow-sm p-4 hover:shadow-md transition ${isCancelled ? 'border-red-400 opacity-60' : isUrgent ? 'border-orange-400' : 'border-gray-200'}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-primary">{req.reference}</span>
        <StatusBadge status={req.status as RequestStatusKey} />
      </div>
      <p className="text-sm font-medium text-dark">{req.first_name} {req.last_name}</p>
      <p className="text-xs text-muted mb-2">{req.company}</p>
      <div className="flex items-center gap-1 text-xs text-muted">
        <Clock size={12} />
        <span>{formatDateTime(req.start_datetime)}</span>
        <ArrowRight size={10} className="mx-1" />
        <span>{formatDateTime(req.end_datetime)}</span>
      </div>
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
        <span className="text-xs text-muted">
          {req.has_audio ? '🎙️ Audio' : req.needs_tts ? '📝 TTS' : '—'}
        </span>
        <span className="text-xs text-primary flex items-center gap-1">
          <Eye size={12} /> Voir
        </span>
      </div>
    </Link>
  )
}

export function AdminDashboard() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [activeTab, setActiveTab] = useState<Tab>('submitted')

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

  function filterBySearch(list: Request[]) {
    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase()
    return list.filter((r) =>
      r.reference.toLowerCase().includes(q) ||
      r.company.toLowerCase().includes(q) ||
      r.first_name.toLowerCase().includes(q) ||
      r.last_name.toLowerCase().includes(q)
    )
  }

  const submitted = filterBySearch(requests.filter((r) => r.status === 'submitted'))
  const inProgress = filterBySearch(requests.filter((r) => ['to_process', 'assigned', 'pending'].includes(r.status)))
  const done = filterBySearch(requests.filter((r) => ['completed', 'cancelled'].includes(r.status)))

  const columns = { submitted, in_progress: inProgress, done }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-dark">Administration</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-2 rounded-lg transition ${viewMode === 'kanban' ? 'bg-primary text-white' : 'bg-white text-muted hover:bg-gray-50'}`}
            title="Vue Kanban"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg transition ${viewMode === 'table' ? 'bg-primary text-white' : 'bg-white text-muted hover:bg-gray-50'}`}
            title="Vue tableau"
          >
            <ListIcon size={18} />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {TABS.map((tab) => {
          const count = columns[tab.key].length
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`bg-white rounded-xl shadow-sm p-4 text-center transition border-b-3 ${activeTab === tab.key ? tab.accent + ' border-b-4' : 'border-b-4 border-transparent hover:shadow-md'}`}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                {tab.icon}
                <span className="text-sm font-medium text-dark">{tab.label}</span>
              </div>
              <p className="text-3xl font-bold text-dark">{count}</p>
            </button>
          )
        })}
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

      {/* Kanban view */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TABS.map((tab) => {
            const items = columns[tab.key]
            return (
              <div key={tab.key}>
                <div className={`flex items-center gap-2 mb-3 pb-2 border-b-2 ${tab.accent}`}>
                  {tab.icon}
                  <h2 className="text-sm font-semibold text-dark">{tab.label}</h2>
                  <span className="ml-auto bg-gray-100 text-dark text-xs font-bold px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                <div className="space-y-3">
                  {items.length === 0 ? (
                    <p className="text-sm text-muted text-center py-8 bg-gray-50 rounded-lg">Aucune demande</p>
                  ) : (
                    items.map((req) => <RequestCard key={req.id} req={req} />)
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Table view */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Réf.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Société</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Période</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Statut</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {columns[activeTab].map((req) => (
                <tr key={req.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-4 py-3">
                    <Link to={`/admin/requests/${req.id}`} className="text-primary font-medium hover:underline text-sm">
                      {req.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">{req.first_name} {req.last_name}</td>
                  <td className="px-4 py-3 text-sm">{req.company}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-muted" />
                      {formatDateTime(req.start_datetime)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{req.has_audio ? '🎙️ Audio' : req.needs_tts ? '📝 TTS' : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={req.status as RequestStatusKey} /></td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/requests/${req.id}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Eye size={12} /> Voir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {columns[activeTab].length === 0 && (
            <p className="text-center text-muted py-8">Aucune demande dans cette catégorie.</p>
          )}
        </div>
      )}
    </div>
  )
}

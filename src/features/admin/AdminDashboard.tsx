import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDateTime } from '@/lib/utils'
import { REQUEST_STATUSES, type RequestStatusKey } from '@/lib/constants'
import { Clock, Filter, Search, Users } from 'lucide-react'
import type { Request, Profile } from '@/lib/types'

export function AdminDashboard() {
  const [requests, setRequests] = useState<Request[]>([])
  const [technicians, setTechnicians] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCompany, setFilterCompany] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [reqRes, techRes] = await Promise.all([
      supabase.from('requests').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').in('role', ['admin', 'technician']),
    ])
    setRequests((reqRes.data as Request[]) ?? [])
    setTechnicians((techRes.data as Profile[]) ?? [])
    setLoading(false)
  }

  async function updateStatus(requestId: string, newStatus: RequestStatusKey) {
    await supabase.from('requests').update({ status: newStatus }).eq('id', requestId)
    loadData()
  }

  async function assignRequest(requestId: string, technicianId: string) {
    await supabase.from('requests').update({ assigned_to: technicianId, status: 'assigned' }).eq('id', requestId)
    loadData()
  }

  const filtered = requests.filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    if (filterCompany && !r.company.toLowerCase().includes(filterCompany.toLowerCase())) return false
    if (searchQuery && !r.reference.toLowerCase().includes(searchQuery.toLowerCase()) && !r.company.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const stats = {
    total: requests.length,
    submitted: requests.filter((r) => r.status === 'submitted').length,
    to_process: requests.filter((r) => r.status === 'to_process').length,
    assigned: requests.filter((r) => r.status === 'assigned').length,
    pending: requests.filter((r) => r.status === 'pending').length,
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
      <h1 className="text-2xl font-bold text-dark mb-6">Administration</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Total', value: stats.total, color: 'text-dark' },
          { label: 'Soumises', value: stats.submitted, color: 'text-blue-600' },
          { label: 'À traiter', value: stats.to_process, color: 'text-orange-600' },
          { label: 'Attribuées', value: stats.assigned, color: 'text-purple-600' },
          { label: 'En attente', value: stats.pending, color: 'text-yellow-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-sm text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-muted" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-muted" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          >
            <option value="all">Tous les statuts</option>
            {Object.entries(REQUEST_STATUSES).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Users size={16} className="text-muted" />
          <input
            type="text"
            placeholder="Filtrer par société..."
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
      </div>

      {/* Table */}
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
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Assigné à</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((req) => (
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
                <td className="px-4 py-3 text-sm">{req.has_audio ? 'Audio' : req.needs_tts ? 'TTS' : '-'}</td>
                <td className="px-4 py-3">
                  <select
                    value={req.status}
                    onChange={(e) => updateStatus(req.id, e.target.value as RequestStatusKey)}
                    className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {Object.entries(REQUEST_STATUSES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={req.assigned_to ?? ''}
                    onChange={(e) => assignRequest(req.id, e.target.value)}
                    className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Non assigné</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/admin/requests/${req.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    Détail
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-muted py-8">Aucune demande trouvée.</p>
        )}
      </div>
    </div>
  )
}

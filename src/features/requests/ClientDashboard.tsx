import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDateTime } from '@/lib/utils'
import { PlusCircle, FileText, Clock } from 'lucide-react'
import type { Request } from '@/lib/types'
import type { RequestStatusKey } from '@/lib/constants'

export function ClientDashboard() {
  const { profile } = useAuth()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    loadRequests()
  }, [profile])

  async function loadRequests() {
    const { data } = await supabase
      .from('requests')
      .select('*')
      .eq('client_id', profile!.id)
      .order('created_at', { ascending: false })

    setRequests((data as Request[]) ?? [])
    setLoading(false)
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-dark">
            Bonjour {profile?.first_name} !
          </h1>
          <p className="text-muted mt-1">Gérez vos demandes de messages vocaux</p>
        </div>
        <Link
          to="/requests/new"
          className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-full transition"
        >
          <PlusCircle size={18} />
          Nouvelle demande
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-lg font-semibold text-dark mb-2">Aucune demande</h2>
          <p className="text-muted mb-6">Vous n'avez pas encore soumis de demande de message vocal.</p>
          <Link
            to="/requests/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-full transition"
          >
            <PlusCircle size={18} />
            Créer ma première demande
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Référence</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Période</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Statut</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Créée le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50/50 transition cursor-pointer">
                  <td className="px-6 py-4">
                    <Link to={`/requests/${req.id}`} className="text-primary font-medium hover:underline">
                      {req.reference}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-dark">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-muted" />
                      {formatDateTime(req.start_datetime)} — {formatDateTime(req.end_datetime)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-dark">
                    {req.has_audio ? 'Audio déposé' : req.needs_tts ? 'Génération vocale' : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={req.status as RequestStatusKey} />
                  </td>
                  <td className="px-6 py-4 text-sm text-muted">
                    {formatDateTime(req.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

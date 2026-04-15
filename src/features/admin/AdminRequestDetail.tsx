import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDateTime } from '@/lib/utils'
import { REQUEST_STATUSES, type RequestStatusKey } from '@/lib/constants'
import {
  ArrowLeft, Clock, User, Building2, FileAudio, FileText,
  UserCheck, Send, CheckCircle2, XCircle, Play, Pause,
  MessageSquare, Save, AlertTriangle
} from 'lucide-react'
import type { Request, Profile, RequestNote } from '@/lib/types'

const STATUS_TRANSITIONS: Record<RequestStatusKey, RequestStatusKey[]> = {
  draft: ['received'],
  received: ['assigned', 'cancelled'],
  assigned: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

export function AdminRequestDetail() {
  const { id } = useParams<{ id: string }>()
  const { profile: currentUser } = useAuth()

  const [request, setRequest] = useState<Request | null>(null)
  const [technicians, setTechnicians] = useState<Profile[]>([])
  const [notes, setNotes] = useState<RequestNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioEl] = useState(() => typeof Audio !== 'undefined' ? new Audio() : null)

  // Editable fields
  const [editStatus, setEditStatus] = useState<RequestStatusKey>('received')
  const [editAssigned, setEditAssigned] = useState<string>('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (id) loadAll()
    return () => { if (audioEl) audioEl.pause() }
  }, [id])

  async function loadAll() {
    setLoading(true)
    const [reqRes, techRes, notesRes] = await Promise.all([
      supabase.from('requests').select('*').eq('id', id!).single(),
      supabase.from('profiles').select('*').in('role', ['admin', 'technician']),
      supabase.from('request_notes').select('*, author:profiles(first_name, last_name)').eq('request_id', id!).order('created_at', { ascending: false }),
    ])

    const req = reqRes.data as Request | null
    setRequest(req)
    setTechnicians((techRes.data as Profile[]) ?? [])
    setNotes((notesRes.data as RequestNote[]) ?? [])

    if (req) {
      setEditStatus(req.status as RequestStatusKey)
      setEditAssigned(req.assigned_to ?? '')
      setEditStart(req.start_datetime ? new Date(req.start_datetime).toISOString().slice(0, 16) : '')
      setEditEnd(req.end_datetime ? new Date(req.end_datetime).toISOString().slice(0, 16) : '')
      setEditNotes(req.additional_notes ?? '')

      if (req.audio_file_path) {
        const { data } = await supabase.storage.from('audio-files').createSignedUrl(req.audio_file_path, 3600)
        if (data?.signedUrl) setAudioUrl(data.signedUrl)
      }
    }

    setLoading(false)
    setHasChanges(false)
  }

  function markChanged() { setHasChanges(true) }

  async function handleSave() {
    if (!request) return
    setSaving(true)

    const updates: Record<string, unknown> = {}

    if (editStatus !== request.status) updates.status = editStatus
    if (editAssigned !== (request.assigned_to ?? '')) updates.assigned_to = editAssigned || null
    if (editStart && new Date(editStart).toISOString() !== request.start_datetime) updates.start_datetime = new Date(editStart).toISOString()
    if (editEnd && new Date(editEnd).toISOString() !== request.end_datetime) updates.end_datetime = new Date(editEnd).toISOString()
    if (editNotes !== (request.additional_notes ?? '')) updates.additional_notes = editNotes || null

    if (editStatus === 'completed' && request.status !== 'completed') {
      updates.completed_at = new Date().toISOString()
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('requests').update(updates).eq('id', request.id)
    }

    await loadAll()
    setSaving(false)
  }

  async function handleQuickAction(action: 'take' | 'complete' | 'cancel') {
    if (!request || !currentUser) return
    setSaving(true)

    const updates: Record<string, unknown> = {}
    if (action === 'take') {
      updates.status = 'assigned'
      updates.assigned_to = currentUser.id
    } else if (action === 'complete') {
      updates.status = 'completed'
      updates.completed_at = new Date().toISOString()
    } else if (action === 'cancel') {
      updates.status = 'cancelled'
    }

    const { error } = await supabase.from('requests').update(updates).eq('id', request.id)
    if (error) {
      console.error('Update failed:', error)
      alert(`Erreur: ${error.message}`)
    }
    await loadAll()
    setSaving(false)
  }

  async function handleAddNote() {
    if (!newNote.trim() || !currentUser || !request) return
    await supabase.from('request_notes').insert({
      request_id: request.id,
      author_id: currentUser.id,
      content: newNote.trim(),
    })
    setNewNote('')
    const { data } = await supabase
      .from('request_notes')
      .select('*, author:profiles(first_name, last_name)')
      .eq('request_id', request.id)
      .order('created_at', { ascending: false })
    setNotes((data as RequestNote[]) ?? [])
  }

  function toggleAudio() {
    if (!audioEl || !audioUrl) return
    if (audioPlaying) {
      audioEl.pause()
      setAudioPlaying(false)
    } else {
      audioEl.src = audioUrl
      audioEl.play()
      setAudioPlaying(true)
      audioEl.onended = () => setAudioPlaying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!request) {
    return (
      <div className="text-center py-20">
        <p className="text-muted mb-4">Demande introuvable.</p>
        <Link to="/admin" className="text-primary hover:underline">Retour</Link>
      </div>
    )
  }

  const allowedTransitions = STATUS_TRANSITIONS[request.status as RequestStatusKey] ?? []
  const isTerminal = request.status === 'completed' || request.status === 'cancelled'

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-dark mb-6 transition">
        <ArrowLeft size={16} /> Retour au tableau de bord
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-bold text-dark">{request.reference}</h1>
              <StatusBadge status={request.status as RequestStatusKey} />
            </div>
            <p className="text-sm text-muted">Créée le {formatDateTime(request.created_at)}</p>
            {request.submitted_at && (
              <p className="text-sm text-muted">Soumise le {formatDateTime(request.submitted_at)}</p>
            )}
          </div>

          {/* Quick actions */}
          {!isTerminal && (
            <div className="flex gap-2">
              {request.status === 'received' && (
                <button onClick={() => handleQuickAction('take')} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition disabled:opacity-50">
                  <UserCheck size={14} /> Prendre en charge
                </button>
              )}
              {request.status === 'assigned' && (
                <button onClick={() => handleQuickAction('complete')} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50">
                  <CheckCircle2 size={14} /> Terminer
                </button>
              )}
              <button onClick={() => handleQuickAction('cancel')} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition disabled:opacity-50">
                <XCircle size={14} /> Annuler
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Info + Edit */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
              <User size={14} /> Informations client
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted">Prénom</span>
                <p className="font-medium text-dark">{request.first_name}</p>
              </div>
              <div>
                <span className="text-xs text-muted">Nom</span>
                <p className="font-medium text-dark">{request.last_name}</p>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-muted flex items-center gap-1"><Building2 size={12} /> Société</span>
                <p className="font-medium text-dark">{request.company}</p>
              </div>
            </div>
          </div>

          {/* Period (editable) */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock size={14} /> Période demandée
            </h2>
            {isTerminal ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted">Début</span>
                  <p className="font-medium text-dark">{formatDateTime(request.start_datetime)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted">Fin</span>
                  <p className="font-medium text-dark">{formatDateTime(request.end_datetime)}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted block mb-1">Début</label>
                  <input type="datetime-local" value={editStart}
                    onChange={(e) => { setEditStart(e.target.value); markChanged() }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">Fin</label>
                  <input type="datetime-local" value={editEnd}
                    onChange={(e) => { setEditEnd(e.target.value); markChanged() }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
              </div>
            )}
          </div>

          {/* Audio / TTS */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
              {request.has_audio ? <><FileAudio size={14} /> Fichier audio</> : <><FileText size={14} /> Texte TTS</>}
            </h2>
            {request.has_audio && audioUrl && (
              <div className="flex items-center gap-4">
                <button onClick={toggleAudio}
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-white hover:bg-primary-hover transition">
                  {audioPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <div>
                  <p className="text-sm font-medium text-dark">Lecture du fichier audio</p>
                  <p className="text-xs text-muted">{request.audio_file_path?.split('/').pop()}</p>
                </div>
              </div>
            )}
            {request.has_audio && !audioUrl && (
              <p className="text-sm text-muted">Fichier audio non disponible.</p>
            )}
            {request.needs_tts && request.tts_text && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-dark italic">"{request.tts_text}"</p>
              </div>
            )}
          </div>

          {/* Admin notes */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText size={14} /> Notes admin
            </h2>
            {!isTerminal && (
              <div>
                <label className="text-xs text-muted block mb-1">Notes / Instructions</label>
                <textarea value={editNotes}
                  onChange={(e) => { setEditNotes(e.target.value); markChanged() }}
                  rows={3} placeholder="Instructions pour le traitement..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none" />
              </div>
            )}
            {isTerminal && request.additional_notes && (
              <p className="text-sm text-dark">{request.additional_notes}</p>
            )}
          </div>

          {/* Save button */}
          {hasChanges && !isTerminal && (
            <button onClick={handleSave} disabled={saving}
              className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-full transition disabled:opacity-50 flex items-center justify-center gap-2">
              <Save size={18} />
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Status & Assignment */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Gestion</h2>

            {/* Status */}
            <div className="mb-4">
              <label className="text-xs text-muted block mb-1">Statut</label>
              {isTerminal ? (
                <StatusBadge status={request.status as RequestStatusKey} />
              ) : (
                <select value={editStatus}
                  onChange={(e) => { setEditStatus(e.target.value as RequestStatusKey); markChanged() }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                  <option value={request.status}>{REQUEST_STATUSES[request.status as RequestStatusKey].label} (actuel)</option>
                  {allowedTransitions.map((s) => (
                    <option key={s} value={s}>{REQUEST_STATUSES[s].label}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Assignment */}
            <div className="mb-4">
              <label className="text-xs text-muted block mb-1">Assigné à</label>
              {isTerminal ? (
                <p className="text-sm font-medium text-dark">
                  {technicians.find((t) => t.id === request.assigned_to)
                    ? `${technicians.find((t) => t.id === request.assigned_to)!.first_name} ${technicians.find((t) => t.id === request.assigned_to)!.last_name}`
                    : 'Non assigné'}
                </p>
              ) : (
                <select value={editAssigned}
                  onChange={(e) => { setEditAssigned(e.target.value); markChanged() }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                  <option value="">Non assigné</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Urgency indicator */}
            {!isTerminal && new Date(request.start_datetime).getTime() - Date.now() < 24 * 60 * 60 * 1000 && (
              <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg">
                <AlertTriangle size={14} className="text-orange-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-orange-700">Demande urgente — début dans moins de 24h</p>
              </div>
            )}
          </div>

          {/* Internal notes (conversation) */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
              <MessageSquare size={14} /> Discussion interne
            </h2>

            {/* Add note */}
            <div className="mb-4">
              <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)}
                rows={2} placeholder="Ajouter une note..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none" />
              <button onClick={handleAddNote} disabled={!newNote.trim()}
                className="mt-2 w-full py-2 bg-gray-100 hover:bg-gray-200 text-dark text-sm font-medium rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-1">
                <Send size={12} /> Envoyer
              </button>
            </div>

            {/* Notes list */}
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {notes.length === 0 && (
                <p className="text-xs text-muted text-center py-4">Aucune note pour le moment.</p>
              )}
              {notes.map((note) => (
                <div key={note.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-dark">
                      {(note.author as unknown as { first_name: string; last_name: string })?.first_name}{' '}
                      {(note.author as unknown as { first_name: string; last_name: string })?.last_name}
                    </span>
                    <span className="text-xs text-muted">{formatDateTime(note.created_at)}</span>
                  </div>
                  <p className="text-sm text-dark">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

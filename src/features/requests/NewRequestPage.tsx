import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import { requestFormSchema, validateAudioFile, type RequestFormData } from '@/lib/validators'
import { getAdvanceWarning, getAdvanceMessage, isWithinBusinessHours, formatDateTime } from '@/lib/utils'
import { Upload, AlertTriangle, CheckCircle, Info, Mic, FileText } from 'lucide-react'
import { LOGO_URL } from '@/lib/constants'

type Step = 'form' | 'recap' | 'success'

export function NewRequestPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('form')
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioError, setAudioError] = useState('')

  const [form, setForm] = useState<RequestFormData>({
    first_name: profile?.first_name ?? '',
    last_name: profile?.last_name ?? '',
    company: profile?.company ?? '',
    start_datetime: '',
    end_datetime: '',
    has_audio: false,
    needs_tts: false,
    tts_text: '',
    additional_notes: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  function handleAudioChoice(choice: 'audio' | 'tts') {
    setForm((prev) => ({
      ...prev,
      has_audio: choice === 'audio',
      needs_tts: choice === 'tts',
      tts_text: choice === 'audio' ? '' : prev.tts_text,
    }))
    if (choice === 'tts') {
      setAudioFile(null)
      setAudioError('')
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const error = validateAudioFile(file)
    if (error) {
      setAudioError(error)
      setAudioFile(null)
      return
    }

    setAudioError('')
    setAudioFile(file)
  }

  function handleValidate() {
    const result = requestFormSchema.safeParse(form)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach((err) => {
        const field = err.path[0]
        if (field) fieldErrors[String(field)] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    if (form.has_audio && !audioFile) {
      setAudioError('Veuillez déposer un fichier audio')
      return
    }

    setStep('recap')
  }

  async function handleSubmit() {
    setLoading(true)

    let audioPath: string | null = null

    if (audioFile && profile) {
      const filePath = `${profile.id}/${Date.now()}_${audioFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(filePath, audioFile)

      if (uploadError) {
        setErrors({ submit: 'Erreur lors de l\'upload du fichier audio.' })
        setLoading(false)
        return
      }
      audioPath = filePath
    }

    const { data, error } = await supabase
      .from('requests')
      .insert({
        client_id: profile!.id,
        first_name: form.first_name,
        last_name: form.last_name,
        company: form.company,
        start_datetime: new Date(form.start_datetime).toISOString(),
        end_datetime: new Date(form.end_datetime).toISOString(),
        has_audio: form.has_audio,
        audio_file_path: audioPath,
        needs_tts: form.needs_tts,
        tts_text: form.needs_tts ? form.tts_text : null,
        additional_notes: form.additional_notes || null,
        status: 'received',
        submitted_at: new Date().toISOString(),
      })
      .select('reference')
      .single()

    if (error) {
      setErrors({ submit: 'Erreur lors de la soumission. Veuillez réessayer.' })
      setLoading(false)
      return
    }

    setReference((data as { reference: string }).reference)
    setStep('success')
    setLoading(false)
  }

  const advanceLevel = form.start_datetime ? getAdvanceWarning(new Date(form.start_datetime)) : 'ok'
  const advanceMsg = getAdvanceMessage(advanceLevel)
  const outsideHours = form.start_datetime ? !isWithinBusinessHours(new Date(form.start_datetime)) : false

  // ============ SUCCESS SCREEN ============
  if (step === 'success') {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <CheckCircle size={56} className="mx-auto text-green-500 mb-4" />
          <h1 className="text-2xl font-bold text-dark mb-2">Demande soumise !</h1>
          <p className="text-muted mb-4">Votre demande a bien été enregistrée.</p>
          <div className="bg-primary-light rounded-lg p-4 mb-6">
            <p className="text-sm text-muted">Numéro de référence</p>
            <p className="text-2xl font-bold text-primary">{reference}</p>
          </div>
          <p className="text-sm text-muted mb-6">
            Vous pouvez suivre l'état de votre demande depuis votre tableau de bord.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-full transition"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    )
  }

  // ============ RECAP SCREEN ============
  if (step === 'recap') {
    return (
      <div className="max-w-2xl mx-auto">
        <img src={LOGO_URL} alt="Konectik" className="h-10 mx-auto mb-6" />
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-primary text-center mb-6">Récapitulatif de votre demande</h1>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-sm text-muted">Prénom</span><p className="font-medium">{form.first_name}</p></div>
              <div><span className="text-sm text-muted">Nom</span><p className="font-medium">{form.last_name}</p></div>
            </div>
            <div><span className="text-sm text-muted">Société</span><p className="font-medium">{form.company}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-sm text-muted">Début</span><p className="font-medium">{formatDateTime(form.start_datetime)}</p></div>
              <div><span className="text-sm text-muted">Fin</span><p className="font-medium">{formatDateTime(form.end_datetime)}</p></div>
            </div>
            <div>
              <span className="text-sm text-muted">Type de message</span>
              <p className="font-medium">
                {form.has_audio ? `Fichier audio : ${audioFile?.name}` : 'Génération vocale (TTS)'}
              </p>
            </div>
            {form.needs_tts && form.tts_text && (
              <div><span className="text-sm text-muted">Texte à convertir</span><p className="font-medium italic">"{form.tts_text}"</p></div>
            )}
            {form.additional_notes && (
              <div><span className="text-sm text-muted">Notes supplémentaires</span><p className="font-medium">{form.additional_notes}</p></div>
            )}
          </div>

          {errors.submit && <p className="text-red-500 text-sm text-center mt-4">{errors.submit}</p>}

          <div className="flex gap-4 mt-8">
            <button
              onClick={() => setStep('form')}
              className="flex-1 py-3 border border-gray-200 text-dark font-semibold rounded-full hover:bg-gray-50 transition"
            >
              Modifier
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-full transition disabled:opacity-50"
            >
              {loading ? 'Envoi...' : 'Confirmer et soumettre'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============ FORM ============
  return (
    <div className="max-w-2xl mx-auto">
      <img src={LOGO_URL} alt="Konectik" className="h-10 mx-auto mb-6" />

      <div className="bg-white rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-primary text-center mb-6">
          Nouvelle demande de message vocal
        </h1>

        <div className="space-y-5">
          {/* Identity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">Prénom</label>
              <input
                type="text" name="first_name" value={form.first_name} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
              {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">Nom</label>
              <input
                type="text" name="last_name" value={form.last_name} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
              {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">Société</label>
            <input
              type="text" name="company" value={form.company} onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            />
            {errors.company && <p className="text-red-500 text-xs mt-1">{errors.company}</p>}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">Date et heure de début</label>
              <input
                type="datetime-local" name="start_datetime" value={form.start_datetime} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
              {errors.start_datetime && <p className="text-red-500 text-xs mt-1">{errors.start_datetime}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">Date et heure de fin</label>
              <input
                type="datetime-local" name="end_datetime" value={form.end_datetime} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
              {errors.end_datetime && <p className="text-red-500 text-xs mt-1">{errors.end_datetime}</p>}
            </div>
          </div>

          {/* Advance warnings */}
          {advanceMsg && (
            <div className={`flex items-start gap-3 p-4 rounded-lg ${advanceLevel === 'blocked' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
              <p className="text-sm">{advanceMsg}</p>
            </div>
          )}

          {outsideHours && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 text-blue-700">
              <Info size={18} className="mt-0.5 flex-shrink-0" />
              <p className="text-sm">Cette date est en dehors des horaires de travail (lun-ven, 08h30-17h30). La prise en charge se fera au prochain créneau ouvré.</p>
            </div>
          )}

          {/* Audio choice */}
          <div>
            <label className="block text-sm font-medium text-dark mb-3">Message vocal</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleAudioChoice('audio')}
                className={`p-4 rounded-lg border-2 text-left transition ${form.has_audio ? 'border-primary bg-primary-light' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <Upload size={20} className={form.has_audio ? 'text-primary mb-2' : 'text-muted mb-2'} />
                <p className="font-medium text-sm">J'ai un enregistrement</p>
                <p className="text-xs text-muted mt-1">Déposer un fichier audio</p>
              </button>
              <button
                type="button"
                onClick={() => handleAudioChoice('tts')}
                className={`p-4 rounded-lg border-2 text-left transition ${form.needs_tts ? 'border-primary bg-primary-light' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <Mic size={20} className={form.needs_tts ? 'text-primary mb-2' : 'text-muted mb-2'} />
                <p className="font-medium text-sm">Générer un message</p>
                <p className="text-xs text-muted mt-1">Saisir le texte à convertir en voix</p>
              </button>
            </div>
            {errors.has_audio && <p className="text-red-500 text-xs mt-2">{errors.has_audio}</p>}
          </div>

          {/* Audio upload */}
          {form.has_audio && (
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition"
              >
                <Upload size={24} className="mx-auto text-muted mb-2" />
                {audioFile ? (
                  <p className="text-sm font-medium text-dark">{audioFile.name}</p>
                ) : (
                  <p className="text-sm text-muted">Cliquez pour déposer votre fichier audio (MP3, WAV, OGG — max 10 Mo)</p>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
              {audioError && <p className="text-red-500 text-xs mt-1">{audioError}</p>}
            </div>
          )}

          {/* TTS text */}
          {form.needs_tts && (
            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">Texte du message vocal</label>
              <textarea
                name="tts_text"
                value={form.tts_text}
                onChange={handleChange}
                rows={4}
                placeholder="Saisissez le texte que vous souhaitez faire enregistrer..."
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
              />
              {errors.tts_text && <p className="text-red-500 text-xs mt-1">{errors.tts_text}</p>}
            </div>
          )}

          {/* Additional notes */}
          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">Demande supplémentaire (facultatif)</label>
            <textarea
              name="additional_notes"
              value={form.additional_notes}
              onChange={handleChange}
              rows={3}
              placeholder="Précisions, instructions particulières..."
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleValidate}
            disabled={advanceLevel === 'blocked'}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <FileText size={18} />
            Vérifier et continuer
          </button>
        </div>
      </div>
    </div>
  )
}

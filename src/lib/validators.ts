import { z } from 'zod'
import { ACCEPTED_AUDIO_TYPES, MAX_AUDIO_SIZE_BYTES, MAX_AUDIO_SIZE_MB } from './constants'

export const loginSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
})

export const registerSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  confirmPassword: z.string(),
  first_name: z.string().min(1, 'Le prénom est requis'),
  last_name: z.string().min(1, 'Le nom est requis'),
  company: z.string().min(1, 'La société est requise'),
  phone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})

export const requestFormSchema = z.object({
  first_name: z.string().min(1, 'Le prénom est requis'),
  last_name: z.string().min(1, 'Le nom est requis'),
  company: z.string().min(1, 'La société est requise'),
  start_datetime: z.string().min(1, 'La date de début est requise'),
  end_datetime: z.string().min(1, 'La date de fin est requise'),
  has_audio: z.boolean(),
  needs_tts: z.boolean(),
  tts_text: z.string().optional(),
  additional_notes: z.string().optional(),
}).refine((data) => {
  if (data.start_datetime && data.end_datetime) {
    return new Date(data.end_datetime) > new Date(data.start_datetime)
  }
  return true
}, {
  message: 'La date de fin doit être postérieure à la date de début',
  path: ['end_datetime'],
}).refine((data) => {
  if (!data.has_audio && !data.needs_tts) {
    return false
  }
  return true
}, {
  message: 'Veuillez choisir : déposer un audio ou demander une génération vocale',
  path: ['has_audio'],
}).refine((data) => {
  if (data.needs_tts && (!data.tts_text || data.tts_text.trim() === '')) {
    return false
  }
  return true
}, {
  message: 'Le texte à convertir en voix est requis',
  path: ['tts_text'],
})

export function validateAudioFile(file: File): string | null {
  if (!ACCEPTED_AUDIO_TYPES.includes(file.type)) {
    return 'Format audio non accepté. Formats autorisés : MP3, WAV, OGG'
  }
  if (file.size > MAX_AUDIO_SIZE_BYTES) {
    return `Le fichier est trop volumineux (max ${MAX_AUDIO_SIZE_MB} Mo)`
  }
  return null
}

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type RequestFormData = z.infer<typeof requestFormSchema>

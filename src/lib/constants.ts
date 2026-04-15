export const REQUEST_STATUSES = {
  draft: { label: 'Brouillon', color: 'bg-gray-200 text-gray-700' },
  submitted: { label: 'Soumise', color: 'bg-blue-100 text-blue-700' },
  to_process: { label: 'À traiter', color: 'bg-orange-100 text-orange-700' },
  assigned: { label: 'Attribuée', color: 'bg-purple-100 text-purple-700' },
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Terminée', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700' },
} as const

export type RequestStatusKey = keyof typeof REQUEST_STATUSES

export const USER_ROLES = {
  client: 'Client',
  admin: 'Administrateur',
  technician: 'Technicien',
} as const

export type UserRoleKey = keyof typeof USER_ROLES

export const BUSINESS_HOURS = {
  start: { hour: 8, minute: 30 },
  end: { hour: 17, minute: 30 },
  days: [1, 2, 3, 4, 5], // Monday to Friday
} as const

export const MIN_ADVANCE_HOURS = 24
export const BLOCK_ADVANCE_HOURS = 2

export const ACCEPTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp3',
  'audio/x-wav',
]

export const MAX_AUDIO_SIZE_MB = 10
export const MAX_AUDIO_SIZE_BYTES = MAX_AUDIO_SIZE_MB * 1024 * 1024

export const SUPABASE_URL = 'https://rymjelbxqnrghjmzeybp.supabase.co'
export const LOGO_URL = `${SUPABASE_URL}/storage/v1/object/public/assets/Konectik_logo_blanc.png`

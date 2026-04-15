export type UserRole = 'client' | 'admin' | 'technician'

export type RequestStatus =
  | 'draft'
  | 'received'
  | 'assigned'
  | 'completed'
  | 'cancelled'

export interface Profile {
  id: string
  email: string
  first_name: string
  last_name: string
  company: string
  phone: string
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Request {
  id: string
  reference: string
  client_id: string
  first_name: string
  last_name: string
  company: string
  start_datetime: string
  end_datetime: string
  has_audio: boolean
  audio_file_path: string | null
  needs_tts: boolean
  tts_text: string | null
  additional_notes: string | null
  status: RequestStatus
  assigned_to: string | null
  submitted_at: string | null
  created_at: string
  updated_at: string
  // Joined fields
  assigned_profile?: Profile
}

export interface RequestNote {
  id: string
  request_id: string
  author_id: string
  content: string
  created_at: string
  // Joined
  author?: Profile
}

export interface RequestHistory {
  id: string
  request_id: string
  actor_id: string
  action: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  created_at: string
  // Joined
  actor?: Profile
}

// Supabase Database type (minimal for client setup)
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      requests: {
        Row: Request
        Insert: Omit<Request, 'id' | 'reference' | 'created_at' | 'updated_at' | 'assigned_profile'>
        Update: Partial<Omit<Request, 'id' | 'reference' | 'created_at' | 'assigned_profile'>>
      }
      request_notes: {
        Row: RequestNote
        Insert: Omit<RequestNote, 'id' | 'created_at' | 'author'>
        Update: Partial<Omit<RequestNote, 'id' | 'created_at' | 'author'>>
      }
      request_history: {
        Row: RequestHistory
        Insert: Omit<RequestHistory, 'id' | 'created_at' | 'actor'>
        Update: never
      }
    }
  }
}

import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { ClientDashboard } from '@/features/requests/ClientDashboard'

export function RoleRedirect() {
  const { profile } = useAuth()

  if (profile?.role === 'admin' || profile?.role === 'technician') {
    return <Navigate to="/admin" replace />
  }

  return <ClientDashboard />
}

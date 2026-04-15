import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/features/auth/AuthContext'
import { AuthGuard } from '@/features/auth/AuthGuard'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { ClientDashboard } from '@/features/requests/ClientDashboard'
import { NewRequestPage } from '@/features/requests/NewRequestPage'
import { AdminDashboard } from '@/features/admin/AdminDashboard'
import { AdminRequestDetail } from '@/features/admin/AdminRequestDetail'
import { ProfilePage } from '@/features/profile/ProfilePage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected routes */}
            <Route element={<AuthGuard><AppLayout /></AuthGuard>}>
              <Route path="/" element={<ClientDashboard />} />
              <Route path="/requests/new" element={<NewRequestPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              {/* Admin routes */}
              <Route path="/admin" element={<AuthGuard allowedRoles={['admin', 'technician']}><AdminDashboard /></AuthGuard>} />
              <Route path="/admin/requests" element={<AuthGuard allowedRoles={['admin', 'technician']}><AdminDashboard /></AuthGuard>} />
              <Route path="/admin/requests/:id" element={<AuthGuard allowedRoles={['admin', 'technician']}><AdminRequestDetail /></AuthGuard>} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

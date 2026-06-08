import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage, ForgotPasswordPage } from '@/pages/auth/RegisterPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { PatientsPage } from '@/pages/PatientsPage'
import { AppointmentsPage } from '@/pages/AppointmentsPage'
import { ServicesPage } from '@/pages/ServicesPage'
import { FinancialPage } from '@/pages/FinancialPage'
import { AuthProvider } from '@/components/auth/AuthProvider'

export const router = createBrowserRouter([
  {
    element: <AuthProvider />,
    children: [
      // Auth routes
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
        ],
      },
      // Protected routes
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: '/dashboard', element: <DashboardPage /> },
              { path: '/patients', element: <PatientsPage /> },
              { path: '/appointments', element: <AppointmentsPage /> },
              { path: '/services', element: <ServicesPage /> },
              { path: '/financial', element: <FinancialPage /> },
            ],
          },
        ],
      },
      // Redirect root
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
])

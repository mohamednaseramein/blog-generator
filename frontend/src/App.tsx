import { Fragment } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, AdminRoute } from './components/RouteGuards';
import { isSupabaseConfigured } from './lib/supabase';

// Pages
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CheckEmailPage from './pages/auth/CheckEmailPage';
import VerifyPage from './pages/auth/VerifyPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import OAuthCallbackPage from './pages/auth/OAuthCallbackPage';

// Admin Pages (Stubs for now)
const AdminUsersPage = () => <div className="p-8">Admin Users</div>;
const AdminBlogsPage = () => <div className="p-8">Admin Blogs</div>;
const AdminProfilesPage = () => <div className="p-8">Admin Profiles</div>;

export function App() {
  return (
    <AuthProvider>
      <Router>
        <Fragment>
          {!isSupabaseConfigured && (
            <div
              role="status"
              className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950"
            >
              Supabase env vars were missing at <strong className="font-medium">build</strong> time
              (<code className="rounded bg-amber-100/80 px-1">VITE_SUPABASE_URL</code>,{' '}
              <code className="rounded bg-amber-100/80 px-1">VITE_SUPABASE_ANON_KEY</code>). Auth and
              API calls will fail until you rebuild the frontend with real values (see{' '}
              <code className="rounded bg-amber-100/80 px-1">docker-compose.yml</code> build args).
            </div>
          )}
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/check-email" element={<CheckEmailPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/callback" element={<OAuthCallbackPage />} />

            {/* Protected App Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Dashboard />} />
            </Route>

            {/* Admin Routes */}
            <Route element={<AdminRoute />}>
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/blogs" element={<AdminBlogsPage />} />
              <Route path="/admin/profiles" element={<AdminProfilesPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Fragment>
      </Router>
    </AuthProvider>
  );
}

import { Fragment } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, AdminRoute } from './components/RouteGuards';
import { NoIndexRoute } from './components/NoIndex';
import { isSupabaseConfigured } from './lib/supabase';

// Pages
import Dashboard from './pages/Dashboard';
import LandingPage from './landing/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CheckEmailPage from './pages/auth/CheckEmailPage';
import VerifyPage from './pages/auth/VerifyPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import OAuthCallbackPage from './pages/auth/OAuthCallbackPage';
import ProfilePage from './pages/ProfilePage';
import AiDetectorRulesPage from './pages/AiDetectorRulesPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminOverviewPage from './pages/admin/AdminOverviewPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage';
import AdminBlogsPage from './pages/admin/AdminBlogsPage';
import AdminBlogDetailPage from './pages/admin/AdminBlogDetailPage';
import AdminPlansPage from './pages/admin/AdminPlansPage';
import PlanUsagePage from './pages/PlanUsagePage';

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
            {/* Public landing — marketing surface */}
            <Route path="/" element={<LandingPage />} />

            {/* Public Auth Routes — functional but not search-indexed */}
            <Route element={<NoIndexRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/check-email" element={<CheckEmailPage />} />
              <Route path="/verify" element={<VerifyPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/auth/callback" element={<OAuthCallbackPage />} />
            </Route>

            {/* Public help — educational rubric (indexed like other SPA routes) */}
            <Route path="/help/ai-detector-rules" element={<AiDetectorRulesPage />} />

            {/* Protected App Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/plan" element={<PlanUsagePage />} />
            </Route>

            {/* Admin — users, blogs, roles (service role on server) */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminOverviewPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="users/:userId" element={<AdminUserDetailPage />} />
                <Route path="blogs" element={<AdminBlogsPage />} />
                <Route path="blogs/:blogId" element={<AdminBlogDetailPage />} />
                <Route path="plans" element={<AdminPlansPage />} />
              </Route>
              <Route path="/admin/profiles" element={<Navigate to="/admin/users" replace />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Fragment>
      </Router>
    </AuthProvider>
  );
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import ProfilePage from './pages/ProfilePage';
// Admin Pages (Stubs for now)
const AdminUsersPage = () => _jsx("div", { className: "p-8", children: "Admin Users" });
const AdminBlogsPage = () => _jsx("div", { className: "p-8", children: "Admin Blogs" });
const AdminProfilesPage = () => _jsx("div", { className: "p-8", children: "Admin Profiles" });
export function App() {
    return (_jsx(AuthProvider, { children: _jsx(Router, { children: _jsxs(Fragment, { children: [!isSupabaseConfigured && (_jsxs("div", { role: "status", className: "border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950", children: ["Supabase env vars were missing at ", _jsx("strong", { className: "font-medium", children: "build" }), " time (", _jsx("code", { className: "rounded bg-amber-100/80 px-1", children: "VITE_SUPABASE_URL" }), ",", ' ', _jsx("code", { className: "rounded bg-amber-100/80 px-1", children: "VITE_SUPABASE_ANON_KEY" }), "). Auth and API calls will fail until you rebuild the frontend with real values (see", ' ', _jsx("code", { className: "rounded bg-amber-100/80 px-1", children: "docker-compose.yml" }), " build args)."] })), _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/register", element: _jsx(RegisterPage, {}) }), _jsx(Route, { path: "/check-email", element: _jsx(CheckEmailPage, {}) }), _jsx(Route, { path: "/verify", element: _jsx(VerifyPage, {}) }), _jsx(Route, { path: "/forgot-password", element: _jsx(ForgotPasswordPage, {}) }), _jsx(Route, { path: "/reset-password", element: _jsx(ResetPasswordPage, {}) }), _jsx(Route, { path: "/auth/callback", element: _jsx(OAuthCallbackPage, {}) }), _jsxs(Route, { element: _jsx(ProtectedRoute, {}), children: [_jsx(Route, { path: "/", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/profile", element: _jsx(ProfilePage, {}) })] }), _jsxs(Route, { element: _jsx(AdminRoute, {}), children: [_jsx(Route, { path: "/admin/users", element: _jsx(AdminUsersPage, {}) }), _jsx(Route, { path: "/admin/blogs", element: _jsx(AdminBlogsPage, {}) }), _jsx(Route, { path: "/admin/profiles", element: _jsx(AdminProfilesPage, {}) })] }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] })] }) }) }));
}

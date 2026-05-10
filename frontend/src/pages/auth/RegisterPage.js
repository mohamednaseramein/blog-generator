import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const handleRegister = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            setLoading(false);
            return;
        }
        if (!isSupabaseConfigured) {
            setError('Supabase is not configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY at build time). Rebuild the frontend with real env vars — no verification email can be sent until then.');
            setLoading(false);
            return;
        }
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/verify`,
                },
            });
            if (import.meta.env.DEV) {
                // Email is sent by Supabase servers — it will not appear in the browser Network tab.
                // session != null usually means "confirm email" is disabled in the Supabase project.
                console.debug('[auth] signUp', {
                    error: error?.message ?? null,
                    hasSession: Boolean(data.session),
                    userId: data.user?.id ?? null,
                });
            }
            if (error) {
                if (error.message.toLowerCase().includes('already registered')) {
                    setError('An account with this email already exists. Try logging in or resetting your password.');
                }
                else {
                    setError(error.message);
                }
            }
            else {
                navigate('/check-email');
            }
        }
        catch (err) {
            setError('An unexpected error occurred');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "flex min-h-screen flex-col items-center justify-center bg-slate-50 py-12 sm:px-6 lg:px-8", children: [_jsx("div", { className: "sm:mx-auto sm:w-full sm:max-w-md", children: _jsx("h2", { className: "mt-6 text-center text-3xl font-bold tracking-tight text-slate-900", children: "Create a new account" }) }), _jsx("div", { className: "mt-8 sm:mx-auto sm:w-full sm:max-w-md", children: _jsxs("div", { className: "bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10 border border-slate-200", children: [_jsxs("form", { className: "space-y-6", onSubmit: handleRegister, children: [error && (_jsx("div", { className: "rounded-md bg-red-50 p-4", children: _jsx("div", { className: "text-sm text-red-700", children: error }) })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700", children: "Email address" }), _jsx("div", { className: "mt-1", children: _jsx("input", { type: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), className: "block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm" }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700", children: "Password" }), _jsx("div", { className: "mt-1", children: _jsx("input", { type: "password", required: true, value: password, onChange: (e) => setPassword(e.target.value), className: "block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm" }) })] }), _jsx("div", { children: _jsx(Button, { type: "submit", className: "w-full", disabled: loading, children: loading ? 'Creating account...' : 'Create account' }) })] }), _jsxs("div", { className: "mt-6 text-center text-sm", children: [_jsx("span", { className: "text-slate-500", children: "Already have an account? " }), _jsx(Link, { to: "/login", className: "font-medium text-indigo-600 hover:text-indigo-500", children: "Sign in instead" })] })] }) })] }));
}

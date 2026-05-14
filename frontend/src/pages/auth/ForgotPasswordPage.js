import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const handleReset = async (e) => {
        e.preventDefault();
        setStatus('loading');
        setErrorMsg('');
        if (!isSupabaseConfigured) {
            setErrorMsg('Supabase is not configured at build time. Rebuild with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
            setStatus('error');
            return;
        }
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (import.meta.env.DEV) {
                console.debug('[auth] resetPasswordForEmail', { error: error?.message ?? null });
            }
            if (error) {
                throw error;
            }
            setStatus('success');
        }
        catch (err) {
            // For security, timing-safe implementation would always show success,
            // but Supabase returns errors for rate-limits etc.
            if (err.status === 429) {
                setErrorMsg('Too many requests. Please try again later.');
                setStatus('error');
            }
            else {
                // Generic success to prevent email enumeration
                setStatus('success');
            }
        }
    };
    if (status === 'success') {
        return (_jsx("div", { className: "flex min-h-screen flex-col items-center justify-center bg-slate-50 py-12 sm:px-6 lg:px-8", children: _jsxs("div", { className: "sm:mx-auto sm:w-full sm:max-w-md bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10 border border-slate-200 text-center", children: [_jsx("h2", { className: "text-2xl font-bold tracking-tight text-slate-900 mb-2", children: "Check your email" }), _jsxs("p", { className: "text-slate-500 mb-6", children: ["If an account exists for ", email, ", we have sent a password reset link."] }), _jsx(Link, { to: "/login", className: "font-medium text-indigo-600 hover:text-indigo-500", children: "Return to login" })] }) }));
    }
    return (_jsxs("div", { className: "flex min-h-screen flex-col items-center justify-center bg-slate-50 py-12 sm:px-6 lg:px-8", children: [_jsx("div", { className: "sm:mx-auto sm:w-full sm:max-w-md", children: _jsx("h2", { className: "mt-6 text-center text-3xl font-bold tracking-tight text-slate-900", children: "Reset your password" }) }), _jsx("div", { className: "mt-8 sm:mx-auto sm:w-full sm:max-w-md", children: _jsxs("div", { className: "bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10 border border-slate-200", children: [_jsxs("form", { className: "space-y-6", onSubmit: handleReset, children: [status === 'error' && (_jsx("div", { className: "rounded-md bg-red-50 p-4", children: _jsx("div", { className: "text-sm text-red-700", children: errorMsg }) })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700", children: "Email address" }), _jsx("div", { className: "mt-1", children: _jsx("input", { type: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), className: "block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm" }) })] }), _jsx("div", { children: _jsx(Button, { type: "submit", className: "w-full", disabled: status === 'loading', children: status === 'loading' ? 'Sending...' : 'Send reset link' }) })] }), _jsx("div", { className: "mt-6 text-center text-sm", children: _jsx(Link, { to: "/login", className: "font-medium text-indigo-600 hover:text-indigo-500", children: "Back to login" }) })] }) })] }));
}

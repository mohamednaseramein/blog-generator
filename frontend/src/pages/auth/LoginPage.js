import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const handleGoogleLogin = async () => {
        setError(null);
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (error)
                setError(error.message);
            // On success, user is redirected away to Google. No further action here.
        }
        catch {
            setError('An unexpected error occurred');
        }
        finally {
            setLoading(false);
        }
    };
    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                const authErr = error;
                const code = authErr.code || '';
                const msg = authErr.message?.toLowerCase?.() || '';
                if (code === 'email_not_confirmed' || msg.includes('email not confirmed') || msg.includes('not confirmed')) {
                    setError('Email not verified. Please verify your email and try again.');
                }
                else {
                    setError('Invalid email or password');
                }
            }
            else {
                navigate('/dashboard');
            }
        }
        catch (err) {
            setError('An unexpected error occurred');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "flex min-h-screen flex-col items-center justify-center bg-slate-50 py-12 sm:px-6 lg:px-8", children: [_jsx("div", { className: "sm:mx-auto sm:w-full sm:max-w-md", children: _jsx("h2", { className: "mt-6 text-center text-3xl font-bold tracking-tight text-slate-900", children: "Sign in to your account" }) }), _jsx("div", { className: "mt-8 sm:mx-auto sm:w-full sm:max-w-md", children: _jsxs("div", { className: "bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10 border border-slate-200", children: [_jsxs("form", { className: "space-y-6", onSubmit: handleLogin, children: [error && (_jsx("div", { className: "rounded-md bg-red-50 p-4", children: _jsx("div", { className: "text-sm text-red-700", children: error }) })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700", children: "Email address" }), _jsx("div", { className: "mt-1", children: _jsx("input", { type: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), className: "block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm" }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700", children: "Password" }), _jsx("div", { className: "mt-1", children: _jsx("input", { type: "password", required: true, value: password, onChange: (e) => setPassword(e.target.value), className: "block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm" }) })] }), _jsx("div", { className: "flex items-center justify-between", children: _jsx("div", { className: "text-sm", children: _jsx(Link, { to: "/forgot-password", className: "font-medium text-indigo-600 hover:text-indigo-500", children: "Forgot your password?" }) }) }), _jsx("div", { children: _jsx(Button, { type: "submit", className: "w-full", disabled: loading, children: loading ? 'Signing in...' : 'Sign in' }) })] }), _jsxs("div", { className: "mt-6", children: [_jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-0 flex items-center", children: _jsx("div", { className: "w-full border-t border-slate-300" }) }), _jsx("div", { className: "relative flex justify-center text-sm", children: _jsx("span", { className: "bg-white px-2 text-slate-500", children: "Or continue with" }) })] }), _jsxs("div", { className: "mt-6 space-y-3", children: [_jsx(Button, { type: "button", className: "w-full", variant: "ghost", disabled: loading, onClick: () => void handleGoogleLogin(), children: "Continue with Google" }), _jsx("div", { className: "text-center text-sm", children: _jsx(Link, { to: "/register", className: "font-medium text-indigo-600 hover:text-indigo-500", children: "Create a new account" }) })] })] })] }) })] }));
}

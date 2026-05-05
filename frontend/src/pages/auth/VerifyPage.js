import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
export default function VerifyPage() {
    const [status, setStatus] = useState('verifying');
    const navigate = useNavigate();
    useEffect(() => {
        // Supabase automatically handles the hash token on load and signs the user in
        // We just wait for the session
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                setStatus('success');
                setTimeout(() => navigate('/'), 2000);
            }
        });
        // Timeout if nothing happens
        const timer = setTimeout(() => {
            if (status === 'verifying') {
                setStatus('error');
            }
        }, 5000);
        return () => {
            subscription.unsubscribe();
            clearTimeout(timer);
        };
    }, [navigate, status]);
    return (_jsx("div", { className: "flex min-h-screen flex-col items-center justify-center bg-slate-50 py-12 sm:px-6 lg:px-8", children: _jsxs("div", { className: "sm:mx-auto sm:w-full sm:max-w-md bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10 border border-slate-200 text-center", children: [status === 'verifying' && _jsx("p", { children: "Verifying your email..." }), status === 'success' && _jsx("p", { className: "text-green-600", children: "Email verified! Redirecting to dashboard..." }), status === 'error' && _jsx("p", { className: "text-red-600", children: "Verification failed or expired. Try logging in or request a new link." })] }) }));
}

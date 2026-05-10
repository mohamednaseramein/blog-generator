import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
function authLog(level, message, meta) {
    // Always-on logging for the OAuth callback flow (helps debug prod-only issues).
    // Keep logs copy/paste friendly and avoid leaking tokens.
    const prefix = `[auth-callback] ${message}`;
    if (level === 'error') {
        if (meta)
            console.error(prefix, meta);
        else
            console.error(prefix);
        return;
    }
    if (level === 'warn') {
        if (meta)
            console.warn(prefix, meta);
        else
            console.warn(prefix);
        return;
    }
    if (meta)
        console.info(prefix, meta);
    else
        console.info(prefix);
}
function redactedUrlForLogs(url) {
    const out = new URL(url.toString());
    if (out.searchParams.has('code'))
        out.searchParams.set('code', '<redacted>');
    if (out.searchParams.has('error_description'))
        out.searchParams.set('error_description', '<redacted>');
    if (out.hash)
        out.hash = '#<redacted>';
    return out.toString();
}
export default function OAuthCallbackPage() {
    const [status, setStatus] = useState('verifying');
    const [errorMessage, setErrorMessage] = useState('Google sign-in failed or expired.');
    const navigate = useNavigate();
    useEffect(() => {
        let done = false;
        const finish = (next) => {
            if (done)
                return;
            done = true;
            setStatus(next);
        };
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const errorParam = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');
        const errorCode = url.searchParams.get('error_code');
        authLog('info', 'mounted', {
            origin: window.location.origin,
            href: redactedUrlForLogs(url),
            hasCode: Boolean(code),
            hasHash: Boolean(url.hash),
            error: errorParam || undefined,
            errorCode: errorCode || undefined,
        });
        const clearCallbackUrl = () => {
            // Clear sensitive/verbose callback params once Supabase has had a chance
            // to read them (PKCE query `code` or implicit hash tokens).
            window.history.replaceState({}, document.title, '/auth/callback');
        };
        // If the callback is PKCE (`?code=`), we can clear immediately after capturing it.
        // If the callback is implicit (`#access_token=`), we must NOT clear until after getSession().
        if (code || errorParam) {
            clearCallbackUrl();
            authLog('info', 'sanitized URL early (code/error present)');
        }
        const timer = setTimeout(() => {
            authLog('warn', 'timeout waiting for session');
            finish('error');
            clearCallbackUrl();
        }, 30000);
        // Supabase OAuth commonly returns an auth code (PKCE) that must be exchanged for a session.
        const init = async () => {
            if (errorParam) {
                const parts = [errorCode, errorDescription].filter(Boolean);
                if (parts.length) {
                    setErrorMessage(parts.join(': ').slice(0, 180));
                }
                finish('error');
                authLog('warn', 'provider returned error', {
                    error: errorParam,
                    errorCode,
                    errorDescription: errorDescription ? '<redacted>' : undefined,
                });
                return;
            }
            if (code) {
                authLog('info', 'exchanging PKCE code for session');
                const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                if (error) {
                    authLog('warn', 'exchangeCodeForSession failed', {
                        message: error.message,
                        name: error.name,
                    });
                    setErrorMessage(error.message || 'Google sign-in failed. Please try again.');
                    finish('error');
                    return;
                }
                if (data.session) {
                    authLog('info', 'exchangeCodeForSession success', { userId: data.session.user.id });
                    finish('success');
                    return;
                }
            }
            // Fallback: if a session already exists (hash-token flows), treat as success.
            authLog('info', 'checking getSession fallback');
            const { data } = await supabase.auth.getSession();
            if (data.session) {
                authLog('info', 'getSession found session', { userId: data.session.user.id });
                finish('success');
                return;
            }
            // No session created; now it's safe to clear the URL.
            clearCallbackUrl();
            authLog('warn', 'no session found after callback');
        };
        void init().catch((err) => {
            authLog('error', 'init threw', {
                message: err?.message,
                name: err?.name,
            });
            finish('error');
            clearCallbackUrl();
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                authLog('info', 'onAuthStateChange SIGNED_IN', { userId: session.user.id });
                finish('success');
            }
            if (event === 'SIGNED_OUT') {
                // If the callback returns but we never get a session, treat as error after timeout.
                authLog('warn', 'onAuthStateChange SIGNED_OUT during callback');
                setStatus('verifying');
            }
        });
        return () => {
            clearTimeout(timer);
            subscription.unsubscribe();
        };
    }, []);
    useEffect(() => {
        if (status !== 'success')
            return;
        const t = setTimeout(() => navigate('/dashboard', { replace: true }), 800);
        return () => clearTimeout(t);
    }, [navigate, status]);
    return (_jsx("div", { className: "flex min-h-screen flex-col items-center justify-center bg-slate-50 py-12 sm:px-6 lg:px-8", children: _jsxs("div", { className: "sm:mx-auto sm:w-full sm:max-w-md bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10 border border-slate-200 text-center", children: [status === 'verifying' && _jsx("p", { children: "Finishing sign-in\u2026" }), status === 'success' && _jsx("p", { className: "text-green-600", children: "Signed in! Redirecting\u2026" }), status === 'error' && (_jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-red-600", children: errorMessage }), _jsx(Link, { className: "underline text-indigo-600 hover:text-indigo-500", to: "/login", children: "Back to login" })] }))] }) }));
}

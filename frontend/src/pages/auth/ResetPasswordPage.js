import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    useEffect(() => {
        // Check if we have an active session or a recovery hash in the URL
        // Supabase handles the #access_token=... automatically and logs the user in.
        // If there is no session, they probably came here without a valid token.
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                // We'll let them try, but it might fail if they aren't authenticated
                // Wait, supabase needs the user to be signed in to update their password.
                // If the token is expired, they won't be signed in.
                setError('This reset link is no longer valid or has expired.');
            }
        });
    }, []);
    const handleUpdate = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            setLoading(false);
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }
        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });
            if (updateError) {
                setError(updateError.message);
            }
            else {
                // On success, revoke other sessions and redirect to login
                await supabase.auth.signOut();
                navigate('/login', { state: { message: 'Password updated — please log in' } });
            }
        }
        catch (err) {
            setError('An unexpected error occurred');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "flex min-h-screen flex-col items-center justify-center bg-slate-50 py-12 sm:px-6 lg:px-8", children: [_jsx("div", { className: "sm:mx-auto sm:w-full sm:max-w-md", children: _jsx("h2", { className: "mt-6 text-center text-3xl font-bold tracking-tight text-slate-900", children: "Set new password" }) }), _jsx("div", { className: "mt-8 sm:mx-auto sm:w-full sm:max-w-md", children: _jsx("div", { className: "bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10 border border-slate-200", children: _jsxs("form", { className: "space-y-6", onSubmit: handleUpdate, children: [error && (_jsx("div", { className: "rounded-md bg-red-50 p-4", children: _jsx("div", { className: "text-sm text-red-700", children: error }) })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700", children: "New Password" }), _jsx("div", { className: "mt-1", children: _jsx("input", { type: "password", required: true, value: password, onChange: (e) => setPassword(e.target.value), className: "block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm" }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700", children: "Confirm Password" }), _jsx("div", { className: "mt-1", children: _jsx("input", { type: "password", required: true, value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), className: "block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm" }) })] }), _jsx("div", { children: _jsx(Button, { type: "submit", className: "w-full", disabled: loading || error === 'This reset link is no longer valid or has expired.', children: loading ? 'Updating...' : 'Update Password' }) })] }) }) })] }));
}

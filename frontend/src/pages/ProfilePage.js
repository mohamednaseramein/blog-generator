import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Field } from '../components/ui/field';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Toast } from '../components/ui/toast';
import { ProfileSettings } from '../components/ProfileSettings';
const emailSchema = z.string().email('Enter a valid email');
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
const nameSchema = z.string().min(1, 'Name is required').max(120, 'At most 120 characters');
export default function ProfilePage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const initialName = useMemo(() => {
        const n = user?.user_metadata?.full_name;
        return typeof n === 'string' ? n : '';
    }, [user?.user_metadata]);
    const [name, setName] = useState(initialName);
    const [email, setEmail] = useState(user?.email ?? '');
    const [newPassword, setNewPassword] = useState('');
    const [activeProfileId, setActiveProfileId] = useState(() => {
        return localStorage.getItem('blog-generator:active-profile-id');
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    if (!user)
        return null;
    async function handleUpdateName() {
        setError(null);
        setSuccess(null);
        const parsed = nameSchema.safeParse(name);
        if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? 'Invalid name');
            return;
        }
        setIsSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({ data: { full_name: parsed.data } });
            if (error)
                throw error;
            setSuccess('Name updated.');
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setIsSaving(false);
        }
    }
    async function handleUpdateEmail() {
        setError(null);
        setSuccess(null);
        const parsed = emailSchema.safeParse(email);
        if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? 'Invalid email');
            return;
        }
        setIsSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({ email: parsed.data });
            if (error)
                throw error;
            setSuccess('We sent a verification email to your new address. Please verify it to confirm the change.');
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setIsSaving(false);
        }
    }
    async function handleUpdatePassword() {
        setError(null);
        setSuccess(null);
        const parsed = passwordSchema.safeParse(newPassword);
        if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? 'Invalid password');
            return;
        }
        setIsSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: parsed.data });
            if (error)
                throw error;
            setNewPassword('');
            setSuccess('Password updated.');
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setIsSaving(false);
        }
    }
    return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50", children: _jsxs("div", { className: "mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8", children: [_jsxs("div", { className: "mb-8 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight text-slate-900", children: "My profile" }), _jsx("p", { className: "mt-1 text-sm text-slate-500", children: "Manage your account and your custom profiles." })] }), _jsx("button", { onClick: () => navigate('/'), className: "text-sm text-slate-600 hover:underline", children: "\u2190 Back" })] }), error && _jsx(Toast, { variant: "error", children: error }), success && _jsx(Toast, { variant: "success", children: success }), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200", children: [_jsx("h2", { className: "text-lg font-semibold text-slate-900", children: "Account settings" }), _jsx("p", { className: "mt-1 text-sm text-slate-500", children: "Update your name, email, or password." }), _jsxs("div", { className: "mt-5 grid gap-4", children: [_jsx(Field, { label: "Name", children: _jsx(Input, { value: name, onChange: (e) => setName(e.target.value), placeholder: "Your name" }) }), _jsx(Button, { onClick: () => void handleUpdateName(), disabled: isSaving, size: "sm", className: "w-fit", children: "Save name" }), _jsx("div", { className: "h-px bg-slate-200" }), _jsx(Field, { label: "Email", children: _jsx(Input, { value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@example.com" }) }), _jsx(Button, { onClick: () => void handleUpdateEmail(), disabled: isSaving, size: "sm", className: "w-fit", children: "Change email" }), _jsx("p", { className: "text-xs text-slate-500", children: "Email changes require verification. The new email won\u2019t be confirmed until you verify it." }), _jsx("div", { className: "h-px bg-slate-200" }), _jsx(Field, { label: "New password", children: _jsx(Input, { value: newPassword, onChange: (e) => setNewPassword(e.target.value), placeholder: "At least 8 characters", type: "password" }) }), _jsx(Button, { onClick: () => void handleUpdatePassword(), disabled: isSaving, size: "sm", className: "w-fit", children: "Change password" })] })] }), _jsxs("div", { className: "rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200", children: [_jsx("h2", { className: "text-lg font-semibold text-slate-900", children: "Custom profiles" }), _jsx("p", { className: "mt-1 text-sm text-slate-500", children: "These profiles control the voice, audience, and style used when generating blogs." }), _jsx("div", { className: "mt-5", children: _jsx(ProfileSettings, { activeProfileId: activeProfileId, onActiveProfileChange: (id) => {
                                            setActiveProfileId(id);
                                            localStorage.setItem('blog-generator:active-profile-id', id);
                                        } }) })] })] })] }) }));
}

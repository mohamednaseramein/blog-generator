import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { listProfiles, createProfile, updateProfile, deleteProfile } from '../api/profile-api.js';
import { ProfileForm } from './ProfileForm.js';
import { Button } from './ui/button.js';
import { Toast } from './ui/toast.js';
export function ProfileSettings({ activeProfileId, onActiveProfileChange, onBack }) {
    const [profiles, setProfiles] = useState([]);
    const [view, setView] = useState('list');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    useEffect(() => {
        void loadProfiles();
    }, []);
    async function loadProfiles() {
        try {
            const { profiles: loaded } = await listProfiles();
            setProfiles(loaded);
        }
        catch (e) {
            setError(e.message);
        }
    }
    async function handleCreate(values) {
        setIsLoading(true);
        setError(null);
        try {
            const { profile } = await createProfile(values);
            setProfiles((prev) => [...prev, profile]);
            setView('list');
            setSuccessMsg(`Profile "${profile.name}" created.`);
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setIsLoading(false);
        }
    }
    async function handleUpdate(profile, values) {
        setIsLoading(true);
        setError(null);
        try {
            const { profile: updated } = await updateProfile(profile.id, values);
            setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            setView('list');
            setSuccessMsg(`Profile "${updated.name}" updated. Changes apply to your next generation. Existing drafts are unaffected.`);
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setIsLoading(false);
        }
    }
    async function handleDelete(profile) {
        if (!confirm(`Delete "${profile.name}"? This cannot be undone.`))
            return;
        setError(null);
        try {
            await deleteProfile(profile.id);
            setProfiles((prev) => prev.filter((p) => p.id !== profile.id));
            if (activeProfileId === profile.id) {
                const remaining = profiles.filter((p) => p.id !== profile.id);
                if (remaining.length > 0)
                    onActiveProfileChange(remaining[0].id);
            }
            setSuccessMsg(`Profile "${profile.name}" deleted.`);
        }
        catch (e) {
            setError(e.message);
        }
    }
    if (view === 'create') {
        return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { onClick: () => setView('list'), className: "text-sm text-slate-500 hover:text-slate-700", children: "\u2190 Back" }), _jsx("h2", { className: "text-lg font-semibold text-slate-800", children: "Create New Profile" })] }), error && _jsx(Toast, { variant: "error", children: error }), _jsx(ProfileForm, { onSubmit: handleCreate, submitLabel: "Create Profile", isLoading: isLoading })] }));
    }
    if (typeof view === 'object' && 'editing' in view) {
        const profile = view.editing;
        return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { onClick: () => setView('list'), className: "text-sm text-slate-500 hover:text-slate-700", children: "\u2190 Back" }), _jsx("h2", { className: "text-lg font-semibold text-slate-800", children: "Edit Profile" })] }), error && _jsx(Toast, { variant: "error", children: error }), _jsx(ProfileForm, { initialValues: profile, onSubmit: (values) => handleUpdate(profile, values), submitLabel: "Save Changes", isLoading: isLoading })] }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { onClick: onBack, className: "text-sm text-slate-500 hover:text-slate-700", children: "\u2190 Back" }), _jsx("h2", { className: "text-lg font-semibold text-slate-800", children: "Author Profiles" })] }), _jsx(Button, { size: "sm", onClick: () => setView('create'), children: "+ New Profile" })] }), error && _jsx(Toast, { variant: "error", children: error }), successMsg && (_jsx(Toast, { variant: "success", children: successMsg })), _jsx("div", { className: "space-y-3", children: profiles.map((profile) => (_jsx("div", { className: `rounded-lg border p-4 transition-colors ${profile.id === activeProfileId
                        ? 'border-indigo-300 bg-indigo-50'
                        : 'border-slate-200 bg-white'}`, children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-semibold text-slate-900", children: profile.name }), profile.isPredefined && (_jsx("span", { className: "rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500", children: "Template" })), profile.id === activeProfileId && (_jsx("span", { className: "rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700", children: "Active" }))] }), _jsx("p", { className: "mt-0.5 text-sm text-slate-600", children: profile.authorRole }), _jsx("p", { className: "mt-1 text-xs text-slate-400", children: profile.toneOfVoice })] }), _jsxs("div", { className: "flex shrink-0 items-center gap-2", children: [profile.id !== activeProfileId && (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => onActiveProfileChange(profile.id), children: "Use" })), !profile.isPredefined && (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: () => setView({ editing: profile }), children: "Edit" }), _jsx("button", { onClick: () => void handleDelete(profile), className: "rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-700", children: "Delete" })] }))] })] }) }, profile.id))) })] }));
}

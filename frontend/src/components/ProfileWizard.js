import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { getPredefinedProfiles, cloneProfile, createProfile, updateProfile } from '../api/profile-api.js';
import { ProfileForm } from './ProfileForm.js';
import { Button } from './ui/button.js';
import { Toast } from './ui/toast.js';
export function ProfileWizard({ onProfileSelected }) {
    const [step, setStep] = useState('pick');
    const [predefinedProfiles, setPredefinedProfiles] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        async function loadProfiles() {
            try {
                const { profiles } = await getPredefinedProfiles();
                setPredefinedProfiles(profiles);
            }
            catch (e) {
                setError(e.message);
            }
        }
        void loadProfiles();
    }, []);
    async function handlePickPredefined(profile) {
        setIsLoading(true);
        setError(null);
        try {
            const { profile: cloned } = await cloneProfile({ cloneFromPredefinedId: profile.id });
            setSelectedProfile(cloned);
            setStep('customize');
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setIsLoading(false);
        }
    }
    async function handleCreateFromScratch(values) {
        setIsLoading(true);
        setError(null);
        try {
            const { profile: created } = await createProfile(values);
            onProfileSelected(created);
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setIsLoading(false);
        }
    }
    async function handleCustomizeAndSave(values) {
        if (!selectedProfile)
            return;
        setIsLoading(true);
        setError(null);
        try {
            const { profile: updated } = await updateProfile(selectedProfile.id, values);
            onProfileSelected(updated);
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setIsLoading(false);
        }
    }
    if (step === 'pick') {
        return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "text-center", children: [_jsx("h2", { className: "text-2xl font-bold text-slate-900", children: "Set Up Your Author Profile" }), _jsx("p", { className: "mt-2 text-slate-600", children: "Choose a predefined profile template or create your own. This helps us understand your voice and generate better content." })] }), error && _jsx(Toast, { variant: "error", children: error }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2", children: predefinedProfiles.map((profile) => (_jsxs("button", { onClick: () => void handlePickPredefined(profile), disabled: isLoading, className: "rounded-lg border-2 border-slate-200 p-4 text-left transition hover:border-indigo-500 hover:bg-indigo-50 disabled:opacity-50", children: [_jsx("h3", { className: "font-semibold text-slate-900", children: profile.name }), _jsx("p", { className: "mt-1 text-sm text-slate-600", children: profile.authorRole }), _jsx("p", { className: "mt-2 text-xs text-slate-500", children: profile.intent })] }, profile.id))) }), _jsx("div", { className: "border-t border-slate-200 pt-6", children: _jsxs("button", { onClick: () => setStep('customize'), className: "w-full rounded-lg border-2 border-dashed border-slate-300 py-8 text-center transition hover:border-slate-400 hover:bg-slate-50", children: [_jsx("div", { className: "text-lg font-semibold text-slate-700", children: "+ Create Your Own" }), _jsx("p", { className: "mt-1 text-sm text-slate-500", children: "Define your unique voice from scratch" })] }) })] }));
    }
    if (step === 'customize') {
        return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "text-center", children: [_jsx("h2", { className: "text-2xl font-bold text-slate-900", children: selectedProfile ? 'Customize Your Profile' : 'Create Your Profile' }), _jsx("p", { className: "mt-2 text-slate-600", children: selectedProfile ? 'Edit the template to match your voice' : 'Define your author voice and audience' })] }), error && _jsx(Toast, { variant: "error", children: error }), _jsx("div", { className: "rounded-lg border border-slate-200 bg-slate-50 p-6", children: _jsx(ProfileForm, { initialValues: selectedProfile || undefined, onSubmit: selectedProfile ? handleCustomizeAndSave : handleCreateFromScratch, submitLabel: selectedProfile ? 'Continue to Blog' : 'Create Profile', isLoading: isLoading }) }), selectedProfile && (_jsx(Button, { variant: "ghost", onClick: () => setStep('pick'), className: "w-full", children: "\u2190 Back to Templates" }))] }));
    }
    return null;
}

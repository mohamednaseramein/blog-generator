import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { listProfiles } from '../api/profile-api.js';
import { Button } from './ui/button.js';
export function ProfileSwitcher({ activeProfileId, onProfileChange }) {
    const [profiles, setProfiles] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const activeProfile = profiles.find((p) => p.id === activeProfileId);
    useEffect(() => {
        async function loadProfiles() {
            try {
                setIsLoading(true);
                const { profiles: loaded } = await listProfiles();
                setProfiles(loaded);
            }
            catch (e) {
                setError(e.message);
            }
            finally {
                setIsLoading(false);
            }
        }
        void loadProfiles();
    }, []);
    if (!activeProfile || profiles.length === 0) {
        return null;
    }
    return (_jsxs("div", { className: "relative inline-block", children: [_jsxs("button", { onClick: () => setIsOpen(!isOpen), className: "flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50", disabled: isLoading, children: [_jsx("span", { className: "text-slate-600", children: "Profile:" }), _jsx("span", { className: "font-semibold text-slate-900", children: activeProfile.name }), _jsx("svg", { className: `h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`, fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 14l-7 7m0 0l-7-7m7 7V3" }) })] }), isOpen && (_jsxs("div", { className: "absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-slate-200 bg-white shadow-lg", children: [error && (_jsx("div", { className: "border-b border-slate-200 px-4 py-2 text-sm text-red-600", children: "Error loading profiles" })), _jsx("div", { className: "max-h-64 overflow-y-auto", children: profiles.map((profile) => (_jsxs("button", { onClick: () => {
                                onProfileChange(profile);
                                setIsOpen(false);
                            }, className: `w-full px-4 py-3 text-left text-sm transition-colors ${profile.id === activeProfileId
                                ? 'bg-indigo-50 text-indigo-900'
                                : 'hover:bg-slate-50 text-slate-700'}`, children: [_jsx("div", { className: "font-semibold", children: profile.name }), _jsx("div", { className: "mt-0.5 text-xs text-slate-500", children: profile.authorRole })] }, profile.id))) }), _jsx("div", { className: "border-t border-slate-200 px-4 py-2", children: _jsx(Button, { variant: "ghost", size: "sm", onClick: () => {
                                setIsOpen(false);
                                // TODO: navigate to profile settings
                            }, className: "w-full text-xs", children: "\u2699\uFE0F Manage Profiles" }) })] }))] }));
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { listProfiles } from '../api/profile-api.js';
import { Button } from './ui/button.js';
export function ProfileSwitcher({ activeProfileId, onProfileChange, onManageProfiles }) {
    const [profiles, setProfiles] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const containerRef = useRef(null);
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
    useEffect(() => {
        if (!activeProfileId) {
            setSelectedProfile(null);
            return;
        }
        setSelectedProfile(profiles.find((p) => p.id === activeProfileId) ?? null);
    }, [activeProfileId, profiles]);
    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        }
        if (isOpen)
            document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);
    if (!activeProfile || profiles.length === 0) {
        return null;
    }
    const displayedProfile = selectedProfile ?? activeProfile;
    const dropdownId = 'profile-switcher-menu';
    return (_jsxs("div", { className: "relative inline-block", ref: containerRef, children: [_jsxs("button", { onClick: () => setIsOpen(!isOpen), "aria-haspopup": "listbox", "aria-expanded": isOpen, "aria-controls": dropdownId, className: "flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50", disabled: isLoading, children: [_jsx("span", { className: "text-slate-600", children: "Profile:" }), _jsx("span", { className: "font-semibold text-slate-900", children: displayedProfile.name }), _jsx("svg", { className: `h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`, fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 14l-7 7m0 0l-7-7m7 7V3" }) })] }), isOpen && (_jsxs("div", { id: dropdownId, role: "listbox", "aria-label": "Select author profile", className: "absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-slate-200 bg-white shadow-lg", children: [error && (_jsx("div", { className: "border-b border-slate-200 px-4 py-2 text-sm text-red-600", children: "Error loading profiles" })), _jsx("div", { className: "max-h-64 overflow-y-auto", children: profiles.map((profile) => (_jsxs("button", { type: "button", role: "option", "aria-selected": profile.id === activeProfileId, onClick: () => {
                                onProfileChange(profile);
                                setSelectedProfile(profile);
                                setIsOpen(false);
                            }, className: `w-full px-4 py-3 text-left text-sm transition-colors ${profile.id === activeProfileId
                                ? 'bg-indigo-50 text-indigo-900'
                                : 'hover:bg-slate-50 text-slate-700'}`, children: [_jsx("div", { className: "font-semibold", children: profile.name }), _jsx("div", { className: "mt-0.5 text-xs text-slate-500", children: profile.authorRole })] }, profile.id))) }), onManageProfiles && (_jsx("div", { className: "border-t border-slate-200 px-4 py-2", children: _jsx(Button, { variant: "ghost", size: "sm", onClick: () => {
                                setIsOpen(false);
                                onManageProfiles();
                            }, className: "w-full text-xs", children: "\u2699 Manage Profiles" }) }))] }))] }));
}

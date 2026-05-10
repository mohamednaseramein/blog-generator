import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserSettingsMenu } from './UserSettingsMenu';
export function AppHeader() {
    const { user } = useAuth();
    const authState = user ? 'logged_in' : 'logged_out';
    const logoTo = authState === 'logged_in' ? '/dashboard' : '/';
    return (_jsx("header", { className: "border-b border-slate-200 bg-white", children: _jsxs("div", { className: "mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8", children: [_jsxs(Link, { to: logoTo, className: "flex items-center gap-2 text-slate-900 hover:text-slate-700", children: [_jsx("span", { className: "inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-base text-white shadow-sm", children: "\u2726" }), _jsx("span", { className: "text-base font-semibold tracking-tight", children: "AI Blog Generator" })] }), _jsx(UserSettingsMenu, { authState: authState })] }) }));
}

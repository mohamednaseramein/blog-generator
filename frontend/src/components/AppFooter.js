import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
export function AppFooter() {
    const year = new Date().getFullYear();
    return (_jsx("footer", { className: "border-t border-slate-200 bg-white", children: _jsxs("div", { className: "mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8", children: [_jsxs("div", { children: ["\u00A9 ", year, " AI Blog Generator"] }), _jsx("nav", { "aria-label": "Footer", className: "flex gap-4", children: _jsx(Link, { to: "/help/ai-detector-rules", className: "hover:text-slate-700", children: "AI Detector Rules" }) })] }) }));
}

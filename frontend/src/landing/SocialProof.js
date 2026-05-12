import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { landingContent } from './content';
export function SocialProof() {
    const { socialProof } = landingContent;
    if (socialProof.stats.length === 0) {
        return null;
    }
    return (_jsx("section", { id: "social-proof", "aria-labelledby": "landing-social-heading", className: "px-4 py-14 sm:px-6 lg:py-20", children: _jsxs("div", { className: "mx-auto max-w-6xl", children: [_jsx("h2", { id: "landing-social-heading", className: "text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl", children: socialProof.sectionTitle }), _jsx("div", { className: "mt-10 grid gap-4 sm:grid-cols-2", children: socialProof.stats.map((stat) => (_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm", children: [_jsx("p", { className: "text-sm font-medium uppercase tracking-wide text-slate-500", children: stat.label }), _jsx("p", { className: "mt-2 text-2xl font-semibold text-slate-900", children: stat.value })] }, stat.label))) })] }) }));
}

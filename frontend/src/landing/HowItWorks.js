import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { landingContent } from './content';
export function HowItWorks() {
    const { howItWorks } = landingContent;
    return (_jsx("section", { id: "how-it-works", "aria-labelledby": "landing-how-heading", className: "border-y border-slate-200/80 bg-white/70 px-4 py-16 sm:px-6 lg:py-24", children: _jsxs("div", { className: "mx-auto max-w-6xl", children: [_jsxs("div", { className: "mx-auto max-w-2xl text-center", children: [_jsx("h2", { id: "landing-how-heading", className: "text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl", children: howItWorks.sectionTitle }), _jsx("p", { className: "mt-4 text-lg text-slate-600", children: howItWorks.sectionSubtitle })] }), _jsx("ol", { className: "mt-14 grid list-none gap-8 lg:grid-cols-4 lg:gap-6", children: howItWorks.steps.map((step) => {
                        const Icon = step.icon;
                        return (_jsx("li", { className: "relative flex flex-col lg:block", children: _jsxs("div", { className: "flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm", children: [_jsx("div", { className: "mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700", children: _jsx(Icon, { className: "h-6 w-6", "aria-hidden": true }) }), _jsx("h3", { className: "text-lg font-semibold text-slate-900", children: step.title }), _jsx("p", { className: "mt-3 text-sm leading-relaxed text-slate-600", children: step.description })] }) }, step.id));
                    }) })] }) }));
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { landingContent } from './content';
import { SmartNavLink } from './SmartNavLink';
import { recordLandingFeatureClick } from './analytics';
export function Features() {
    const { features } = landingContent;
    return (_jsx("section", { id: "features", "aria-labelledby": "landing-features-heading", className: "px-4 py-16 sm:px-6 lg:py-24", children: _jsxs("div", { className: "mx-auto max-w-6xl", children: [_jsxs("div", { className: "mx-auto max-w-2xl text-center", children: [_jsx("h2", { id: "landing-features-heading", className: "text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl", children: features.sectionTitle }), _jsx("p", { className: "mt-4 text-lg text-slate-600", children: features.sectionSubtitle })] }), _jsx("ul", { className: "mt-14 grid list-none gap-6 sm:grid-cols-2 lg:grid-cols-4", children: features.cards.map((card) => {
                        const titleId = `feature-title-${card.id}`;
                        const descId = `feature-desc-${card.id}`;
                        const Icon = card.icon;
                        return (_jsx("li", { className: "h-full", children: _jsxs("article", { className: "flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-slate-900/5 transition hover:shadow-md", "aria-labelledby": titleId, "aria-describedby": descId, children: [_jsx("div", { className: "mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700", children: _jsx(Icon, { className: "h-6 w-6", "aria-hidden": true }) }), _jsx("h3", { id: titleId, className: "text-lg font-semibold text-slate-900", children: card.title }), _jsx("p", { id: descId, className: "mt-2 flex-1 text-sm leading-relaxed text-slate-600", children: card.description }), _jsxs(SmartNavLink, { href: card.learnMoreHref, className: "mt-4 inline-flex text-sm font-semibold text-indigo-700 underline-offset-4 hover:text-indigo-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2", onClick: () => recordLandingFeatureClick({
                                            feature_id: card.id,
                                        }), children: ["Learn more", _jsxs("span", { className: "sr-only", children: [' ', "about ", card.title] })] })] }) }, card.id));
                    }) })] }) }));
}

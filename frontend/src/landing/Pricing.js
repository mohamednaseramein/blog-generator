import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { landingContent } from './content';
import { SmartNavLink } from './SmartNavLink';
import { recordLandingCtaClick, recordLandingPricingCtaClick } from './analytics';
function planToAnalyticsPlan(tierId) {
    if (tierId === 'free')
        return 'free';
    if (tierId === 'pro')
        return 'pro';
    if (tierId === 'team')
        return 'team_waitlist';
    return null;
}
export function Pricing() {
    const { pricing } = landingContent;
    return (_jsx("section", { id: "pricing", "aria-labelledby": "landing-pricing-heading", className: "border-t border-slate-200/80 bg-white/80 px-4 py-16 sm:px-6 lg:py-24", children: _jsxs("div", { className: "mx-auto max-w-6xl", children: [_jsxs("div", { className: "mx-auto max-w-2xl text-center", children: [_jsx("h2", { id: "landing-pricing-heading", className: "text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl", children: pricing.sectionTitle }), _jsx("p", { className: "mt-4 text-lg text-slate-600", children: pricing.sectionSubtitle })] }), _jsx("div", { className: "mt-14 grid gap-8 lg:grid-cols-3", children: pricing.tiers.map((tier) => {
                        const plan = planToAnalyticsPlan(tier.id);
                        const isTeam = tier.comingSoon === true;
                        const ctaClass = isTeam
                            ? 'inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 shadow-none hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
                            : 'inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2';
                        return (_jsxs("article", { className: "flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm ring-slate-900/5", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsx("h3", { className: "text-xl font-semibold text-slate-900", children: tier.name }), isTeam && (_jsx("span", { className: "rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-900", children: "Coming soon" }))] }), _jsx("p", { className: "mt-2 text-3xl font-bold tracking-tight text-slate-900", children: tier.priceLabel }), _jsx("p", { className: "mt-2 text-sm text-slate-600", children: tier.summary }), _jsx("ul", { className: "mt-6 flex flex-1 flex-col gap-2 text-sm text-slate-700", children: tier.bullets.map((b) => (_jsxs("li", { className: "flex gap-2", children: [_jsx("span", { className: "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500", "aria-hidden": true }), _jsx("span", { children: b })] }, b))) }), _jsx(SmartNavLink, { href: tier.cta.href, className: ctaClass, "aria-label": tier.ctaAssistiveHint ? `${tier.cta.label}. ${tier.ctaAssistiveHint}` : undefined, onClick: () => {
                                        if (plan) {
                                            recordLandingPricingCtaClick({ plan });
                                        }
                                        recordLandingCtaClick({
                                            cta_id: `pricing_${tier.id}`,
                                            destination_url: tier.cta.href,
                                            current_section_id: 'pricing',
                                        });
                                    }, children: tier.cta.label })] }, tier.id));
                    }) }), _jsx("p", { id: "pricing-disclaimer", className: "mx-auto mt-10 max-w-3xl text-center text-sm text-slate-500", children: pricing.disclaimer })] }) }));
}

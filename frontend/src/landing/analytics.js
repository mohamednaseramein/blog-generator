/**
 * Landing-page analytics — wire to the product analytics SDK when available.
 * Events fail silently if instrumentation is blocked (PRD US-9).
 */
export function recordLandingCtaClick(payload) {
    if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console -- dev-only funnel debugging
        console.debug('[landing analytics] recordLandingCtaClick', payload);
    }
}
export function recordLandingFeatureClick(payload) {
    if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console -- dev-only funnel debugging
        console.debug('[landing analytics] recordLandingFeatureClick', payload);
    }
}
export function recordLandingPricingCtaClick(payload) {
    if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console -- dev-only funnel debugging
        console.debug('[landing analytics] recordLandingPricingCtaClick', payload);
    }
}

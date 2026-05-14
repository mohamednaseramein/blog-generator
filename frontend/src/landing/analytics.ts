/**
 * Landing-page analytics — wire to the product analytics SDK when available.
 * Events fail silently if instrumentation is blocked (PRD US-9).
 */

export type LandingCtaPayload = {
  cta_id: string;
  destination_url: string;
  current_section_id: string;
};

export type LandingFeaturePayload = {
  feature_id: string;
};

export type LandingPricingPayload = {
  plan: 'free' | 'pro' | 'team_waitlist';
};

export function recordLandingCtaClick(payload: LandingCtaPayload): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console -- dev-only funnel debugging
    console.debug('[landing analytics] recordLandingCtaClick', payload);
  }
}

export function recordLandingFeatureClick(payload: LandingFeaturePayload): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console -- dev-only funnel debugging
    console.debug('[landing analytics] recordLandingFeatureClick', payload);
  }
}

export function recordLandingPricingCtaClick(payload: LandingPricingPayload): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console -- dev-only funnel debugging
    console.debug('[landing analytics] recordLandingPricingCtaClick', payload);
  }
}

/**
 * Landing page content — single source of truth for every visible string.
 * Structured for Phase-2 multi-language: swap this module for a per-locale
 * variant and the components keep rendering.
 *
 * Keep prose tight: hero H1 ≤ 12 words, sub-headline ≤ 25 words, feature
 * descriptions ≤ 20 words (PRD US-1, US-2).
 */

import {
  ClipboardList,
  PenTool,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface FeatureCard {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  learnMoreHref: string;
}

export interface CtaLink {
  label: string;
  href: string;
}

export interface HowItWorksStep {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface SocialStat {
  label: string;
  value: string;
}

export interface LandingContent {
  hero: {
    h1: string;
    sub: string;
    primaryCta: CtaLink;
    secondaryCta: CtaLink;
    illustrationAlt: string;
  };
  features: {
    sectionTitle: string;
    sectionSubtitle: string;
    cards: FeatureCard[];
  };
  howItWorks: {
    sectionTitle: string;
    sectionSubtitle: string;
    steps: HowItWorksStep[];
  };
  socialProof: {
    sectionTitle: string;
    stats: SocialStat[];
  };
  pricing: {
    sectionTitle: string;
    sectionSubtitle: string;
    disclaimer: string;
  };
}

export const landingContent: LandingContent = {
  hero: {
    h1: "Ship blog drafts that don't read like AI.",
    sub: 'Generate SEO-ready, authentic-sounding posts in minutes — with a built-in AI authenticity check that tells you exactly what to fix.',
    primaryCta: {
      label: "Get started — it's free",
      href: '/register?source=landing_hero',
    },
    secondaryCta: {
      label: 'See how it works',
      href: '#how-it-works',
    },
    illustrationAlt:
      'AI Blog Generator workspace showing a draft with an authenticity score and section-level breakdown',
  },

  features: {
    sectionTitle: 'Everything you need to publish with confidence',
    sectionSubtitle:
      'From topic to publishable draft — with the signals you need to ship work that reads like a human wrote it.',
    cards: [
      {
        id: 'ai-blog-generation',
        icon: PenTool,
        title: 'AI Blog Generation',
        description:
          'Generate structured drafts from a brief, audience, and outline — not from a single prompt.',
        learnMoreHref: '#how-it-works',
      },
      {
        id: 'seo-ready-content',
        icon: Search,
        title: 'SEO-Ready Content',
        description:
          'Readability score, meta description, slug, and headings handled — no manual SEO checklist.',
        learnMoreHref: '#how-it-works',
      },
      {
        id: 'ai-authenticity-check',
        icon: ShieldCheck,
        title: 'AI Authenticity Check',
        description:
          'In-product score with rule-level evidence and surgical fixes — not a vague third-party verdict.',
        learnMoreHref: '/help/ai-detector-rules',
      },
      {
        id: 'author-profiles',
        icon: Users,
        title: 'Author Profiles',
        description:
          'Voice, audience, and intent live on the profile — every draft inherits them, no re-prompting.',
        learnMoreHref: '#how-it-works',
      },
    ],
  },

  howItWorks: {
    sectionTitle: 'How it works',
    sectionSubtitle: 'A straight path from idea to publishable draft — with checks where teams usually get surprised.',
    steps: [
      {
        id: 'step-brief',
        icon: ClipboardList,
        title: 'Tell us your topic and audience',
        description:
          'Share the angle, who it is for, and any must-hit points. Your author profile keeps voice and intent consistent across drafts.',
      },
      {
        id: 'step-draft',
        icon: Sparkles,
        title: 'Generate a draft',
        description:
          'We build an outline you can sanity-check, then generate structured sections — not a wall of generic filler.',
      },
      {
        id: 'step-review',
        icon: ShieldCheck,
        title: 'Review SEO and authenticity',
        description:
          'See readability and on-page SEO signals alongside an authenticity score with concrete fixes, not a mystery verdict.',
      },
      {
        id: 'step-publish',
        icon: Rocket,
        title: 'Publish or export',
        description:
          'Copy rich text or Markdown, tune the meta description and slug, and ship when it matches your bar.',
      },
    ],
  },

  socialProof: {
    sectionTitle: 'Built with teams in the open',
    stats: [
      { label: 'Release stage', value: 'Open beta' },
      { label: 'Focus', value: 'Authentic, SEO-aware drafts' },
    ],
  },

  pricing: {
    sectionTitle: 'Simple pricing (preview)',
    sectionSubtitle: 'Pick a lane — billing arrives after we finish the preview.',
    disclaimer:
      'Pricing is illustrative for v1 — billing not yet enabled. All paid features are free during this preview.',
  },
};

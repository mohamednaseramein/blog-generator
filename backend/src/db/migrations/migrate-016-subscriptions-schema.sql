-- Migration 016: Subscription plans + per-user subscriptions
-- Ticket:  https://github.com/mohamednaseramein/blog-generator/issues/155
-- Epic:    https://github.com/mohamednaseramein/blog-generator/issues/149
-- AgDR:    docs/agdr/AgDR-0035-migration-subscriptions-schema.md
-- Rollback: DROP TABLE IF EXISTS subscriptions; DROP TABLE IF EXISTS plans;
--           (also restore handle_new_user() — see migrate-017 rollback in AgDR-0035)

-- Plan catalogue. Limit columns are nullable; NULL = unlimited for that metric.
CREATE TABLE plans (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                        VARCHAR(50)  NOT NULL UNIQUE,
  name                        VARCHAR(120) NOT NULL,
  description                 TEXT         NOT NULL DEFAULT '',
  price_cents                 INTEGER      NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency                    CHAR(3)      NOT NULL DEFAULT 'USD',
  billing_period              VARCHAR(20)  NOT NULL DEFAULT 'monthly'
                              CHECK (billing_period IN ('monthly')),
  blog_quota                  INTEGER      CHECK (blog_quota IS NULL OR blog_quota >= 0),
  ai_check_quota              INTEGER      CHECK (ai_check_quota IS NULL OR ai_check_quota >= 0),
  author_profile_limit        INTEGER      CHECK (author_profile_limit IS NULL OR author_profile_limit >= 0),
  reference_extraction_quota  INTEGER      CHECK (reference_extraction_quota IS NULL OR reference_extraction_quota >= 0),
  is_public                   BOOLEAN      NOT NULL DEFAULT false,
  is_default                  BOOLEAN      NOT NULL DEFAULT false,
  archived_at                 TIMESTAMPTZ,
  sort_order                  SMALLINT     NOT NULL DEFAULT 0,
  created_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- At most one default plan among non-archived plans.
CREATE UNIQUE INDEX uniq_plans_single_default
  ON plans (is_default) WHERE is_default = true AND archived_at IS NULL;

-- Listing index for the public landing page + admin catalogue.
CREATE INDEX idx_plans_sort_order ON plans (sort_order);

-- Per-user subscription. Exactly one active row per user (the invariant the feature rests on).
CREATE TABLE subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id                 UUID NOT NULL REFERENCES plans(id),
  status                  VARCHAR(20) NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active')),  -- 'past_due','canceled' reserved for Stripe
  current_period_start    TIMESTAMPTZ NOT NULL,
  current_period_end      TIMESTAMPTZ NOT NULL,
  stripe_subscription_id  VARCHAR(255) UNIQUE,            -- Stripe seam, NULL in v1
  changed_by              UUID REFERENCES users(id) ON DELETE SET NULL,  -- admin id, or NULL = self-serve
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uniq_subscriptions_one_active_per_user
  ON subscriptions (user_id) WHERE status = 'active';

CREATE INDEX idx_subscriptions_plan_id ON subscriptions (plan_id);

# Vyral Platform - Environment Configuration

This document describes all environment variables used by the Vyral platform.

## Pre-configured by Manus (Do not edit)

These variables are automatically injected by the Manus platform:

- `DATABASE_URL` - MySQL database connection string
- `JWT_SECRET` - Session cookie signing secret
- `VITE_APP_ID` - Manus OAuth application ID
- `OAUTH_SERVER_URL` - Manus OAuth backend base URL
- `VITE_OAUTH_PORTAL_URL` - Manus login portal URL
- `OWNER_OPEN_ID` - Owner's Manus OpenID
- `OWNER_NAME` - Owner's name
- `BUILT_IN_FORGE_API_URL` - Manus built-in APIs URL
- `BUILT_IN_FORGE_API_KEY` - Manus built-in APIs key (server-side)
- `VITE_FRONTEND_FORGE_API_URL` - Manus APIs URL (frontend)
- `VITE_FRONTEND_FORGE_API_KEY` - Manus APIs key (frontend)
- `VITE_ANALYTICS_ENDPOINT` - Analytics endpoint
- `VITE_ANALYTICS_WEBSITE_ID` - Analytics website ID

## Optional External Services

### OpenAI API (for enhanced Vyral Match)

**Key:** `OPENAI_API_KEY`
**Value:** Your OpenAI API key (format: `sk-...`)
**Get it from:** https://platform.openai.com/api-keys
**Purpose:** Enhanced creator-brand matching using AI analysis
**Optional:** Yes - platform works without it, but matching quality is reduced

**Additional Config:**
- `OPENAI_MODEL` - Model to use (default: `gpt-4-turbo-preview`)
- `VYRAL_MATCH_USE_OPENAI` - Enable/disable OpenAI for matching (default: `false`)

### Apify API (for post monitoring)

**Key:** `APIFY_API_KEY`
**Value:** Your Apify API token
**Get it from:** https://apify.com
**Purpose:** Monitor TikTok, Instagram, and YouTube posts for engagement and compliance
**Optional:** Yes - background monitoring works with placeholder structure

**Additional Config:**
- `APIFY_ACTOR_ID_TIKTOK` - Actor ID for TikTok monitoring
- `APIFY_ACTOR_ID_INSTAGRAM` - Actor ID for Instagram monitoring
- `APIFY_ACTOR_ID_YOUTUBE` - Actor ID for YouTube monitoring

### Upstash Redis (for background jobs)

**Key:** `UPSTASH_REDIS_URL`
**Value:** Your Upstash Redis connection URL
**Get it from:** https://upstash.com
**Purpose:** Store and schedule background monitoring jobs
**Optional:** Yes - platform uses Supabase Edge Functions as fallback

**Additional Config:**
- `UPSTASH_REDIS_TOKEN` - Redis authentication token

## Stripe Payment Processing

Stripe keys are pre-configured by Manus in test mode:

- `STRIPE_SECRET_KEY` - Secret key (format: `sk_test_...`)
- `STRIPE_PUBLISHABLE_KEY` - Publishable key (format: `pk_test_...`)
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret

**Configuration:**
- `PAYOUT_DELAY_DAYS` - Days before standard payout release (default: 7)
- `PRO_PAYOUT_DELAY_DAYS` - Days before Pro creator payout release (default: 2)

## Platform Configuration

### Vyral Match Algorithm

- `VYRAL_MATCH_NICHE_WEIGHT` - Weight for niche matching (default: 0.4)
- `VYRAL_MATCH_ENGAGEMENT_WEIGHT` - Weight for engagement rate (default: 0.35)
- `VYRAL_MATCH_TIER_WEIGHT` - Weight for creator tier (default: 0.25)

### Content Approval Workflow

- `CONTENT_AUTO_APPROVAL_TIMEOUT` - Auto-approve after X ms (default: 48 hours)
- `CONTENT_FREE_REVISIONS` - Free revisions allowed (default: 1)

### Creator Subscription

- `CREATOR_PRO_PRICE` - Pro subscription price in cents (default: 1200 = $12.00)
- `CREATOR_PRO_PAYOUT_DELAY_DAYS` - Payout delay for Pro users (default: 2)

### Monitoring Jobs

- `MONITORING_JOB_INTERVAL` - Job run interval in ms (default: 48 hours)
- `MONITORING_JOB_TIMEOUT` - Job timeout in ms (default: 5 minutes)

### Admin Settings

- `ENABLE_NEW_SIGNUPS` - Allow new user registrations (default: true)
- `ENABLE_CAMPAIGN_CREATION` - Allow campaign creation (default: true)
- `ENABLE_CREATOR_APPLICATIONS` - Allow creator applications (default: true)

### Logging

- `LOG_LEVEL` - Logging level (default: info)
- `ENABLE_REQUEST_LOGGING` - Log HTTP requests (default: true)
- `ENABLE_ERROR_TRACKING` - Track errors (default: true)

## How to Add/Update Secrets

1. Go to the Vyral platform Settings panel
2. Click on "Secrets" tab
3. Add or update any of the optional service keys
4. Changes take effect immediately

## Testing with Stripe Test Mode

All Stripe keys are in test mode by default. Use these test card numbers:

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **3D Secure:** `4000 0025 0000 3155`

Use any future expiration date and any 3-digit CVC.

## Monitoring Job Setup

The platform includes a background job system for post monitoring. To enable:

1. **Option A: Upstash Redis** (recommended)
   - Sign up at https://upstash.com
   - Create a Redis database
   - Add `UPSTASH_REDIS_URL` and `UPSTASH_REDIS_TOKEN`

2. **Option B: Supabase Edge Functions** (default)
   - No additional setup needed
   - Jobs are triggered via cron simulation

3. **Option C: External Scheduler**
   - Call `/api/trpc/monitoring.runJob` periodically
   - Use a service like EasyCron or AWS EventBridge

## Post Monitoring with Apify

The monitoring system includes a placeholder structure for Apify integration:

```typescript
// server/monitoring.ts
export async function monitorPostWithApify(postUrl: string, platform: 'tiktok' | 'instagram' | 'youtube') {
  // Placeholder - ready for your Apify API key
  const apifyKey = process.env.APIFY_API_KEY;
  if (!apifyKey) {
    console.warn('Apify API key not configured');
    return null;
  }
  
  // Call Apify actor based on platform
  // Implementation ready for your integration
}
```

Once you have your Apify API key, update the implementation to call the appropriate actor.

## Next Steps

1. **Get API Keys** (optional but recommended):
   - OpenAI: https://platform.openai.com/api-keys
   - Apify: https://apify.com/account/integrations
   - Upstash: https://upstash.com

2. **Add Secrets** through the Settings panel

3. **Test the Platform**:
   - Create a test advertiser account
   - Create a test creator account
   - Create a campaign and test the Vyral Match feature
   - Process a test payment with Stripe test card

4. **Configure Monitoring** (optional):
   - Set up Upstash Redis or use Supabase Edge Functions
   - Test post monitoring with sample posts

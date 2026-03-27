# Vyral

**Live:** https://vyral.onrender.com/

Vyral is an influencer marketing platform built for the Nigerian market. It connects brands with content creators, manages the full campaign lifecycle from briefing through content approval to payout, and processes payments via Interswitch.

## Team

| Name | Role |
|---|---|
| **Obende Michael Onimisi** | Product & Design — concept, UI/UX design, and frontend contributions |
| **Ibeh Chimaobi Samuel** | Engineering — backend, database, API integrations, and full-stack implementation |

## What Works

**Campaign Management**
Brands create campaigns with a budget, content brief, target platforms, and posting requirements. Campaigns can be drafted, published, and managed through a full lifecycle dashboard.

**Creator Recruitment**
Three modes: open applications (creators browse and apply), hand-picking from the creator directory, or Vyral Match — a scoring algorithm that ranks creators by niche alignment, engagement rate, and follower tier.

**Content Approval Workflow**
Creators submit draft content for brand review. Brands can approve the submission or request a revision. One free revision is included per campaign slot.

**Payments via Interswitch**
Campaign budgets are collected through Interswitch WebPay. Funds are held at the platform level and released to creators after a delay window — 7 days for standard accounts, 2 days for Pro subscribers. Payouts are disbursed via Interswitch NIP transfer to the creator's registered bank account.

**Creator Subscriptions**
Creators can upgrade to a Pro plan (₦1,200/month) for faster payout release and priority visibility.

**Messaging**
In-platform direct messaging between brands and creators tied to active campaigns.

**Admin Panel**
Creator identity verification queue, dispute resolution, flagged content log, and platform audit trail.

**Notifications**
In-app notification system for campaign updates, content approvals, and payout events.

## Roadmap

**Post Compliance Monitoring**
Infrastructure for post-go-live monitoring is in place. The next step is integrating Apify to automatically verify that live posts remain accessible and meet campaign requirements (hashtags, brand mentions, duration). Currently the monitoring jobs run on schedule but rely on placeholder data.

**Email Notifications**
The notification system currently delivers in-app alerts only. Email delivery via a transactional provider is planned.

**Campaign Creator Quotas**
Planned feature: advertisers set a creator count alongside their budget, and Vyral automatically splits the budget equally across slots. The campaign locks once all slots are filled.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express, tRPC |
| Database | PostgreSQL (Supabase), Drizzle ORM |
| Payments | Interswitch WebPay (collections), Interswitch NIP (disbursements) |

## Local Development

```bash
pnpm install
pnpm db:push
pnpm dev
```

Create a `.env` file with the following required variables:

```env
DATABASE_URL=
JWT_SECRET=
```

For payment processing:

```env
INTERSWITCH_CLIENT_ID=
INTERSWITCH_CLIENT_SECRET=
INTERSWITCH_MERCHANT_CODE=
INTERSWITCH_PAY_ITEM_ID=
INTERSWITCH_ENV=sandbox
```

> Set `INTERSWITCH_MOCK=true` when running outside Nigeria. The Interswitch sandbox restricts access to Nigerian IP addresses.

See `ENV_CONFIG.md` for the complete environment variable reference.

---

Built for the Enyata Buildathon 2026.

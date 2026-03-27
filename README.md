# Vyral

**Live:** https://vyral.onrender.com/

Vyral is an influencer marketing platform built for the Nigerian market. Brands post campaigns, creators apply or get matched, content gets reviewed, and payments flow through Interswitch, all in one place.

## The Team

**Obende Micheal Osimini** came up with the idea, handled the designs and how everything is supposed to look and feel, and helped out on the frontend side.

**Ibeh Chimaobi Samuel** built the rest. Backend, database, payment integration, and wiring everything together.

## What it does

Brands create campaigns with a budget, brief, and content requirements. They can either open it up for applications, hand-pick creators, or use Vyral Match, an algorithm that scores creators by niche fit, engagement rate, and tier to suggest the best matches.

Once creators are on a campaign they submit their draft content for the brand to review. The brand can approve it or ask for a revision. After the content goes live, a background monitoring job checks periodically that the post is still up and compliant. Payouts are held in escrow and released after a set window, 7 days by default and 2 days for Pro creators.

There's also an admin side for verifying creator identities, handling disputes, and watching flagged content.

## Stack

- React + TypeScript + Tailwind on the frontend
- Node.js + Express + tRPC on the backend
- PostgreSQL via Supabase, with Drizzle ORM
- Interswitch for payments (WebPay for collections, NIP transfers for payouts)

## Running it locally

```bash
pnpm install
pnpm db:push
pnpm dev
```

You'll need a `.env` file. The variables you actually need to get it running:

```
DATABASE_URL=
JWT_SECRET=
```

For payments:
```
INTERSWITCH_CLIENT_ID=
INTERSWITCH_CLIENT_SECRET=
INTERSWITCH_MERCHANT_CODE=
INTERSWITCH_PAY_ITEM_ID=
INTERSWITCH_ENV=sandbox
```

Set `INTERSWITCH_MOCK=true` if you're running locally outside Nigeria, the Interswitch sandbox blocks non-Nigerian IPs.

See `ENV_CONFIG.md` for the full list of environment variables.

---

Built for the Enyata Buildathon 2026.

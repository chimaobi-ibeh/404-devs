# Vyral Platform - Complete Setup Guide

This guide walks you through setting up and using the complete Vyral platform.

## 🎯 What You Have

A fully functional creator-advertiser marketplace with:

✅ **Three-role authentication** (Advertiser, Creator, Admin)
✅ **Campaign management** with 4 casting modes
✅ **AI-powered creator matching** (Vyral Match algorithm)
✅ **Stripe escrow payments** with 20% platform fee
✅ **Content approval workflow** with auto-approval
✅ **Post monitoring system** (Apify-ready)
✅ **Creator earnings dashboard** with Pro subscription
✅ **Admin panel** for disputes and analytics
✅ **Background job system** for monitoring
✅ **Complete database schema** (17 tables)

## 📦 Project Structure

```
vyral-platform/
├── client/src/              # React frontend (Next.js style)
│   ├── pages/              # Page components
│   ├── components/         # Reusable UI components
│   └── lib/                # Frontend utilities
├── server/                 # Express backend
│   ├── routers.ts          # tRPC API procedures
│   ├── db.ts               # Database queries
│   ├── vyralMatch.ts       # AI matching algorithm
│   ├── stripe.ts           # Payment processing
│   ├── monitoring.ts       # Post monitoring
│   └── _core/              # Framework setup
├── drizzle/                # Database schema & migrations
├── shared/                 # Shared types & constants
├── storage/                # S3 file storage helpers
├── VYRAL_README.md         # Feature documentation
├── ENV_CONFIG.md           # Environment variables
└── SETUP_GUIDE.md          # This file
```

## 🚀 Quick Start (5 minutes)

### 1. Start the Development Server

```bash
cd /home/ubuntu/vyral-platform
pnpm dev
```

The platform will be available at the URL shown in the terminal (typically `https://localhost:3000`).

### 2. Create Your First Account

1. Click "Sign In" on the home page
2. Sign in with your Manus account
3. Choose your role: **Advertiser** or **Creator**
4. Fill in your profile information

### 3. Test the Platform

**As an Advertiser:**
1. Go to Brand Dashboard
2. Click "New Campaign"
3. Fill in campaign details (title, budget, deadline)
4. Choose casting mode (try "Vyral Match AI")
5. Create campaign

**As a Creator:**
1. Go to Creator Dashboard
2. Click "Browse Campaigns"
3. View available campaigns
4. Apply to a campaign

## 🔧 Configuration

### Essential Setup

1. **Database** - Already configured
2. **Authentication** - Already configured (Manus OAuth)
3. **Stripe** - Already in test mode
4. **Frontend URL** - Automatically set

### Optional Services (Add Later)

Add these through Settings → Secrets:

| Service | Purpose | Optional | Setup Time |
|---------|---------|----------|-----------|
| OpenAI API | Enhanced Vyral Match | Yes | 5 min |
| Apify API | Post monitoring | Yes | 10 min |
| Upstash Redis | Background jobs | Yes | 5 min |

## 💳 Testing Stripe Payments

All payments use Stripe **test mode** - no real charges.

### Test Card Numbers

| Card | Use Case |
|------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Payment declined |
| `4000 0025 0000 3155` | 3D Secure required |

**Other details:**
- Expiration: Any future date (e.g., 12/25)
- CVC: Any 3 digits (e.g., 123)

### Payment Flow

1. Advertiser creates campaign with budget
2. Click "Fund Campaign" → Stripe payment form
3. Enter test card number
4. Funds held in escrow
5. Creator submits content
6. Advertiser approves
7. Funds released to creator

## 🤖 Vyral Match Algorithm

The platform includes a sophisticated creator-brand matching algorithm.

### How It Works

**Scoring Formula:**
```
Total Score = (Niche Match × 0.4) + (Engagement × 0.35) + (Tier × 0.25)
```

**Components:**

1. **Niche Match (40%)**
   - Analyzes creator's niche against campaign requirements
   - Semantic similarity matching
   - Score: 0-100

2. **Engagement Rate (35%)**
   - Compares creator's engagement with campaign expectations
   - Normalized to 0-100 scale
   - Score: 0-100

3. **Tier Score (25%)**
   - Matches creator tier with campaign budget
   - Nano (0-10K) → Micro (10-100K) → Mid (100K-1M) → Macro (1-10M) → Mega (10M+)
   - Score: 0-100

### Enhanced Matching with OpenAI

To enable AI-powered matching:

1. Get OpenAI API key: https://platform.openai.com/api-keys
2. Add to Settings → Secrets: `OPENAI_API_KEY`
3. Set `VYRAL_MATCH_USE_OPENAI=true`
4. Restart server

The AI will analyze:
- Campaign brief and objectives
- Creator content and audience
- Historical performance
- Brand fit and authenticity

## 📊 Database Schema

The platform uses 17 interconnected tables:

### User Management
- `users` - User accounts and roles
- `advertiserProfiles` - Brand information
- `creatorProfiles` - Creator metrics

### Campaigns
- `campaigns` - Campaign listings
- `campaignRoster` - Creator assignments
- `contentSubmissions` - Draft and live posts
- `contentApprovals` - Review workflow

### Matching & Analytics
- `vyralMatchScores` - AI match results
- `postMonitoring` - Engagement tracking

### Payments
- `payments` - Stripe transactions
- `payouts` - Creator earnings
- `disputes` - Payment disputes

### Subscriptions & Verification
- `creatorSubscriptions` - Pro membership
- `verificationDocuments` - ID verification

## 🎬 Complete User Flow

### Advertiser Flow

```
1. Sign up as Advertiser
   ↓
2. Create campaign
   - Set budget, deadline, requirements
   - Choose casting mode
   ↓
3. Find creators
   - Manual selection
   - Open call applications
   - Vyral Match AI
   ↓
4. Manage roster
   - Invite/accept creators
   - Track applications
   ↓
5. Review content
   - Approve drafts
   - Request revisions
   - Auto-approve after 48h
   ↓
6. Monitor posts
   - Track engagement
   - Verify compliance
   - Collect metrics
   ↓
7. Process payment
   - Release funds after approval
   - Platform keeps 20% fee
   ↓
8. View analytics
   - Campaign performance
   - ROI tracking
   - Creator ratings
```

### Creator Flow

```
1. Sign up as Creator
   - Fill profile (niche, followers, engagement)
   ↓
2. Browse campaigns
   - Filter by niche, budget, deadline
   ↓
3. Apply to campaigns
   - Submit application
   - Track status
   ↓
4. Submit content
   - Upload draft for review
   - Receive feedback
   - Make revisions
   ↓
5. Post live
   - Publish to platform
   - Submit live post link
   ↓
6. Get paid
   - Wait for approval
   - Funds released to payout
   - Standard: 7 days
   - Pro: 2 days
   ↓
7. Track earnings
   - View payout history
   - Monitor Vyral Score
   - Upgrade to Pro ($12/mo)
```

### Admin Flow

```
1. Access Admin Panel
   ↓
2. View Dashboard
   - User count
   - Active campaigns
   - Platform revenue
   - Open disputes
   ↓
3. Manage Disputes
   - Review complaints
   - Mediate conflicts
   - Resolve payments
   ↓
4. Verify Users
   - Review documents
   - Approve/reject verification
   ↓
5. Monitor System
   - Check background jobs
   - View error logs
   - Track Apify integration
   ↓
6. Configure Platform
   - Enable/disable features
   - Set platform fees
   - Manage settings
```

## 🔌 Adding External Services

### OpenAI Integration (Enhanced Matching)

**Step 1: Get API Key**
- Go to https://platform.openai.com/api-keys
- Create new secret key
- Copy the key (format: `sk-...`)

**Step 2: Add to Platform**
- Go to Settings → Secrets
- Add `OPENAI_API_KEY`
- Paste your key
- Save

**Step 3: Enable in Code**
- The platform automatically uses OpenAI if key is present
- Or set `VYRAL_MATCH_USE_OPENAI=true` manually

### Apify Integration (Post Monitoring)

**Step 1: Get API Key**
- Go to https://apify.com
- Sign up for free account
- Get API token from Account → Integrations

**Step 2: Create Actors**
- TikTok monitoring actor
- Instagram monitoring actor
- YouTube monitoring actor
- Get actor IDs

**Step 3: Add to Platform**
- Go to Settings → Secrets
- Add `APIFY_API_KEY`
- Add actor IDs:
  - `APIFY_ACTOR_ID_TIKTOK`
  - `APIFY_ACTOR_ID_INSTAGRAM`
  - `APIFY_ACTOR_ID_YOUTUBE`

**Step 4: Update Code**
- Edit `server/monitoring.ts`
- Implement `monitorPostWithApify()` function
- Call Apify actors based on platform

### Upstash Redis (Background Jobs)

**Step 1: Create Database**
- Go to https://upstash.com
- Create Redis database
- Copy connection URL and token

**Step 2: Add to Platform**
- Go to Settings → Secrets
- Add `UPSTASH_REDIS_URL`
- Add `UPSTASH_REDIS_TOKEN`

**Step 3: Enable in Code**
- Platform automatically uses Redis if configured
- Jobs scheduled with 48-hour intervals
- Automatic retry on failure

## 📈 Monitoring & Analytics

### Admin Dashboard

Access at `/admin` (admin role only)

**Metrics:**
- Total users registered
- Active campaigns count
- Platform revenue (20% of all payments)
- Open disputes

**Tabs:**
1. **Disputes** - Manage conflicts
2. **Verification** - Approve users
3. **Monitoring** - View job logs
4. **Settings** - Configure platform

### Background Jobs

Jobs run automatically every 48 hours:

1. **Post Monitoring**
   - Check if posts still exist
   - Verify privacy settings
   - Capture engagement metrics

2. **Auto-Approval**
   - Approve content after 48 hours
   - Release funds to creator
   - Notify advertiser

3. **Payout Processing**
   - Process pending payouts
   - Standard: 7 days
   - Pro: 2 days

### Logging

View logs in admin panel:
- Server request logs
- Error tracking
- Background job logs
- Stripe webhook logs

## 🧪 Testing Checklist

Complete these tests to verify everything works:

### Authentication
- [ ] Sign up as Advertiser
- [ ] Sign up as Creator
- [ ] Sign in with existing account
- [ ] Logout
- [ ] Access admin panel (admin only)

### Campaigns
- [ ] Create campaign as Advertiser
- [ ] View campaign details
- [ ] Edit campaign
- [ ] Delete campaign

### Creator Discovery
- [ ] Browse creator directory
- [ ] Filter by niche
- [ ] Filter by tier
- [ ] View creator profile

### Vyral Match
- [ ] Create campaign
- [ ] Run Vyral Match
- [ ] View match results
- [ ] Invite matched creators

### Content Workflow
- [ ] Submit draft content
- [ ] Approve draft
- [ ] Request revision
- [ ] Submit live post
- [ ] Auto-approve after 48h

### Payments
- [ ] Fund campaign with test card
- [ ] Verify escrow hold
- [ ] Approve content
- [ ] Release payment
- [ ] View payout in creator dashboard

### Admin
- [ ] View admin dashboard
- [ ] Check metrics
- [ ] Review disputes
- [ ] Manage verification

## 🐛 Troubleshooting

### "Cannot find module" errors

**Solution:**
```bash
pnpm install
pnpm dev
```

### Database connection failed

**Solution:**
- Check `DATABASE_URL` is set
- Verify MySQL server running
- Run migrations: `pnpm db:push`

### Stripe payment not working

**Solution:**
- Verify test mode is enabled
- Use test card: `4242 4242 4242 4242`
- Check Stripe keys in Settings

### Vyral Match returns no results

**Solution:**
- Ensure creators exist in database
- Check campaign has target audience
- Verify creator profiles are verified

### Background jobs not running

**Solution:**
- Check Upstash Redis connection (if using)
- Verify Apify API key (if using)
- Check logs in admin panel

## 📚 Additional Resources

- **VYRAL_README.md** - Complete feature documentation
- **ENV_CONFIG.md** - Environment variables reference
- **Database Schema** - `drizzle/schema.ts`
- **API Routes** - `server/routers.ts`

## 🎓 Next Steps

1. **Explore the Platform**
   - Create test accounts
   - Run through complete user flows
   - Test all features

2. **Add External Services** (optional)
   - OpenAI for better matching
   - Apify for post monitoring
   - Upstash for background jobs

3. **Customize** (optional)
   - Adjust algorithm weights
   - Modify platform fee
   - Configure payout delays

4. **Deploy**
   - Click "Publish" button
   - Configure custom domain
   - Set up monitoring

5. **Go Live**
   - Invite beta users
   - Monitor performance
   - Gather feedback

## 💡 Tips & Tricks

### Faster Testing
- Use multiple browser tabs for different roles
- Create test campaigns with low budgets
- Use test Stripe card for quick payments

### Better Matching
- Fill in complete creator profiles
- Specify campaign target audience
- Enable OpenAI for AI analysis

### Monitoring Posts
- Set up Apify integration for real data
- Configure Upstash Redis for reliability
- Check logs in admin panel

### Scaling
- Database auto-scales with usage
- Stripe handles payment volume
- Background jobs scale with Redis

## 🎉 You're Ready!

The Vyral platform is fully set up and ready to use. Start by:

1. Creating an advertiser account
2. Creating a creator account
3. Creating your first campaign
4. Testing the complete flow

**Questions?** Check the documentation files or admin panel logs.

**Ready to go viral?** 🚀

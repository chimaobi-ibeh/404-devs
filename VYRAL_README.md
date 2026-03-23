# Vyral Platform - Creator-Advertiser Marketplace

**Go Viral. Get Paid.** - Connect brands with content creators for authentic sponsored campaigns.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (pre-installed)
- pnpm (pre-installed)
- MySQL database (pre-configured)
- Manus account (for authentication)

### Installation

```bash
cd /home/ubuntu/vyral-platform
pnpm install
pnpm dev
```

The platform will start at `https://localhost:3000` (or the configured dev URL).

## 📋 Features

### 1. Three-Role Authentication System

**Roles:**
- **Advertiser** - Brands creating campaigns and hiring creators
- **Creator** - Content creators applying for campaigns and earning money
- **Admin** - Platform administrators managing disputes and analytics

**Auth Flow:**
- Manus OAuth integration (single sign-on)
- Role-based access control (RBAC)
- Session management with JWT cookies

### 2. Campaign Management

**For Advertisers:**
- Create campaigns with budget, deadline, and content requirements
- Four casting modes:
  - **Hand-Pick** - Manually select specific creators
  - **Open Call** - Accept applications from any creator
  - **Vyral Match** - AI-powered creator discovery
  - **Hybrid** - Combination of above methods
- Manage creator roster and track submissions
- Content approval workflow with revision tracking

**Campaign Details:**
- Title, description, category, content type
- Budget and platform fee (20% by default)
- Required hashtags and brand mentions
- Mood board and reference videos
- Minimum post duration requirements

### 3. Creator Discovery & Directory

**For Creators:**
- Browse available campaigns by niche, budget, and deadline
- Filter campaigns by content type and audience
- Apply to open call campaigns
- Track application status

**Creator Profiles:**
- Display name, niche, platform handles
- Total followers and engagement rate
- Tier system (Nano → Micro → Mid → Macro → Mega)
- Vyral Score (reputation metric)
- Verification status

### 4. Vyral Match AI Algorithm

**Scoring System:**
Combines three factors to find perfect creator-brand matches:

1. **Niche Match** (40% weight)
   - Analyzes creator's niche against campaign requirements
   - Semantic similarity matching

2. **Engagement Rate** (35% weight)
   - Compares creator's engagement against campaign expectations
   - Normalized scoring (0-100)

3. **Tier Score** (25% weight)
   - Matches creator tier with campaign budget
   - Ensures budget-appropriate partnerships

**Optional OpenAI Enhancement:**
- Provide `OPENAI_API_KEY` to enable AI-powered analysis
- Analyzes campaign brief and creator content for deeper insights
- Improves match quality and relevance

**Usage:**
```typescript
// Calculate match score for a creator
const score = await calculateVyralMatchScore(campaign, creator);
console.log(score.totalScore);      // 0-100
console.log(score.matchReason);     // Human-readable explanation
console.log(score.aiEnhancedScore); // With OpenAI (if enabled)
```

### 5. Stripe Escrow Payment System

**Payment Flow:**
1. Advertiser creates campaign with budget
2. Funds held in Stripe escrow (not charged immediately)
3. Creator submits content for approval
4. Advertiser reviews and approves
5. Funds released to creator upon approval
6. Platform keeps 20% fee

**Payout Schedule:**
- **Standard:** 7 days after approval
- **Pro Creators:** 2 days after approval (with $12/mo subscription)

**Test Mode:**
- All payments use Stripe test keys (sk_test_...)
- Use test card: `4242 4242 4242 4242`
- No real charges

### 6. Content Approval Workflow

**Submission Process:**
1. Creator submits draft content (video, images, links)
2. Advertiser reviews draft
3. Advertiser can:
   - **Approve** - Content ready to post
   - **Request Revision** - 1 free revision allowed
   - **Reject** - Creator can reapply

**Auto-Approval:**
- Content auto-approves after 48 hours if no response
- Protects creators from indefinite delays

**Live Post Verification:**
- Creator posts live content to platform
- System verifies:
  - Post is publicly accessible
  - Required hashtags present
  - Brand mentions included
  - Privacy settings correct

### 7. Post Monitoring Background Job System

**Monitoring Tasks:**
- Checks post accessibility (not deleted/private)
- Verifies required hashtags and mentions
- Captures engagement metrics every 48 hours
- Tracks post performance over time

**Job Scheduling Options:**

**Option A: Upstash Redis** (recommended)
```typescript
// Automatic job scheduling with Redis
const job = await scheduleMonitoringJob(postId, {
  interval: 48 * 60 * 60 * 1000, // 48 hours
  maxRetries: 3,
});
```

**Option B: Supabase Edge Functions** (default)
```typescript
// Cron-based job simulation
// Jobs triggered by periodic HTTP calls
```

**Option C: Manual Trigger**
```typescript
// Call monitoring endpoint manually
POST /api/trpc/monitoring.runJob
```

### 8. Apify Actor Integration (Post Monitoring)

**Placeholder Structure Ready:**
The platform includes a production-ready placeholder for Apify integration:

```typescript
// server/monitoring.ts
export async function monitorPostWithApify(
  postUrl: string,
  platform: 'tiktok' | 'instagram' | 'youtube'
) {
  const apifyKey = process.env.APIFY_API_KEY;
  if (!apifyKey) {
    console.warn('Apify API key not configured');
    return null;
  }
  
  // Placeholder - ready for your implementation
  // Call appropriate Apify actor based on platform
  // Return engagement metrics and post status
}
```

**To Enable:**
1. Get Apify API key from https://apify.com
2. Add `APIFY_API_KEY` via Settings → Secrets
3. Configure actor IDs:
   - `APIFY_ACTOR_ID_TIKTOK`
   - `APIFY_ACTOR_ID_INSTAGRAM`
   - `APIFY_ACTOR_ID_YOUTUBE`
4. Implement the monitoring function with actual API calls

### 9. Creator Earnings Dashboard

**Features:**
- Total earnings tracking
- Pending payout status
- Payout history with dates and amounts
- Vyral Score display
- Campaign applications list

**Pro Subscription ($12/month):**
- Early access to campaigns (24 hours before public)
- 2-day payouts instead of 7 days
- Priority support
- Higher visibility in Vyral Match

### 10. Admin Panel

**Dashboard:**
- Total users count
- Active campaigns
- Platform revenue (20% fee)
- Open disputes

**Dispute Resolution:**
- Review creator-advertiser disputes
- Mediate content approval conflicts
- Manage payment disputes
- Track resolution history

**Identity Verification:**
- Review creator verification documents
- Approve/reject verification requests
- Manage advertiser company verification

**Monitoring Logs:**
- View post monitoring job status
- Check Apify integration logs
- Monitor background job performance
- Error tracking and debugging

**Settings:**
- Enable/disable new signups
- Enable/disable campaign creation
- Enable/disable creator applications
- Platform-wide feature toggles

## 🏗️ Architecture

### Frontend (React 19 + Vite)

```
client/src/
├── pages/
│   ├── Home.tsx                 # Landing page
│   ├── AuthPage.tsx             # Login page
│   ├── OnboardingPage.tsx       # Role selection & profile setup
│   ├── BrandDashboard.tsx       # Advertiser dashboard
│   ├── CreatorDashboard.tsx     # Creator dashboard
│   ├── CampaignCreate.tsx       # Create campaign form
│   ├── CampaignDetail.tsx       # Campaign details & roster
│   ├── CreatorDirectory.tsx     # Browse creators
│   ├── VyralMatch.tsx           # Vyral Match results
│   ├── ContentApproval.tsx      # Content review workflow
│   ├── CreatorEarnings.tsx      # Earnings & payouts
│   └── AdminPanel.tsx           # Admin dashboard
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── DashboardLayout.tsx      # Sidebar layout
│   └── ...
└── lib/
    └── trpc.ts                  # tRPC client
```

### Backend (Express + tRPC)

```
server/
├── routers.ts                   # tRPC procedures
├── db.ts                        # Database queries
├── vyralMatch.ts                # Vyral Match algorithm
├── stripe.ts                    # Stripe integration
├── monitoring.ts                # Post monitoring system
├── _core/
│   ├── index.ts                 # Express server setup
│   ├── context.ts               # tRPC context
│   ├── trpc.ts                  # tRPC setup
│   ├── auth.ts                  # OAuth flow
│   ├── env.ts                   # Environment config
│   └── ...
└── storage.ts                   # S3 file storage
```

### Database (MySQL)

```
drizzle/schema.ts
├── users                        # User accounts
├── advertiserProfiles           # Brand profiles
├── creatorProfiles              # Creator profiles
├── campaigns                    # Campaign listings
├── campaignRoster               # Creator assignments
├── contentSubmissions           # Draft & live posts
├── contentApprovals             # Review workflow
├── vyralMatchScores             # Match results
├── creatorSubscriptions         # Pro subscriptions
├── payments                     # Payment records
├── payouts                      # Payout history
├── disputes                     # Dispute tracking
├── postMonitoring               # Monitoring logs
├── verificationDocuments        # ID verification
└── ...                          # 17 tables total
```

## 📊 Database Schema

### Core Tables

**users**
- Authentication and role management
- Roles: advertiser, creator, admin

**advertiserProfiles**
- Brand information and verification
- Company details, website, logo

**creatorProfiles**
- Creator information and metrics
- Followers, engagement rate, tier, Vyral Score

**campaigns**
- Campaign listings and requirements
- Budget, deadline, casting mode, content specs

**campaignRoster**
- Creator assignments to campaigns
- Status tracking: invited, applied, accepted, rejected

**contentSubmissions**
- Draft and live post submissions
- Revision tracking and approval status

**vyralMatchScores**
- AI-generated match scores
- Niche, engagement, tier scores with reasoning

**payments**
- Stripe payment records
- Escrow management and status tracking

**payouts**
- Creator earnings and payout history
- Status: pending, processing, completed

## 🔧 API Routes

All routes are tRPC procedures under `/api/trpc`:

### Advertiser Routes
- `advertiser.createCampaign` - Create new campaign
- `advertiser.getCampaigns` - List advertiser's campaigns
- `advertiser.getCampaign` - Get campaign details
- `advertiser.addCreatorToRoster` - Invite/add creator
- `advertiser.getCampaignRoster` - Get creators for campaign
- `advertiser.approveDraft` - Approve content draft
- `advertiser.requestRevision` - Request content revision
- `advertiser.rejectContent` - Reject submission

### Creator Routes
- `creator.getProfile` - Get creator profile
- `creator.updateProfile` - Update profile info
- `creator.searchCreators` - Search creator directory
- `creator.getAvailableCampaigns` - Browse campaigns
- `creator.applyCampaign` - Apply to campaign
- `creator.submitDraft` - Submit draft content
- `creator.submitLivePost` - Submit live post
- `creator.getEarnings` - Get earnings summary
- `creator.getSubscription` - Check Pro subscription
- `creator.upgradeToPro` - Subscribe to Pro

### Vyral Match Routes
- `vyralMatch.getMatches` - Get AI-matched creators
- `vyralMatch.calculateScore` - Calculate single score
- `vyralMatch.batchCalculate` - Batch score calculation

### Admin Routes
- `admin.getDashboard` - Admin dashboard stats
- `admin.getDisputes` - List open disputes
- `admin.resolveDispute` - Resolve dispute
- `admin.verifyCreator` - Approve creator verification
- `admin.verifyAdvertiser` - Approve advertiser verification

### Monitoring Routes
- `monitoring.runJob` - Trigger monitoring job
- `monitoring.getJobStatus` - Check job status
- `monitoring.getMonitoringLogs` - View monitoring history

## 🔐 Security

### Authentication
- Manus OAuth 2.0
- JWT session cookies
- Secure HTTP-only cookies
- CSRF protection

### Authorization
- Role-based access control (RBAC)
- Procedure-level protection
- User ownership verification

### Payment Security
- Stripe PCI compliance
- Escrow fund protection
- Webhook signature verification
- Idempotent payment processing

### Data Protection
- Environment variable secrets
- No sensitive data in logs
- Encrypted password storage
- HTTPS-only communication

## 📈 Monitoring & Analytics

### Built-in Metrics
- User registration and retention
- Campaign creation and completion
- Creator-brand match success rate
- Payment volume and platform revenue
- Post engagement tracking

### Logging
- Server request logs
- Error tracking
- Background job logs
- Stripe webhook logs

### Admin Dashboard
- Real-time analytics
- Dispute resolution tracking
- Verification queue management
- Platform health status

## 🚀 Deployment

### Pre-deployment Checklist
- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Stripe test mode verified
- [ ] Admin account created
- [ ] Terms of Service and Privacy Policy ready

### Deployment Steps
1. Click "Publish" button in Manus UI
2. Select deployment region
3. Configure custom domain (optional)
4. Enable SSL/TLS
5. Set up monitoring alerts

### Post-deployment
- Test complete user flows
- Verify payment processing
- Monitor background jobs
- Check error logs

## 🛠️ Development

### Running Tests
```bash
pnpm test
```

### Type Checking
```bash
pnpm check
```

### Building for Production
```bash
pnpm build
```

### Database Migrations
```bash
pnpm drizzle-kit generate
pnpm db:push
```

## 📚 Documentation

- **ENV_CONFIG.md** - Environment variables and configuration
- **VYRAL_README.md** - This file
- **Database Schema** - See `drizzle/schema.ts`
- **API Routes** - See `server/routers.ts`

## 🐛 Troubleshooting

### "Module not found" errors
```bash
pnpm install
pnpm dev
```

### Database connection issues
- Check `DATABASE_URL` environment variable
- Verify MySQL server is running
- Run migrations: `pnpm db:push`

### Stripe payment failures
- Verify Stripe keys are correct
- Check test mode is enabled
- Use test card: `4242 4242 4242 4242`

### Vyral Match not working
- Check campaign has target audience
- Verify creators exist in database
- Enable OpenAI for enhanced matching (optional)

### Post monitoring not running
- Check Upstash Redis connection (if using)
- Verify Apify API key (if using)
- Check background job logs in admin panel

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review environment configuration
3. Check server logs in admin panel
4. Contact Manus support

## 📄 License

© 2026 Vyral Platform. All rights reserved.

---

**Ready to go viral?** 🚀

Start by creating an advertiser account, then a creator account, and launch your first campaign!

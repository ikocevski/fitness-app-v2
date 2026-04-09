# 🚀 Implementation Roadmap - Phase 2 Features

## Overview

This document outlines the implementation plan for the next phase of features:

1. In-App Purchase subscription system with tiered coaching plans
2. External video hosting integration
3. Fix meal plan assignment bug
4. App Store deployment preparation

---

## 1. ✅ In-App Purchase System with Subscription Tiers

### Requirements:

- Users select role during signup (Client or Coach)
- Coaches must subscribe to one of 3 tiers:
  - **Starter**: $49/month - Up to 5 clients
  - **Pro**: $99/month - Up to 15 clients
  - **Elite**: $199/month - Unlimited clients
- Clients can sign up for free
- Integration with Apple App Store and Google Play Store billing

### Implementation Steps:

#### Phase 1.1: Update Signup Flow

- [ ] Add role selection screen after initial signup
- [ ] Create subscription selection screen for coaches
- [ ] Update database schema to track subscriptions
- [ ] Add subscription_tier, subscription_status, client_limit columns to users table

#### Phase 1.2: Integrate React Native IAP

- [ ] Install `react-native-iap` package
- [ ] Configure App Store Connect products (3 subscription tiers)
- [ ] Configure Google Play Console products
- [ ] Implement purchase flow
- [ ] Handle subscription validation
- [ ] Implement receipt verification with backend

#### Phase 1.3: Subscription Management

- [ ] Create subscription status checker
- [ ] Implement client limit enforcement
- [ ] Add subscription status to coach dashboard
- [ ] Create subscription management screen
- [ ] Handle subscription expiration
- [ ] Implement grace period logic

#### Phase 1.4: Backend Webhook Setup

- [ ] Set up Supabase Edge Function for App Store Server Notifications
- [ ] Set up webhook for Google Play Billing
- [ ] Implement subscription renewal handling
- [ ] Handle subscription cancellation
- [ ] Implement refund handling

**Estimated Time**: 2-3 weeks  
**Complexity**: High  
**Dependencies**: Requires paid Apple Developer ($99/year) and Google Play Developer ($25 one-time) accounts

---

## 2. 🎥 External Video Hosting Integration

### Requirements:

- Host workout videos externally (not on Supabase Storage)
- Embed videos seamlessly in workout plans
- Optimize for mobile playback
- Cost-effective solution

### Recommended Provider: **Cloudflare Stream**

**Why Cloudflare Stream:**

- $5/month base + $1 per 1,000 minutes stored + $1 per 1,000 minutes delivered
- Automatic encoding and adaptive bitrate streaming
- Built-in player with React Native support
- Global CDN for fast delivery
- Simple API integration

**Alternative Options:**

- Vimeo Pro ($20/month) - Good player, higher cost
- Mux ($20/month minimum) - Developer-friendly, great API
- Bunny Stream ($10/month + usage) - Cost-effective

### Implementation Steps:

#### Phase 2.1: Setup Video Provider

- [ ] Create Cloudflare Stream account
- [ ] Configure API keys in .env.local
- [ ] Set up video upload workflow

#### Phase 2.2: Admin Upload Interface

- [ ] Add video upload to ManageWorkoutsScreen
- [ ] Integrate with Cloudflare Stream API
- [ ] Store video URLs in workout_exercises table
- [ ] Add video thumbnail generation
- [ ] Implement progress indicators for uploads

#### Phase 2.3: Client Video Player

- [ ] Install react-native-video or expo-video
- [ ] Create VideoPlayer component with Cloudflare Stream URLs
- [ ] Add playback controls (play, pause, seek, fullscreen)
- [ ] Implement offline caching (optional)
- [ ] Add loading states

#### Phase 2.4: Video Management

- [ ] Create video library in admin panel
- [ ] Implement video deletion
- [ ] Add video preview before assignment
- [ ] Implement video search/filter

**Estimated Time**: 1-2 weeks  
**Complexity**: Medium  
**Monthly Cost**: ~$15-30/month for moderate usage (100 videos, 1000 views/month)

---

## 3. 🍽️ Fix Meal Plan Assignment Bug

### Current Issue Analysis:

Looking at the code:

- Admin assigns meals via `assigned_to_client_id` in `diet_meals` table ✅
- Client fetches meals using `assigned_to_client_id` filter ✅
- There's also a `diet_plans` table with `user_id` field
- Confusion between individual meal assignment vs plan assignment

### Root Cause:

The system has TWO ways to assign diets:

1. **Direct Meal Assignment**: Assign individual meals to clients
2. **Diet Plan Assignment**: Create complete meal plans and assign to clients

Client DietScreen only fetches directly assigned meals, not meals from assigned plans.

### Fix Required:

#### Phase 3.1: Clarify Data Model

- [ ] Update database schema documentation
- [ ] Decide on primary assignment method (recommend Plan-based)
- [ ] Add migration to consolidate data

#### Phase 3.2: Update Client DietScreen Query

```typescript
// Current: Only fetches directly assigned meals
const { data, error } = await supabase
  .from("diet_meals")
  .select("*")
  .eq("assigned_to_client_id", user?.id);

// Should be: Fetch meals from assigned plans
const { data: plans, error } = await supabase
  .from("diet_plans")
  .select(
    `
    *,
    diet_plan_meals (
      *,
      diet_meal:diet_meals (*)
    )
  `,
  )
  .eq("user_id", user?.id);
```

#### Phase 3.3: Update Admin Assignment Flow

- [ ] Make plan assignment primary method
- [ ] Keep individual meal assignment as "ad-hoc" option
- [ ] Update ManageDietsScreen to show clear distinction
- [ ] Add validation: check client has assigned plan

#### Phase 3.4: Test & Validate

- [ ] Create test plan with multiple meals
- [ ] Assign to test client
- [ ] Verify client sees all meals
- [ ] Test meal swaps functionality
- [ ] Verify macros calculation

**Estimated Time**: 3-5 days  
**Complexity**: Low-Medium  
**This should be done FIRST before other features**

---

## 4. 📱 App Store Deployment & Costs

### App Store Connect (iOS)

**Required:**

- Apple Developer Account: **$99/year**
- Mac computer for building iOS apps
- Xcode (free)

**Steps:**

1. Create App Store Connect app listing
2. Configure app metadata (name, description, screenshots)
3. Set up app privacy policy
4. Configure in-app purchases (subscription products)
5. Submit for review (typically 1-3 days)
6. Ongoing: Annual renewal $99/year

### Google Play Store (Android)

**Required:**

- Google Play Developer Account: **$25 one-time**
- Android Studio (free)

**Steps:**

1. Create Play Console app listing
2. Configure app metadata
3. Set up billing products (subscriptions)
4. Submit for review (typically 1-3 days)
5. Ongoing: No annual fee

### Additional Deployment Costs

#### 1. **EAS Build & Submit (Expo)**

- **Free Tier**: 30 builds/month for iOS + Android
- **Production Tier**: $29/month (unlimited builds, faster queue)
- **Recommended**: Start with free tier

#### 2. **Backend Infrastructure (Supabase)**

- **Current**: Free tier (500MB database, 1GB bandwidth/month)
- **Pro Tier**: $25/month (8GB database, 50GB bandwidth)
- **Team Tier**: $599/month (when you scale)
- **Recommendation**: Upgrade to Pro when you hit 50-100 active users

#### 3. **Video Hosting (Cloudflare Stream)**

- **Base**: $5/month
- **Storage**: $1 per 1,000 minutes stored
- **Delivery**: $1 per 1,000 minutes delivered
- **Estimated**: $15-30/month initially

#### 4. **Domain & Email** (Optional)

- Custom domain: $12/year (e.g., fitness-app.com)
- Professional email: $6/user/month (Google Workspace)

### Total Deployment Costs Summary:

**One-Time Costs:**

- Apple Developer Account: $99
- Google Play Developer Account: $25
- **Total One-Time**: **$124**

**Monthly Recurring (Year 1):**

- Supabase (initially free, then): $0-25/month
- Cloudflare Stream: $15-30/month
- EAS Builds (optional): $0-29/month
- **Total Monthly**: **$15-84/month** ($180-1,008/year)

**Annual Recurring:**

- Apple Developer renewal: $99/year
- **Total Annual**: **$99/year**

**Estimated First Year Total Cost:**

- One-time setup: $124
- Monthly services (avg): $50/month × 12 = $600
- Annual renewals: $99
- **Total Year 1**: **~$823**

**Estimated Year 2+ (Steady State):**

- Monthly: $50-100/month ($600-1,200/year)
- Annual renewals: $99/year
- **Total**: **$699-1,299/year**

---

## Implementation Priority

### 🔴 Phase 1 (Week 1): Critical Bug Fix

1. Fix meal plan assignment bug
2. Test assignment flow end-to-end
3. Document correct usage

### 🟡 Phase 2 (Weeks 2-3): Video Integration

1. Set up Cloudflare Stream account
2. Implement video upload in admin panel
3. Add video player to client workout view
4. Test video playback

### 🟢 Phase 3 (Weeks 4-6): In-App Purchases

1. Update signup flow with role selection
2. Create subscription tiers UI
3. Integrate react-native-iap
4. Test purchase flow (sandbox)
5. Implement subscription validation

### 🔵 Phase 4 (Week 7): App Store Preparation

1. Create App Store Connect listing
2. Create Google Play Console listing
3. Configure metadata and screenshots
4. Set up subscription products
5. Submit for review

**Total Implementation Time**: 7-8 weeks  
**Development Cost Estimate** (if hiring): $10,000-15,000 (at $50-75/hour)

---

## Next Steps

1. **Immediate**: Fix meal plan bug (I can do this now)
2. **Short-term**: Decide on video hosting provider
3. **Medium-term**: Plan subscription tier pricing strategy
4. **Long-term**: Prepare app store assets (screenshots, descriptions)

Should I proceed with fixing the meal plan assignment bug first?

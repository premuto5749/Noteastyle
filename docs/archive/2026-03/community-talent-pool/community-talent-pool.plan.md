# Community Talent Pool Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the existing Explore page into a community feed with likes/bookmarks, add a talent pool search, and build a proposal (offer) system where shops can contact designers with credit-based proposals.

**Architecture:** Extend `/explore` with community interactions (likes, bookmarks), add `/explore/talent` for talent search (designers with `open_to_proposals=true`), add `/proposals` for proposal management. Notifications system with PWA push. All APIs follow existing patterns: `withShopAuth` for shop-scoped, `requireAuth` for user-scoped.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase (PostgreSQL + service_role), Tailwind CSS v4, Web Push API, Zod validation.

---

## Phase A: Community Foundation

### Task 1: Database Migration -- Community Tables

**Files:**
- Create: `supabase/migrations/030_community_talent_pool.sql`

**Step 1: Write the migration SQL**

```sql
-- 030_community_talent_pool.sql
-- Community + Talent Pool + Proposals + Notifications + Push Subscriptions

-- 1. Portfolio Likes
CREATE TABLE portfolio_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(portfolio_id, user_id)
);

CREATE INDEX idx_portfolio_likes_portfolio ON portfolio_likes(portfolio_id);
CREATE INDEX idx_portfolio_likes_user ON portfolio_likes(user_id);

-- 2. Portfolio Bookmarks (shop-scoped)
CREATE TABLE portfolio_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(portfolio_id, shop_id)
);

CREATE INDEX idx_portfolio_bookmarks_shop ON portfolio_bookmarks(shop_id);

-- 3. Talent Proposals
CREATE TABLE talent_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_member_id UUID NOT NULL REFERENCES shop_members(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  position TEXT NOT NULL,
  salary_range TEXT NOT NULL,
  benefits TEXT,
  shop_intro TEXT,
  message TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_talent_proposals_from_shop ON talent_proposals(from_shop_id);
CREATE INDEX idx_talent_proposals_to_member ON talent_proposals(to_member_id);
CREATE INDEX idx_talent_proposals_status ON talent_proposals(status);

CREATE TRIGGER talent_proposals_updated_at
  BEFORE UPDATE ON talent_proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Shop Proposal Credits
CREATE TABLE shop_proposal_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  total_credits INT NOT NULL DEFAULT 0,
  monthly_free INT NOT NULL DEFAULT 5,
  last_monthly_reset DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER shop_proposal_credits_updated_at
  BEFORE UPDATE ON shop_proposal_credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE is_read = false;

-- 6. Push Subscriptions
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- 7. member_profiles additions
ALTER TABLE member_profiles ADD COLUMN open_to_proposals BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE member_profiles ADD COLUMN blocked_shop_ids UUID[] NOT NULL DEFAULT '{}';

-- 8. Proposal credit settings
INSERT INTO app_settings (key, value) VALUES
  ('proposal_initial_credits', '5'),
  ('proposal_monthly_credits', '5')
ON CONFLICT (key) DO NOTHING;
```

**Step 2: Apply migration locally**

Run: `cd C:/Dev/Noteastyle && npx supabase db push`
Expected: Migration applied successfully

**Step 3: Commit**

```bash
git add supabase/migrations/030_community_talent_pool.sql
git commit -m "feat: add community, talent pool, proposals, notifications tables (migration 030)"
```

---

### Task 2: API -- Portfolio Like (toggle)

**Files:**
- Create: `frontend/src/app/api/explore/portfolio/[portfolioId]/like/route.ts`

**Step 1: Write the like toggle API**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ portfolioId: string }> }
) {
  const { portfolioId } = await params;
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const supabase = createServiceClient();

  // Check if already liked
  const { data: existing } = await supabase
    .from("portfolio_likes")
    .select("id")
    .eq("portfolio_id", portfolioId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (existing) {
    // Unlike
    await supabase.from("portfolio_likes").delete().eq("id", existing.id);
    return NextResponse.json({ liked: false });
  }

  // Like
  const { error } = await supabase.from("portfolio_likes").insert({
    portfolio_id: portfolioId,
    user_id: auth.user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ liked: true });
}
```

**Step 2: Write the like count API**

- Create: `frontend/src/app/api/explore/portfolio/[portfolioId]/like-count/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ portfolioId: string }> }
) {
  const { portfolioId } = await params;
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const supabase = createServiceClient();

  const { count } = await supabase
    .from("portfolio_likes")
    .select("*", { count: "exact", head: true })
    .eq("portfolio_id", portfolioId);

  const { data: userLike } = await supabase
    .from("portfolio_likes")
    .select("id")
    .eq("portfolio_id", portfolioId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  return NextResponse.json({
    count: count ?? 0,
    liked: !!userLike,
  });
}
```

**Step 3: Commit**

```bash
git add frontend/src/app/api/explore/portfolio/
git commit -m "feat: add portfolio like toggle and like count APIs"
```

---

### Task 3: API -- Portfolio Bookmarks (shop-scoped)

**Files:**
- Create: `frontend/src/app/api/shops/[shopId]/bookmarks/route.ts`
- Create: `frontend/src/app/api/shops/[shopId]/bookmarks/[bookmarkId]/route.ts`

**Step 1: Write GET + POST bookmarks API**

`frontend/src/app/api/shops/[shopId]/bookmarks/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { withShopAuth } from "@/lib/auth/shop";
import { createServiceClient } from "@/lib/supabase/server";

export const GET = withShopAuth(
  async (req, params, member) => {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("portfolio_bookmarks")
      .select("id, portfolio_id, created_at, portfolio:portfolios(id, title, tags, photo:treatment_photos(*), shop:shops(id, name), member:shop_members(id, display_name, profile:member_profiles(profile_photo_url, is_public)))")
      .eq("shop_id", params.shopId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data ?? []);
  },
  { roles: ["owner", "admin"] }
);

export const POST = withShopAuth(
  async (req, params, member) => {
    const body = await req.json();
    const portfolioId = body.portfolio_id;
    if (!portfolioId) {
      return NextResponse.json({ error: "portfolio_id is required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Check duplicate
    const { data: existing } = await supabase
      .from("portfolio_bookmarks")
      .select("id")
      .eq("portfolio_id", portfolioId)
      .eq("shop_id", params.shopId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "already bookmarked" }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("portfolio_bookmarks")
      .insert({
        portfolio_id: portfolioId,
        shop_id: params.shopId,
        user_id: member.user_id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  },
  { roles: ["owner", "admin"] }
);
```

**Step 2: Write DELETE bookmark API**

`frontend/src/app/api/shops/[shopId]/bookmarks/[bookmarkId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { withShopAuth } from "@/lib/auth/shop";
import { createServiceClient } from "@/lib/supabase/server";

export const DELETE = withShopAuth<{ shopId: string; bookmarkId: string }>(
  async (_req, params, _member) => {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("portfolio_bookmarks")
      .delete()
      .eq("id", params.bookmarkId)
      .eq("shop_id", params.shopId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ status: "deleted" });
  },
  { roles: ["owner", "admin"] }
);
```

**Step 3: Commit**

```bash
git add frontend/src/app/api/shops/\[shopId\]/bookmarks/
git commit -m "feat: add portfolio bookmark CRUD APIs (shop-scoped)"
```

---

### Task 4: API -- Notifications

**Files:**
- Create: `frontend/src/app/api/me/notifications/route.ts`
- Create: `frontend/src/app/api/me/notifications/[notificationId]/read/route.ts`
- Create: `frontend/src/app/api/me/notifications/read-all/route.ts`
- Create: `frontend/src/app/api/me/notifications/unread-count/route.ts`

**Step 1: Write notifications list + unread count APIs**

`frontend/src/app/api/me/notifications/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const skip = parseInt(searchParams.get("skip") || "0");

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .range(skip, skip + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
}
```

`frontend/src/app/api/me/notifications/unread-count/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const supabase = createServiceClient();
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", auth.user.id)
    .eq("is_read", false);

  return NextResponse.json({ count: count ?? 0 });
}
```

**Step 2: Write read + read-all APIs**

`frontend/src/app/api/me/notifications/[notificationId]/read/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function PUT(
  _req: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const { notificationId } = await params;
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", auth.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ status: "read" });
}
```

`frontend/src/app/api/me/notifications/read-all/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function PUT() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", auth.user.id)
    .eq("is_read", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ status: "all_read" });
}
```

**Step 3: Commit**

```bash
git add frontend/src/app/api/me/notifications/
git commit -m "feat: add notification APIs (list, unread count, read, read-all)"
```

---

### Task 5: Client API Types + Functions for Community

**Files:**
- Modify: `frontend/src/lib/api.ts` (append to end, add to createShopApi)

**Step 1: Add types and non-shop-scoped functions**

Append to `frontend/src/lib/api.ts` (after the existing `getDesignerPublicProfile` section, before `createShop`):

```typescript
// --- Community: Likes ---

export function togglePortfolioLike(portfolioId: string) {
  return request<{ liked: boolean }>(`/explore/portfolio/${portfolioId}/like`, {
    method: "POST",
  });
}

export function getPortfolioLikeCount(portfolioId: string) {
  return request<{ count: number; liked: boolean }>(
    `/explore/portfolio/${portfolioId}/like-count`
  );
}

// --- Notifications ---

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export function getNotifications(skip?: number, limit?: number) {
  const p = new URLSearchParams();
  if (skip != null) p.set("skip", String(skip));
  if (limit != null) p.set("limit", String(limit));
  const qs = p.toString();
  return request<Notification[]>(`/me/notifications${qs ? `?${qs}` : ""}`);
}

export function getUnreadNotificationCount() {
  return request<{ count: number }>("/me/notifications/unread-count");
}

export function markNotificationRead(notificationId: string) {
  return request<{ status: string }>(`/me/notifications/${notificationId}/read`, {
    method: "PUT",
  });
}

export function markAllNotificationsRead() {
  return request<{ status: string }>("/me/notifications/read-all", {
    method: "PUT",
  });
}
```

**Step 2: Add bookmark functions to `createShopApi` return object**

Inside `createShopApi()`, add after the existing service methods:

```typescript
    // Bookmarks
    getBookmarks() {
      return request<PortfolioBookmark[]>(`/shops/${shopId}/bookmarks`);
    },
    addBookmark(portfolioId: string) {
      return request<PortfolioBookmark>(`/shops/${shopId}/bookmarks`, {
        method: "POST",
        body: JSON.stringify({ portfolio_id: portfolioId }),
      });
    },
    removeBookmark(bookmarkId: string) {
      return request<{ status: string }>(`/shops/${shopId}/bookmarks/${bookmarkId}`, {
        method: "DELETE",
      });
    },
```

Also add the `PortfolioBookmark` interface near the other interfaces:

```typescript
export interface PortfolioBookmark {
  id: string;
  portfolio_id: string;
  shop_id: string;
  created_at: string;
}
```

**Step 3: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: add client API types and functions for likes, bookmarks, notifications"
```

---

### Task 6: Explore Page -- Like + Bookmark UI

**Files:**
- Modify: `frontend/src/app/explore/page.tsx`
- Modify: `frontend/src/app/api/explore/portfolio/route.ts` (add like counts + user like status to response)

**Step 1: Update explore portfolio API to include like counts**

Modify `frontend/src/app/api/explore/portfolio/route.ts`:
- After fetching portfolios, batch-fetch like counts and user like status
- Add `like_count` and `liked` fields to each item in the response

The API should join `portfolio_likes` to get count per portfolio and whether current user has liked.

**Step 2: Update Explore page**

Modify `frontend/src/app/explore/page.tsx`:
- Add "portfolio" | "talent" tab switcher at the top
- Add heart icon (like button) + count on each card
- Add bookmark icon on each card (visible only for owner/admin -- use ShopContext to check role)
- Add sort dropdown: "latest" | "popular" (by like count)
- Tab "talent" navigates to `/explore/talent`

**Step 3: Commit**

```bash
git add frontend/src/app/explore/page.tsx frontend/src/app/api/explore/portfolio/route.ts
git commit -m "feat: add like/bookmark buttons and tab switcher to explore page"
```

---

### Task 7: Notification Bell in AppHeader

**Files:**
- Modify: `frontend/src/components/AppHeader.tsx`
- Create: `frontend/src/components/NotificationBell.tsx`

**Step 1: Create NotificationBell component**

`frontend/src/components/NotificationBell.tsx`:
- Fetches unread count on mount and every 30 seconds (polling)
- Shows bell icon with red badge if count > 0
- Click navigates to `/proposals` (where notifications are shown inline) or opens a dropdown panel

**Step 2: Add NotificationBell to AppHeader**

Insert `<NotificationBell />` between the logo and hamburger menu in `AppHeader.tsx`.

**Step 3: Commit**

```bash
git add frontend/src/components/NotificationBell.tsx frontend/src/components/AppHeader.tsx
git commit -m "feat: add notification bell with unread count badge to header"
```

---

## Phase B: Talent Pool + Proposals

### Task 8: API -- Talent Settings (proposal reception)

**Files:**
- Create: `frontend/src/app/api/me/talent-settings/route.ts`

**Step 1: Write GET + PUT talent settings API**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const supabase = createServiceClient();

  // Find the user's member_profile via shop_members
  const { data: member } = await supabase
    .from("shop_members")
    .select("id")
    .eq("user_id", auth.user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ open_to_proposals: false, blocked_shop_ids: [] });
  }

  const { data: profile } = await supabase
    .from("member_profiles")
    .select("open_to_proposals, blocked_shop_ids")
    .eq("member_id", member.id)
    .maybeSingle();

  return NextResponse.json({
    open_to_proposals: profile?.open_to_proposals ?? false,
    blocked_shop_ids: profile?.blocked_shop_ids ?? [],
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const supabase = createServiceClient();

  const { data: member } = await supabase
    .from("shop_members")
    .select("id")
    .eq("user_id", auth.user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "멤버를 찾을 수 없습니다." }, { status: 404 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.open_to_proposals === "boolean") {
    update.open_to_proposals = body.open_to_proposals;
  }
  if (Array.isArray(body.blocked_shop_ids)) {
    update.blocked_shop_ids = body.blocked_shop_ids;
  }

  const { error } = await supabase
    .from("member_profiles")
    .update(update)
    .eq("member_id", member.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ status: "updated" });
}
```

**Step 2: Add client API functions**

Append to `frontend/src/lib/api.ts`:

```typescript
// --- Talent Settings ---

export interface TalentSettings {
  open_to_proposals: boolean;
  blocked_shop_ids: string[];
}

export function getTalentSettings() {
  return request<TalentSettings>("/me/talent-settings");
}

export function updateTalentSettings(data: Partial<TalentSettings>) {
  return request<{ status: string }>("/me/talent-settings", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
```

**Step 3: Commit**

```bash
git add frontend/src/app/api/me/talent-settings/ frontend/src/lib/api.ts
git commit -m "feat: add talent settings API (proposal reception toggle, blocked shops)"
```

---

### Task 9: API -- Talent Pool Search

**Files:**
- Create: `frontend/src/app/api/explore/talent/route.ts`

**Step 1: Write the talent pool search API**

Key logic:
- Query `member_profiles` WHERE `open_to_proposals = true` AND `is_public = true`
- Join `shop_members` (must be `is_active = true`)
- Filter: `NOT (blocked_shop_ids @> ARRAY[requesting shop ID])` if requester has a shop
- Filter: `member.shop_id != requester's shop_id` (auto-block own shop members)
- Optional filters: `shop_type`, keyword search (display_name, specialty), career years
- Include portfolio count and profile photo
- Paginated (skip/limit)

**Step 2: Add client function**

```typescript
export interface TalentSearchItem {
  member_id: string;
  display_name: string;
  specialty: string | null;
  profile_photo_url: string | null;
  career_years: number | null;
  portfolio_count: number;
  shop: { id: string; name: string; shop_type: string };
}

export function searchTalentPool(params?: {
  shop_type?: string;
  search?: string;
  shop_id?: string;
  skip?: number;
  limit?: number;
}) {
  const p = new URLSearchParams();
  if (params?.shop_type) p.set("shop_type", params.shop_type);
  if (params?.search) p.set("search", params.search);
  if (params?.shop_id) p.set("shop_id", params.shop_id);
  if (params?.skip != null) p.set("skip", String(params.skip));
  if (params?.limit != null) p.set("limit", String(params.limit));
  const qs = p.toString();
  return request<TalentSearchItem[]>(`/explore/talent${qs ? `?${qs}` : ""}`);
}
```

**Step 3: Commit**

```bash
git add frontend/src/app/api/explore/talent/ frontend/src/lib/api.ts
git commit -m "feat: add talent pool search API with filtering"
```

---

### Task 10: API -- Proposal Credits

**Files:**
- Create: `frontend/src/app/api/shops/[shopId]/proposal-credits/route.ts`
- Create: `frontend/src/lib/services/proposal-credits.ts`

**Step 1: Write credit service helper**

`frontend/src/lib/services/proposal-credits.ts`:

```typescript
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Get or create proposal credits for a shop.
 * Handles monthly reset logic.
 */
export async function getOrCreateCredits(shopId: string) {
  const supabase = createServiceClient();

  // Get settings
  const { data: initialSetting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "proposal_initial_credits")
    .single();
  const { data: monthlySetting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "proposal_monthly_credits")
    .single();

  const initialCredits = parseInt(String(initialSetting?.value ?? "5"));
  const monthlyCredits = parseInt(String(monthlySetting?.value ?? "5"));

  // Get existing credits
  let { data: credits } = await supabase
    .from("shop_proposal_credits")
    .select("*")
    .eq("shop_id", shopId)
    .maybeSingle();

  if (!credits) {
    // First time: create with initial credits
    const { data: newCredits } = await supabase
      .from("shop_proposal_credits")
      .insert({
        shop_id: shopId,
        total_credits: initialCredits,
        monthly_free: monthlyCredits,
        last_monthly_reset: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();
    return newCredits!;
  }

  // Monthly reset check
  const now = new Date();
  const lastReset = new Date(credits.last_monthly_reset);
  if (now.getFullYear() !== lastReset.getFullYear() || now.getMonth() !== lastReset.getMonth()) {
    const { data: updated } = await supabase
      .from("shop_proposal_credits")
      .update({
        total_credits: credits.total_credits + monthlyCredits,
        last_monthly_reset: now.toISOString().slice(0, 10),
      })
      .eq("id", credits.id)
      .select()
      .single();
    return updated!;
  }

  return credits;
}

/**
 * Deduct one credit. Returns false if insufficient.
 */
export async function deductCredit(shopId: string): Promise<boolean> {
  const credits = await getOrCreateCredits(shopId);
  if (credits.total_credits < 1) return false;

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("shop_proposal_credits")
    .update({ total_credits: credits.total_credits - 1 })
    .eq("id", credits.id);

  return !error;
}
```

**Step 2: Write credit check API**

`frontend/src/app/api/shops/[shopId]/proposal-credits/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { withShopAuth } from "@/lib/auth/shop";
import { getOrCreateCredits } from "@/lib/services/proposal-credits";

export const GET = withShopAuth(
  async (_req, params) => {
    const credits = await getOrCreateCredits(params.shopId);
    return NextResponse.json({
      total_credits: credits.total_credits,
      monthly_free: credits.monthly_free,
      last_monthly_reset: credits.last_monthly_reset,
    });
  },
  { roles: ["owner", "admin"] }
);
```

**Step 3: Add client function**

```typescript
// Inside createShopApi:
    getProposalCredits() {
      return request<{ total_credits: number; monthly_free: number; last_monthly_reset: string }>(
        `/shops/${shopId}/proposal-credits`
      );
    },
```

**Step 4: Commit**

```bash
git add frontend/src/lib/services/proposal-credits.ts frontend/src/app/api/shops/\[shopId\]/proposal-credits/ frontend/src/lib/api.ts
git commit -m "feat: add proposal credit system with auto monthly reset"
```

---

### Task 11: API -- Send + List Proposals

**Files:**
- Create: `frontend/src/app/api/shops/[shopId]/proposals/route.ts`
- Create: `frontend/src/lib/validations/proposal.ts`

**Step 1: Write Zod validation schema**

`frontend/src/lib/validations/proposal.ts`:

```typescript
import { z } from "zod";

export const createProposalSchema = z.object({
  to_member_id: z.string().uuid(),
  position: z.string().min(1, "포지션을 입력해주세요.").max(50),
  salary_range: z.string().min(1, "급여 범위를 입력해주세요.").max(100),
  benefits: z.string().max(500).optional(),
  shop_intro: z.string().max(1000).optional(),
  message: z.string().max(1000).optional(),
});
```

**Step 2: Write POST (send) + GET (list sent) proposals API**

`frontend/src/app/api/shops/[shopId]/proposals/route.ts`:

Key logic for POST:
1. Validate body with Zod
2. Check `deductCredit(shopId)` -- return 402 if insufficient
3. Verify target member has `open_to_proposals = true`
4. Verify target member's `blocked_shop_ids` doesn't include this shop
5. Verify target member's `shop_id != shopId` (can't propose to own members)
6. Create `talent_proposals` with `expires_at = now() + 7 days`
7. Create `notifications` for the target member's user_id
8. (Future) Send PWA push

GET: List proposals from this shop, with target member details.

**Step 3: Add client API functions**

```typescript
// Proposal types
export interface TalentProposal {
  id: string;
  from_shop_id: string;
  to_member_id: string;
  status: "pending" | "accepted" | "declined" | "expired";
  position: string;
  salary_range: string;
  benefits: string | null;
  shop_intro: string | null;
  message: string | null;
  expires_at: string;
  responded_at: string | null;
  created_at: string;
  // Joined data
  from_shop?: { id: string; name: string; shop_type: string; address?: string };
  to_member?: { id: string; display_name: string; specialty: string | null; profile_photo_url?: string | null };
}

// Inside createShopApi:
    sendProposal(data: {
      to_member_id: string;
      position: string;
      salary_range: string;
      benefits?: string;
      shop_intro?: string;
      message?: string;
    }) {
      return request<TalentProposal>(`/shops/${shopId}/proposals`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    getSentProposals() {
      return request<TalentProposal[]>(`/shops/${shopId}/proposals`);
    },
```

**Step 4: Commit**

```bash
git add frontend/src/lib/validations/proposal.ts frontend/src/app/api/shops/\[shopId\]/proposals/ frontend/src/lib/api.ts
git commit -m "feat: add send proposal API with credit deduction and validation"
```

---

### Task 12: API -- Receive + Respond to Proposals

**Files:**
- Create: `frontend/src/app/api/me/proposals/route.ts`
- Create: `frontend/src/app/api/me/proposals/[proposalId]/respond/route.ts`

**Step 1: Write received proposals list API**

GET `/api/me/proposals`: List proposals where `to_member_id` is the current user's member ID. Join shop info for the `from_shop_id`. Expire-check on read (if `expires_at < now()` and status is `pending`, update to `expired`).

**Step 2: Write respond API**

PUT `/api/me/proposals/[proposalId]/respond`:
- Body: `{ action: "accept" | "decline" }`
- Verify proposal belongs to current user's member
- Verify proposal status is "pending" and not expired
- Update status + responded_at
- Create notification for from_shop's owner/admin users
- If accepted: include designer's contact info in notification

**Step 3: Add client functions**

```typescript
export function getReceivedProposals() {
  return request<TalentProposal[]>("/me/proposals");
}

export function respondToProposal(proposalId: string, action: "accept" | "decline") {
  return request<TalentProposal>(`/me/proposals/${proposalId}/respond`, {
    method: "PUT",
    body: JSON.stringify({ action }),
  });
}
```

**Step 4: Commit**

```bash
git add frontend/src/app/api/me/proposals/ frontend/src/lib/api.ts
git commit -m "feat: add received proposals list and respond (accept/decline) API"
```

---

### Task 13: Talent Pool Search Page

**Files:**
- Create: `frontend/src/app/explore/talent/page.tsx`

**Step 1: Build the talent search page**

- Filter bar: shop_type chips (same as explore), keyword search
- Grid of talent cards (2-column, same card style as explore)
- Each card: profile photo, display_name, specialty, career years, portfolio count
- Click card -> navigate to `/explore/designer/[memberId]`
- Pass current shop_id to API for auto-block filtering

**Step 2: Commit**

```bash
git add frontend/src/app/explore/talent/
git commit -m "feat: add talent pool search page with filters"
```

---

### Task 14: Proposal Send Modal + Designer Profile Update

**Files:**
- Create: `frontend/src/components/ProposalModal.tsx`
- Modify: `frontend/src/app/explore/designer/[memberId]/page.tsx`

**Step 1: Create ProposalModal component**

Template-based form:
- Required: position (dropdown: Designer/Head Designer/Staff/etc.), salary_range (text input)
- Optional: benefits, shop_intro, message (textareas)
- Shows remaining credits
- Submit calls `api.sendProposal()`
- Success: close modal, show toast
- Insufficient credits: show "문의하기" modal with contact link

**Step 2: Update designer profile page**

- Add "제안 보내기" button (visible when: viewer is owner/admin AND designer has open_to_proposals=true)
- Add "제안 수신 중" badge near designer name
- Button click opens ProposalModal

**Step 3: Commit**

```bash
git add frontend/src/components/ProposalModal.tsx frontend/src/app/explore/designer/\[memberId\]/
git commit -m "feat: add proposal send modal and update designer profile with proposal button"
```

---

### Task 15: Proposals Management Page

**Files:**
- Create: `frontend/src/app/proposals/page.tsx`

**Step 1: Build proposals page with role-based view**

The page auto-detects user role:
- **owner/admin**: Shows "Sent Proposals" tab (from `api.getSentProposals()`) + remaining credits
- **designer/assistant**: Shows "Received Proposals" tab (from `getReceivedProposals()`)
- Users with both roles (e.g., owner who is also a designer) see both tabs

Each proposal card shows:
- Sent view: designer name, specialty, status badge (pending/accepted/declined/expired), time remaining
- Received view: shop name, position, salary range, expand for full details, accept/decline buttons, time remaining

**Step 2: Commit**

```bash
git add frontend/src/app/proposals/
git commit -m "feat: add proposals management page (sent/received views)"
```

---

### Task 16: Profile Page -- Talent Settings

**Files:**
- Modify: `frontend/src/app/profile/page.tsx`

**Step 1: Add talent settings section**

Add a new section after existing profile fields:
- "제안 수신 설정" section header
- Toggle: "제안 받기" (open_to_proposals)
- Info text: "현재 소속 매장에서는 자동으로 차단됩니다"
- Blocked shops list with remove button (display shop names)
- Calls `updateTalentSettings()` on change

**Step 2: Commit**

```bash
git add frontend/src/app/profile/page.tsx
git commit -m "feat: add talent settings (proposal reception toggle) to profile page"
```

---

### Task 17: PWA Push Notifications

**Files:**
- Create: `frontend/src/lib/services/push-notification.ts` (server-side push sender)
- Create: `frontend/src/app/api/me/push-subscription/route.ts`
- Create: `frontend/public/sw-push.js` (service worker for push)
- Modify: `frontend/src/app/layout.tsx` (register push SW on load)

**Step 1: Write push subscription API**

POST `/api/me/push-subscription`: Save subscription to `push_subscriptions` table.
DELETE `/api/me/push-subscription`: Remove subscription.

**Step 2: Write server-side push sender**

Uses `web-push` npm package. Called from proposal creation and response APIs.

**Step 3: Create minimal service worker**

`frontend/public/sw-push.js`: Listens for `push` events, shows notification.

**Step 4: Register SW in layout**

Add push permission request logic in a client component loaded from layout.

**Step 5: Commit**

```bash
git add frontend/src/lib/services/push-notification.ts frontend/src/app/api/me/push-subscription/ frontend/public/sw-push.js frontend/src/app/layout.tsx
git commit -m "feat: add PWA push notification system"
```

---

## Phase C: Admin + Finalization

### Task 18: Admin APIs -- Credit Policy + Manual Grant

**Files:**
- Create: `frontend/src/app/api/admin/proposal-settings/route.ts`
- Create: `frontend/src/app/api/admin/shops/[shopId]/credits/route.ts`

**Step 1: Write admin proposal settings API**

PUT `/api/admin/proposal-settings`: Update `app_settings` for `proposal_initial_credits` and `proposal_monthly_credits`. Uses `requireAdmin()`.

**Step 2: Write admin manual credit grant API**

POST `/api/admin/shops/[shopId]/credits`: Body `{ amount: number }`. Adds credits to shop. Uses `requireAdmin()`.

**Step 3: Commit**

```bash
git add frontend/src/app/api/admin/proposal-settings/ frontend/src/app/api/admin/shops/
git commit -m "feat: add admin APIs for proposal credit policy and manual grant"
```

---

### Task 19: Cron -- Expire Proposals

**Files:**
- Create: `frontend/src/app/api/cron/expire-proposals/route.ts`

**Step 1: Write the cron endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Find expired pending proposals
  const { data: expired } = await supabase
    .from("talent_proposals")
    .select("id, from_shop_id, to_member_id")
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString());

  if (!expired?.length) {
    return NextResponse.json({ expired: 0 });
  }

  // Update status
  const ids = expired.map((p) => p.id);
  await supabase
    .from("talent_proposals")
    .update({ status: "expired" })
    .in("id", ids);

  // Create notifications for both parties (batch insert)
  // ... (create notifications for each expired proposal)

  return NextResponse.json({ expired: ids.length });
}
```

**Step 2: Commit**

```bash
git add frontend/src/app/api/cron/expire-proposals/
git commit -m "feat: add cron endpoint for expiring pending proposals"
```

---

### Task 20: Documentation Update

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/PRD.md`
- Modify: `docs/schema.md`

**Step 1: Update CLAUDE.md**

Add to section 5 (project structure):
- New API routes under `/api/explore/`, `/api/me/`, `/api/shops/{id}/`
- New pages: `/explore/talent`, `/proposals`
- New components: `NotificationBell`, `ProposalModal`
- New lib: `services/proposal-credits.ts`, `services/push-notification.ts`, `validations/proposal.ts`

Add to section 7 (API endpoints):
- All 16 new endpoints documented

Add to section 9 (business rules):
- Flywheel business model explanation
- Credit system rules
- Proposal lifecycle
- Talent pool filtering logic

Update section 13 (feature status):
- Move "community + talent pool" to Phase 2 complete

Add to section 14 (pricing):
- Proposal credit model details

**Step 2: Update PRD.md**

- Update Phase 2/3 feature list
- Add community + talent pool to completed features
- Document the flywheel business model

**Step 3: Update schema.md**

- Add 6 new tables
- Update ER diagram
- Document new columns on member_profiles

**Step 4: Commit**

```bash
git add CLAUDE.md docs/PRD.md docs/schema.md
git commit -m "docs: update CLAUDE.md, PRD, schema with community talent pool feature"
```

---

## Summary

| Phase | Tasks | New Files | Description |
|-------|-------|-----------|-------------|
| A | 1-7 | ~12 | DB migration, like/bookmark/notification APIs, explore UI, notification bell |
| B | 8-17 | ~12 | Talent settings, search, credits, proposals, PWA push |
| C | 18-20 | ~4 | Admin APIs, cron, documentation |
| **Total** | **20** | **~28** | |

Dependencies: Task 1 (migration) must be first. Within each phase, tasks are mostly sequential. Phase B depends on Phase A completion. Phase C can partially overlap with Phase B.

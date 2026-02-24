import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type ShopRole = "owner" | "admin" | "designer" | "assistant";

export interface ShopMember {
  id: string;
  user_id: string;
  shop_id: string;
  role: ShopRole;
  display_name: string;
  specialty: string | null;
  phone: string | null;
  is_active: boolean;
  joined_at: string;
}

interface AuthSuccess {
  member: ShopMember;
  userId: string;
}

interface AuthError {
  error: Response;
}

/**
 * Verify current user is an active member of the shop.
 */
export async function requireShopMember(
  shopId: string
): Promise<AuthSuccess | AuthError> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      ),
    };
  }

  const serviceClient = createServiceClient();
  const { data: member } = await serviceClient
    .from("shop_members")
    .select("*")
    .eq("user_id", user.id)
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .single();

  if (!member) {
    return {
      error: NextResponse.json(
        { error: "매장 접근 권한이 없습니다." },
        { status: 403 }
      ),
    };
  }

  return { member: member as ShopMember, userId: user.id };
}

/**
 * Verify current user has one of the allowed roles in the shop.
 */
export async function requireShopRole(
  shopId: string,
  allowedRoles: ShopRole[]
): Promise<AuthSuccess | AuthError> {
  const result = await requireShopMember(shopId);
  if ("error" in result) return result;

  if (!allowedRoles.includes(result.member.role)) {
    return {
      error: NextResponse.json(
        { error: "권한이 부족합니다." },
        { status: 403 }
      ),
    };
  }

  return result;
}

/**
 * Get all shops the current user belongs to.
 */
export async function getCurrentUserShops() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { shops: [], userId: null };

  const serviceClient = createServiceClient();
  const { data: memberships } = await serviceClient
    .from("shop_members")
    .select("*, shop:shops(id, name, shop_type)")
    .eq("user_id", user.id)
    .eq("is_active", true);

  return { shops: memberships || [], userId: user.id };
}

// ---------- withShopAuth wrapper ----------

type RouteParams = Record<string, string>;

/**
 * Wrapper for shop API routes that enforces membership authentication.
 * The handler receives the validated ShopMember, eliminating the need
 * for individual requireShopMember() calls.
 */
export function withShopAuth<P extends RouteParams = { shopId: string }>(
  handler: (
    req: NextRequest,
    params: P,
    member: ShopMember
  ) => Promise<Response>,
  options?: { roles?: ShopRole[] }
) {
  return async (
    req: NextRequest,
    { params }: { params: Promise<P> }
  ) => {
    const resolvedParams = await params;
    const shopId = (resolvedParams as Record<string, string>).shopId;

    if (!shopId) {
      return NextResponse.json(
        { error: "shopId is required" },
        { status: 400 }
      );
    }

    const result = options?.roles
      ? await requireShopRole(shopId, options.roles)
      : await requireShopMember(shopId);

    if ("error" in result) return result.error;

    try {
      return await handler(req, resolvedParams, result.member);
    } catch (err) {
      const message =
        err instanceof SyntaxError
          ? "잘못된 요청 형식입니다."
          : "서버 오류가 발생했습니다.";
      const status = err instanceof SyntaxError ? 400 : 500;
      console.error(`[withShopAuth] ${req.method} ${req.nextUrl.pathname}:`, err);
      return NextResponse.json({ error: message }, { status });
    }
  };
}

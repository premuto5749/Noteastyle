import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 환경변수 기반 관리자 확인 (즉시 판별, DB 불필요)
 * ADMIN_USER_IDS에 쉼표 구분으로 등록된 UUID 확인
 */
export function isAdminByEnvId(userId: string): boolean {
  const adminIds = process.env.ADMIN_USER_IDS || "";
  return adminIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(userId);
}

/**
 * 환경변수 기반 관리자 확인 (이메일)
 * ADMIN_EMAILS에 쉼표 구분으로 등록된 이메일 확인
 */
export function isAdminByEnvEmail(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS || "";
  return adminEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

/**
 * DB 기반 관리자 확인 (user_roles 테이블)
 */
export async function isAdminByDb(userId: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "super_admin"])
    .single();

  return !!data;
}

/**
 * 관리자 확인 (환경변수 ID → 환경변수 이메일 → DB 순서)
 */
export async function isAdmin(userId: string, email?: string): Promise<boolean> {
  if (isAdminByEnvId(userId)) return true;
  if (email && isAdminByEnvEmail(email)) return true;
  return isAdminByDb(userId);
}

/**
 * 현재 로그인된 사용자의 관리자 여부 확인
 */
export async function checkCurrentUserIsAdmin(): Promise<{
  isAdmin: boolean;
  userId: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { isAdmin: false, userId: null };

  const adminStatus = await isAdmin(user.id, user.email ?? undefined);
  return { isAdmin: adminStatus, userId: user.id };
}

/**
 * API 라우트 가드: 관리자 권한 필수
 * 관리자가 아니면 403 에러 Response 반환
 */
export async function requireAdmin(): Promise<{
  authorized: boolean;
  userId: string | null;
  error?: Response;
}> {
  const { isAdmin: adminStatus, userId } = await checkCurrentUserIsAdmin();

  if (!adminStatus) {
    return {
      authorized: false,
      userId,
      error: new Response(
        JSON.stringify({ error: "관리자 권한이 필요합니다." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  return { authorized: true, userId };
}

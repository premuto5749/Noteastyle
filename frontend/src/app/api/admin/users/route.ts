import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { isAdminByEnv } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const { authorized, error } = await requireAdmin();
  if (!authorized) return error;

  const supabase = createServiceClient();

  // Supabase Auth에서 전체 사용자 목록 조회
  const {
    data: { users },
    error: authError,
  } = await supabase.auth.admin.listUsers();

  if (authError) {
    return NextResponse.json(
      { error: "사용자 목록 조회 실패" },
      { status: 500 }
    );
  }

  // user_roles 테이블에서 역할 정보 조회
  const { data: roles } = await supabase.from("user_roles").select("*");
  const roleMap = new Map(
    (roles || []).map((r: { user_id: string; role: string }) => [r.user_id, r.role])
  );

  const userList = (users || []).map((u) => {
    const dbRole = roleMap.get(u.id);
    const envAdmin = isAdminByEnv(u.id);

    let roleType: string | null = null;
    if (dbRole === "super_admin") roleType = "super_admin";
    else if (envAdmin) roleType = "env_admin";
    else if (dbRole === "admin") roleType = "admin";

    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      role: roleType,
    };
  });

  // 관리자 우선 정렬, 그 다음 최근 가입순
  userList.sort((a, b) => {
    const roleOrder = (r: string | null) => {
      if (r === "super_admin") return 0;
      if (r === "env_admin") return 1;
      if (r === "admin") return 2;
      return 3;
    };
    const diff = roleOrder(a.role) - roleOrder(b.role);
    if (diff !== 0) return diff;
    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });

  return NextResponse.json({ users: userList });
}

export async function POST(request: Request) {
  const { authorized, userId: currentUserId, error } = await requireAdmin();
  if (!authorized) return error;

  const body = await request.json();
  const { user_id, action } = body as {
    user_id: string;
    action: "grant" | "revoke";
  };

  if (!user_id || !action) {
    return NextResponse.json(
      { error: "user_id와 action이 필요합니다." },
      { status: 400 }
    );
  }

  // 자기 자신의 권한은 변경 불가
  if (user_id === currentUserId) {
    return NextResponse.json(
      { error: "자신의 관리자 권한은 변경할 수 없습니다." },
      { status: 400 }
    );
  }

  // 환경변수 관리자는 해제 불가
  if (action === "revoke" && isAdminByEnv(user_id)) {
    return NextResponse.json(
      { error: "환경변수로 지정된 관리자는 해제할 수 없습니다." },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  if (action === "grant") {
    const { error: upsertError } = await supabase.from("user_roles").upsert(
      {
        user_id,
        role: "admin",
        granted_by: currentUserId,
        granted_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (upsertError) {
      return NextResponse.json(
        { error: "관리자 권한 부여 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "관리자 권한이 부여되었습니다." });
  }

  if (action === "revoke") {
    const { error: deleteError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", user_id);

    if (deleteError) {
      return NextResponse.json(
        { error: "관리자 권한 해제 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "관리자 권한이 해제되었습니다." });
  }

  return NextResponse.json({ error: "유효하지 않은 action" }, { status: 400 });
}

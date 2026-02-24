import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";

const BUCKET = "site-assets";

const ASSET_CONFIG: Record<
  string,
  { folder: string; maxSize: number; accept: string[] }
> = {
  favicon: {
    folder: "favicon",
    maxSize: 512 * 1024, // 512KB
    accept: ["image/x-icon", "image/png", "image/svg+xml"],
  },
  logo: {
    folder: "logo",
    maxSize: 2 * 1024 * 1024, // 2MB
    accept: ["image/png", "image/jpeg", "image/svg+xml", "image/webp"],
  },
  headerLogo: {
    folder: "header-logo",
    maxSize: 2 * 1024 * 1024,
    accept: ["image/png", "image/jpeg", "image/svg+xml", "image/webp"],
  },
  loginBg: {
    folder: "login-bg",
    maxSize: 5 * 1024 * 1024, // 5MB
    accept: ["image/png", "image/jpeg", "image/webp"],
  },
  ogImage: {
    folder: "og-image",
    maxSize: 5 * 1024 * 1024,
    accept: ["image/png", "image/jpeg", "image/webp"],
  },
  shareLogo: {
    folder: "share-logo",
    maxSize: 2 * 1024 * 1024,
    accept: ["image/png", "image/jpeg", "image/svg+xml", "image/webp"],
  },
};

/**
 * Admin API: 사이트 에셋 업로드
 */
export async function POST(request: Request) {
  const { authorized, error } = await requireAdmin();
  if (!authorized) return error;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const assetType = formData.get("assetType") as string | null;

  if (!file || !assetType) {
    return NextResponse.json(
      { error: "file과 assetType이 필요합니다." },
      { status: 400 }
    );
  }

  const config = ASSET_CONFIG[assetType];
  if (!config) {
    return NextResponse.json(
      { error: `유효하지 않은 에셋 타입: ${assetType}` },
      { status: 400 }
    );
  }

  if (file.size > config.maxSize) {
    const maxMB = Math.round(config.maxSize / (1024 * 1024));
    return NextResponse.json(
      { error: `파일 크기는 ${maxMB}MB 이하여야 합니다.` },
      { status: 400 }
    );
  }

  if (!config.accept.includes(file.type)) {
    return NextResponse.json(
      { error: `허용되지 않는 파일 형식입니다. (허용: ${config.accept.join(", ")})` },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop() || "png";
  const fileName = `${config.folder}/${assetType}_${Date.now()}.${ext}`;

  const supabase = createServiceClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  // 기존 에셋 삭제 (같은 폴더의 이전 파일들)
  const { data: existingFiles } = await supabase.storage
    .from(BUCKET)
    .list(config.folder);

  if (existingFiles && existingFiles.length > 0) {
    const toRemove = existingFiles.map((f) => `${config.folder}/${f.name}`);
    await supabase.storage.from(BUCKET).remove(toRemove);
  }

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "파일 업로드에 실패했습니다." },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(fileName);

  return NextResponse.json({ success: true, url: publicUrl });
}

/**
 * Admin API: 사이트 에셋 삭제
 */
export async function DELETE(request: Request) {
  const { authorized, error } = await requireAdmin();
  if (!authorized) return error;

  let body: { assetType: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "유효하지 않은 JSON입니다." },
      { status: 400 }
    );
  }

  const config = ASSET_CONFIG[body.assetType];
  if (!config) {
    return NextResponse.json(
      { error: `유효하지 않은 에셋 타입: ${body.assetType}` },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data: existingFiles } = await supabase.storage
    .from(BUCKET)
    .list(config.folder);

  if (existingFiles && existingFiles.length > 0) {
    const toRemove = existingFiles.map((f) => `${config.folder}/${f.name}`);
    await supabase.storage.from(BUCKET).remove(toRemove);
  }

  return NextResponse.json({ success: true });
}

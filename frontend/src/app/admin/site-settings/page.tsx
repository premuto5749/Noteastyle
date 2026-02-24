"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import type { SiteSettings } from "@/lib/site-settings";
import { DEFAULT_SETTINGS } from "@/lib/site-settings";

type AssetType =
  | "favicon"
  | "logo"
  | "headerLogo"
  | "loginBg"
  | "ogImage"
  | "shareLogo";

const ASSET_FIELDS: {
  type: AssetType;
  settingsKey: keyof SiteSettings;
  label: string;
  desc: string;
  accept: string;
}[] = [
  {
    type: "favicon",
    settingsKey: "faviconUrl",
    label: "파비콘",
    desc: "브라우저 탭 아이콘 (32x32, ICO/PNG)",
    accept: ".ico,.png,.svg",
  },
  {
    type: "logo",
    settingsKey: "logoUrl",
    label: "로그인 로고",
    desc: "로그인 페이지 정방형 로고 (200x200)",
    accept: ".png,.jpg,.jpeg,.svg,.webp",
  },
  {
    type: "headerLogo",
    settingsKey: "headerLogoUrl",
    label: "헤더 로고",
    desc: "네비게이션 헤더 가로형 로고 (높이 40px)",
    accept: ".png,.jpg,.jpeg,.svg,.webp",
  },
  {
    type: "loginBg",
    settingsKey: "loginBgImageUrl",
    label: "로그인 배경",
    desc: "로그인 페이지 배경 이미지 (800x1200+)",
    accept: ".png,.jpg,.jpeg,.webp",
  },
  {
    type: "ogImage",
    settingsKey: "ogImageUrl",
    label: "OG 이미지",
    desc: "SNS 공유 미리보기 (1200x630)",
    accept: ".png,.jpg,.jpeg,.webp",
  },
  {
    type: "shareLogo",
    settingsKey: "shareLogoUrl",
    label: "공유 워터마크",
    desc: "포트폴리오 공유 시 워터마크 로고",
    accept: ".png,.jpg,.jpeg,.svg,.webp",
  },
];

function ColorInput({
  label,
  value,
  onChange,
  defaultValue,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  defaultValue: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value || defaultValue}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 h-10 rounded-lg border border-border cursor-pointer"
      />
      <div className="flex-1">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={defaultValue}
          className="mt-1 w-full px-3 py-1.5 text-sm bg-surface border border-border rounded-lg text-foreground"
        />
      </div>
    </div>
  );
}

function ImageUploadField({
  type,
  settingsKey,
  label,
  desc,
  accept,
  currentUrl,
  onUploaded,
  onDeleted,
}: {
  type: AssetType;
  settingsKey: string;
  label: string;
  desc: string;
  accept: string;
  currentUrl: string;
  onUploaded: (key: string, url: string) => void;
  onDeleted: (key: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("assetType", type);

      const res = await fetch("/api/admin/site-assets", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        onUploaded(settingsKey, data.url);
      } else {
        alert(data.error || "업로드 실패");
      }
    } catch {
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!confirm(`${label}을(를) 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch("/api/admin/site-assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetType: type }),
      });

      if (res.ok) {
        onDeleted(settingsKey);
      }
    } catch {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="p-3 bg-surface border border-border rounded-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground">{label}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 text-xs font-medium bg-accent text-accent-foreground rounded-lg disabled:opacity-50"
          >
            {uploading ? "..." : "업로드"}
          </button>
          {currentUrl && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-1.5 text-xs font-medium bg-destructive/10 text-destructive rounded-lg"
            >
              삭제
            </button>
          )}
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        onChange={handleUpload}
        className="hidden"
      />
      {currentUrl && (
        <div className="mt-2 p-2 bg-background rounded-lg border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentUrl}
            alt={label}
            className="max-h-20 object-contain rounded"
          />
          <div className="text-xs text-muted-foreground mt-1 truncate">
            {currentUrl}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminSiteSettingsPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [keywordInput, setKeywordInput] = useState("");

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/");
    }
  }, [authLoading, isAdmin, router]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/site-settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch {
      // 기본값 유지
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
    }
  }, [isAdmin, fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "설정이 저장되었습니다." });
        if (data.settings) setSettings(data.settings);
      } else {
        setMessage({
          type: "error",
          text: data.error || "저장에 실패했습니다.",
        });
      }
    } catch {
      setMessage({ type: "error", text: "네트워크 오류가 발생했습니다." });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm("모든 설정을 기본값으로 초기화하시겠습니까?")) return;
    setSettings(DEFAULT_SETTINGS);
    setMessage({ type: "success", text: "기본값으로 초기화되었습니다. 저장 버튼을 눌러 적용하세요." });
  };

  const updateField = (key: keyof SiteSettings, value: string | string[]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleAssetUploaded = (key: string, url: string) => {
    setSettings((prev) => ({ ...prev, [key]: url }));
  };

  const handleAssetDeleted = (key: string) => {
    setSettings((prev) => ({ ...prev, [key]: "" }));
  };

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !settings.keywords.includes(kw)) {
      updateField("keywords", [...settings.keywords, kw]);
      setKeywordInput("");
    }
  };

  const removeKeyword = (kw: string) => {
    updateField(
      "keywords",
      settings.keywords.filter((k) => k !== kw)
    );
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-subtle text-sm">확인 중...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-[480px] mx-auto">
        <PageHeader title="사이트 설정" action={<Link href="/admin" className="text-sm text-accent">&larr; 관리자</Link>} />
        <div className="px-4 py-8 text-center text-subtle text-sm">
          불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[480px] mx-auto">
      <PageHeader title="사이트 설정" action={<Link href="/admin" className="text-sm text-accent">&larr; 관리자</Link>} />

      <div className="px-4 pb-24 space-y-6">
        {/* 상태 메시지 */}
        {message && (
          <div
            className={`p-3 rounded-xl text-sm border ${
              message.type === "success"
                ? "bg-success-bg border-success/30 text-success-foreground"
                : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* ===== 기본 정보 ===== */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            기본 정보
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                사이트 이름
              </label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => updateField("siteName", e.target.value)}
                placeholder="Note-a-Style"
                className="mt-1 w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm text-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                사이트 설명
              </label>
              <textarea
                value={settings.siteDescription}
                onChange={(e) =>
                  updateField("siteDescription", e.target.value)
                }
                placeholder="뷰티샵 시술 기록 & 포트폴리오 플랫폼"
                rows={2}
                className="mt-1 w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm text-foreground resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                언어 코드
              </label>
              <select
                value={settings.language}
                onChange={(e) => updateField("language", e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm text-foreground"
              >
                <option value="ko">한국어 (ko)</option>
                <option value="en">English (en)</option>
                <option value="ja">日本語 (ja)</option>
                <option value="zh">中文 (zh)</option>
              </select>
            </div>
          </div>
        </section>

        {/* ===== 이미지 설정 ===== */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            이미지 설정
          </h3>
          <div className="space-y-3">
            {ASSET_FIELDS.map((field) => (
              <ImageUploadField
                key={field.type}
                type={field.type}
                settingsKey={field.settingsKey as string}
                label={field.label}
                desc={field.desc}
                accept={field.accept}
                currentUrl={settings[field.settingsKey] as string}
                onUploaded={handleAssetUploaded}
                onDeleted={handleAssetDeleted}
              />
            ))}
          </div>
        </section>

        {/* ===== SEO ===== */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            SEO 키워드
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addKeyword();
                }
              }}
              placeholder="키워드 입력 후 Enter"
              className="flex-1 px-3 py-2 bg-surface border border-border rounded-xl text-sm text-foreground"
            />
            <button
              type="button"
              onClick={addKeyword}
              className="px-4 py-2 bg-accent text-accent-foreground text-sm font-medium rounded-xl"
            >
              추가
            </button>
          </div>
          {settings.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {settings.keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted rounded-lg text-xs text-foreground"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => removeKeyword(kw)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* ===== 테마 ===== */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            테마 색상
          </h3>
          <div className="space-y-4">
            <ColorInput
              label="강조색 (Accent)"
              value={settings.accentColor}
              onChange={(v) => updateField("accentColor", v)}
              defaultValue={DEFAULT_SETTINGS.accentColor}
            />
            <ColorInput
              label="테마 색상 (모바일 주소창)"
              value={settings.themeColor}
              onChange={(v) => updateField("themeColor", v)}
              defaultValue={DEFAULT_SETTINGS.themeColor}
            />
            <ColorInput
              label="기본 색상 (Primary)"
              value={settings.primaryColor}
              onChange={(v) => updateField("primaryColor", v)}
              defaultValue={DEFAULT_SETTINGS.primaryColor}
            />

            {/* 실시간 미리보기 */}
            <div className="p-4 bg-surface border border-border rounded-xl">
              <div className="text-xs text-muted-foreground mb-2">
                미리보기
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  className="w-full py-2 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: settings.accentColor }}
                >
                  강조색 버튼
                </button>
                <div
                  className="text-sm font-medium"
                  style={{ color: settings.primaryColor }}
                >
                  기본 텍스트 미리보기
                </div>
                <div
                  className="h-2 rounded-full"
                  style={{ backgroundColor: settings.themeColor }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ===== 저장/초기화 ===== */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 py-3 bg-muted text-foreground text-sm font-medium rounded-xl"
          >
            기본값 초기화
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-accent text-accent-foreground text-sm font-medium rounded-xl disabled:opacity-50"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useShop } from "@/contexts/ShopContext";
import { useShopApi } from "@/hooks/useShopApi";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import type { MemberProfile, CareerEntry, CertificationEntry, SnsLinks } from "@/lib/api";

export default function ProfilePage() {
  const { currentShop } = useShop();
  const { api, isReady } = useShopApi();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [careerHistory, setCareerHistory] = useState<CareerEntry[]>([]);
  const [certifications, setCertifications] = useState<CertificationEntry[]>([]);
  const [snsLinks, setSnsLinks] = useState<SnsLinks>({});
  const [showContact, setShowContact] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  const memberId = currentShop?.member_id;

  const loadProfile = useCallback(async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      const data: MemberProfile = await api.getMemberProfile(memberId);
      setPhotoUrl(data.profile_photo_url);
      setDisplayName(data.display_name);
      setSpecialty(data.specialty ?? "");
      setBio(data.bio ?? "");
      setCareerHistory(data.career_history ?? []);
      setCertifications(data.certifications ?? []);
      setSnsLinks(data.sns_links ?? {});
      setShowContact(data.show_contact);
      setIsPublic(data.is_public);
    } catch {
      // profile doesn't exist yet
    } finally {
      setLoading(false);
    }
  }, [api, memberId]);

  useEffect(() => {
    if (isReady && memberId) loadProfile();
  }, [isReady, memberId, loadProfile]);

  const handleSave = async () => {
    if (!memberId) return;
    setSaving(true);
    try {
      await api.updateMemberProfile(memberId, {
        specialty: specialty || null,
        bio: bio || null,
        career_history: careerHistory,
        certifications,
        sns_links: snsLinks,
        show_contact: showContact,
        is_public: isPublic,
      });
      alert("프로필이 저장되었습니다.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!memberId) throw new Error("Member not found");
    const result = await api.uploadProfilePhoto(memberId, file);
    setPhotoUrl(result.profile_photo_url);
    return result.profile_photo_url;
  };

  // Career helpers
  const addCareer = () => {
    setCareerHistory([...careerHistory, { company: "", role: "", start_year: new Date().getFullYear(), end_year: null }]);
  };
  const updateCareer = (index: number, updates: Partial<CareerEntry>) => {
    setCareerHistory(careerHistory.map((c, i) => (i === index ? { ...c, ...updates } : c)));
  };
  const removeCareer = (index: number) => {
    setCareerHistory(careerHistory.filter((_, i) => i !== index));
  };

  // Certification helpers
  const addCertification = () => {
    setCertifications([...certifications, { name: "", issuer: "", year: new Date().getFullYear() }]);
  };
  const updateCertification = (index: number, updates: Partial<CertificationEntry>) => {
    setCertifications(certifications.map((c, i) => (i === index ? { ...c, ...updates } : c)));
  };
  const removeCertification = (index: number) => {
    setCertifications(certifications.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="px-4 py-8 text-center text-subtle">불러오는 중...</div>
    );
  }

  return (
    <div className="pb-24">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-base font-bold text-foreground">내 프로필</h2>
        <p className="text-xs text-muted-foreground mt-0.5">이력 정보를 작성하면 포트폴리오와 함께 표시됩니다</p>
      </div>

      <div className="px-4 space-y-6">
        {/* 1. Profile Photo */}
        <section className="flex justify-center py-4">
          <ProfilePhotoUpload
            currentUrl={photoUrl}
            onUpload={handlePhotoUpload}
            size={96}
          />
        </section>

        {/* 2. Basic Info */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">기본 정보</h3>
          <div>
            <label className="text-xs text-muted-foreground">이름</label>
            <input
              type="text"
              value={displayName}
              readOnly
              className="w-full mt-1 px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">전문 분야</label>
            <input
              type="text"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="예: 헤어 컬러, 네일 아트"
              className="w-full mt-1 px-3 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">한 줄 소개</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 100))}
              placeholder="간단한 자기소개를 작성해주세요"
              rows={2}
              className="w-full mt-1 px-3 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-ring resize-none"
            />
            <p className="text-[11px] text-subtle text-right mt-0.5">{bio.length}/100</p>
          </div>
        </section>

        {/* 3. Career History */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">경력 사항</h3>
            <button
              type="button"
              onClick={addCareer}
              className="text-xs text-accent font-medium"
            >
              + 추가
            </button>
          </div>
          {careerHistory.length === 0 && (
            <p className="text-xs text-subtle">경력을 추가해주세요</p>
          )}
          {careerHistory.map((career, i) => (
            <div key={i} className="p-3 bg-card border border-border rounded-xl space-y-2">
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={career.company}
                    onChange={(e) => updateCareer(i, { company: e.target.value })}
                    placeholder="회사/매장명"
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
                  />
                  <input
                    type="text"
                    value={career.role}
                    onChange={(e) => updateCareer(i, { role: e.target.value })}
                    placeholder="직책 (예: 수석 디자이너)"
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
                  />
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      value={career.start_year}
                      onChange={(e) => updateCareer(i, { start_year: parseInt(e.target.value) || 0 })}
                      placeholder="시작년도"
                      className="w-24 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground text-center focus:outline-none focus:border-ring"
                    />
                    <span className="text-xs text-subtle">~</span>
                    {career.end_year === null ? (
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked
                          onChange={() => updateCareer(i, { end_year: new Date().getFullYear() })}
                          className="rounded"
                        />
                        현재
                      </label>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={career.end_year}
                          onChange={(e) => updateCareer(i, { end_year: parseInt(e.target.value) || 0 })}
                          placeholder="종료년도"
                          className="w-24 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground text-center focus:outline-none focus:border-ring"
                        />
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={() => updateCareer(i, { end_year: null })}
                            className="rounded"
                          />
                          현재
                        </label>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeCareer(i)}
                  className="ml-2 mt-1 text-subtle hover:text-red-500 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </section>

        {/* 4. Certifications */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">자격증</h3>
            <button
              type="button"
              onClick={addCertification}
              className="text-xs text-accent font-medium"
            >
              + 추가
            </button>
          </div>
          {certifications.length === 0 && (
            <p className="text-xs text-subtle">자격증을 추가해주세요</p>
          )}
          {certifications.map((cert, i) => (
            <div key={i} className="p-3 bg-card border border-border rounded-xl space-y-2">
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={cert.name}
                    onChange={(e) => updateCertification(i, { name: e.target.value })}
                    placeholder="자격증명"
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={cert.issuer}
                      onChange={(e) => updateCertification(i, { issuer: e.target.value })}
                      placeholder="발급기관"
                      className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
                    />
                    <input
                      type="number"
                      value={cert.year}
                      onChange={(e) => updateCertification(i, { year: parseInt(e.target.value) || 0 })}
                      placeholder="년도"
                      className="w-24 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground text-center focus:outline-none focus:border-ring"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeCertification(i)}
                  className="ml-2 mt-1 text-subtle hover:text-red-500 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </section>

        {/* 5. SNS Links */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">SNS 링크</h3>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-muted-foreground">Instagram</label>
              <input
                type="text"
                value={snsLinks.instagram ?? ""}
                onChange={(e) => setSnsLinks({ ...snsLinks, instagram: e.target.value || undefined })}
                placeholder="@username 또는 URL"
                className="w-full mt-1 px-3 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">카카오톡</label>
              <input
                type="text"
                value={snsLinks.kakao ?? ""}
                onChange={(e) => setSnsLinks({ ...snsLinks, kakao: e.target.value || undefined })}
                placeholder="카카오톡 ID 또는 오픈채팅 URL"
                className="w-full mt-1 px-3 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">YouTube</label>
              <input
                type="text"
                value={snsLinks.youtube ?? ""}
                onChange={(e) => setSnsLinks({ ...snsLinks, youtube: e.target.value || undefined })}
                placeholder="채널 URL"
                className="w-full mt-1 px-3 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">블로그</label>
              <input
                type="text"
                value={snsLinks.blog ?? ""}
                onChange={(e) => setSnsLinks({ ...snsLinks, blog: e.target.value || undefined })}
                placeholder="블로그 URL"
                className="w-full mt-1 px-3 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
              />
            </div>
          </div>
        </section>

        {/* 6. Public Settings */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">공개 설정</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-card border border-border rounded-xl cursor-pointer">
              <div>
                <p className="text-sm font-medium text-foreground">연락처 공개</p>
                <p className="text-xs text-muted-foreground">공개 프로필에서 전화번호를 표시합니다</p>
              </div>
              <input
                type="checkbox"
                checked={showContact}
                onChange={(e) => setShowContact(e.target.checked)}
                className="w-5 h-5 rounded text-primary focus:ring-primary"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-card border border-border rounded-xl cursor-pointer">
              <div>
                <p className="text-sm font-medium text-foreground">프로필 공개</p>
                <p className="text-xs text-muted-foreground">탐색 페이지에서 포트폴리오와 함께 표시됩니다</p>
              </div>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-5 h-5 rounded text-primary focus:ring-primary"
              />
            </label>
          </div>
        </section>

        {/* 7. Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-50 transition-opacity"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}

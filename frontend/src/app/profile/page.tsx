"use client";

import { useEffect, useState, useCallback } from "react";
import { useShop } from "@/contexts/ShopContext";
import { useShopApi } from "@/hooks/useShopApi";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { getTalentSettings, updateTalentSettings } from "@/lib/api";
import type { MemberProfile, CareerEntry, CertificationEntry, EducationEntry, SnsLinks } from "@/lib/api";
import { POSITION_PRESETS, CERT_PRESETS, GRADUATION_STATUS, MONTHS } from "@/lib/constants/resume-presets";
import { calcDuration, migrateCareerEntry, migrateCertEntry } from "@/lib/utils/resume";

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
  const [address, setAddress] = useState("");
  const [careerHistory, setCareerHistory] = useState<CareerEntry[]>([]);
  const [certifications, setCertifications] = useState<CertificationEntry[]>([]);
  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [snsLinks, setSnsLinks] = useState<SnsLinks>({});
  const [showContact, setShowContact] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [openToProposals, setOpenToProposals] = useState(false);
  const [savingTalent, setSavingTalent] = useState(false);

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
      setAddress(data.address ?? "");
      setCareerHistory((data.career_history ?? []).map(migrateCareerEntry));
      setCertifications((data.certifications ?? []).map(migrateCertEntry));
      setEducation(data.education ?? []);
      setSnsLinks(data.sns_links ?? {});
      setShowContact(data.show_contact);
      setIsPublic(data.is_public);
      // Load talent settings
      try {
        const talentData = await getTalentSettings();
        setOpenToProposals(talentData.open_to_proposals);
      } catch {
        // ignore
      }
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
        education,
        address: address || null,
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
    setCareerHistory([...careerHistory, {
      company: "", position: "", start_date: `${new Date().getFullYear()}-01`, end_date: null, duties: ""
    }]);
  };
  const updateCareer = (index: number, updates: Partial<CareerEntry>) => {
    setCareerHistory(careerHistory.map((c, i) => (i === index ? { ...c, ...updates } : c)));
  };
  const removeCareer = (index: number) => {
    setCareerHistory(careerHistory.filter((_, i) => i !== index));
  };

  // Certification helpers
  const addCertification = () => {
    setCertifications([...certifications, { name: "", issuer: "", date: `${new Date().getFullYear()}-01`, license_number: "" }]);
  };
  const updateCertification = (index: number, updates: Partial<CertificationEntry>) => {
    setCertifications(certifications.map((c, i) => (i === index ? { ...c, ...updates } : c)));
  };
  const removeCertification = (index: number) => {
    setCertifications(certifications.filter((_, i) => i !== index));
  };

  // Education helpers
  const addEducation = () => {
    setEducation([...education, { school: "", major: "", start_date: `${new Date().getFullYear()}-03`, end_date: null, status: "재학중" }]);
  };
  const updateEducation = (index: number, updates: Partial<EducationEntry>) => {
    setEducation(education.map((e, i) => (i === index ? { ...e, ...updates } : e)));
  };
  const removeEducation = (index: number) => {
    setEducation(education.filter((_, i) => i !== index));
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
              className="w-full mt-1 px-3 py-2.5 bg-surface border border-border rounded-xl text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">한 줄 소개</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 100))}
              placeholder="간단한 자기소개를 작성해주세요"
              rows={2}
              className="w-full mt-1 px-3 py-2.5 bg-surface border border-border rounded-xl text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
            />
            <p className="text-[11px] text-subtle text-right mt-0.5">{bio.length}/100</p>
          </div>
        </section>

        {/* 3. Address */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">주소</h3>
          <div>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="주소 입력 (공개 프로필에서는 시/구까지만 표시됩니다)"
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <p className="text-[11px] text-subtle mt-1">예: 서울시 강남구 역삼동 → 공개 시 "서울시 강남구"로 표시</p>
          </div>
        </section>

        {/* 4. Career History */}
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
                <div className="flex-1 space-y-2 min-w-0">
                  {/* 매장명 */}
                  <input
                    type="text"
                    value={career.company}
                    onChange={(e) => updateCareer(i, { company: e.target.value })}
                    placeholder="회사/매장명"
                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                  {/* 직급 */}
                  <select
                    value={career.position}
                    onChange={(e) => updateCareer(i, { position: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20"
                  >
                    <option value="">직급 선택</option>
                    {POSITION_PRESETS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  {/* 기간 */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <input
                      type="number"
                      value={parseInt(career.start_date.split('-')[0]) || ''}
                      onChange={(e) => {
                        const y = e.target.value;
                        const m = career.start_date.split('-')[1] || '01';
                        updateCareer(i, { start_date: `${y}-${m}` });
                      }}
                      placeholder="년"
                      className="w-16 px-2 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                    <select
                      value={parseInt(career.start_date.split('-')[1]) || 1}
                      onChange={(e) => {
                        const y = career.start_date.split('-')[0] || new Date().getFullYear();
                        updateCareer(i, { start_date: `${y}-${String(e.target.value).padStart(2, '0')}` });
                      }}
                      className="w-16 px-1 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20"
                    >
                      {MONTHS.map((m) => <option key={m} value={m}>{m}월</option>)}
                    </select>
                    <span className="text-xs text-subtle">~</span>
                    {career.end_date === null ? (
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked
                          onChange={() => updateCareer(i, { end_date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}` })}
                          className="rounded"
                        />
                        재직중
                      </label>
                    ) : (
                      <>
                        <input
                          type="number"
                          value={parseInt(career.end_date.split('-')[0]) || ''}
                          onChange={(e) => {
                            const y = e.target.value;
                            const m = career.end_date!.split('-')[1] || '01';
                            updateCareer(i, { end_date: `${y}-${m}` });
                          }}
                          placeholder="년"
                          className="w-16 px-2 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-accent/20"
                        />
                        <select
                          value={parseInt(career.end_date.split('-')[1]) || 1}
                          onChange={(e) => {
                            const y = career.end_date!.split('-')[0] || new Date().getFullYear();
                            updateCareer(i, { end_date: `${y}-${String(e.target.value).padStart(2, '0')}` });
                          }}
                          className="w-16 px-1 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20"
                        >
                          {MONTHS.map((m) => <option key={m} value={m}>{m}월</option>)}
                        </select>
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={() => updateCareer(i, { end_date: null })}
                            className="rounded"
                          />
                          재직중
                        </label>
                      </>
                    )}
                  </div>
                  {/* 자동 근무기간 표시 */}
                  {career.start_date && (
                    <span className="text-xs text-accent font-medium">
                      {calcDuration(career.start_date, career.end_date)}
                    </span>
                  )}
                  {/* 담당업무 */}
                  <input
                    type="text"
                    value={career.duties}
                    onChange={(e) => updateCareer(i, { duties: e.target.value })}
                    placeholder="담당 업무 (예: 헤어 컬러 전담, 교육 담당)"
                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeCareer(i)}
                  className="ml-2 mt-1 flex-shrink-0 text-subtle hover:text-red-500 transition-colors"
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

        {/* 5. Certifications */}
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
                <div className="flex-1 space-y-2 min-w-0">
                  {/* 자격증명 선택 */}
                  <select
                    value={CERT_PRESETS.some((p) => p.name === cert.name) ? cert.name : '__custom__'}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        updateCertification(i, { name: '', issuer: '' });
                      } else if (e.target.value === '') {
                        updateCertification(i, { name: '', issuer: '' });
                      } else {
                        const preset = CERT_PRESETS.find((p) => p.name === e.target.value);
                        if (preset) updateCertification(i, { name: preset.name, issuer: preset.issuer });
                      }
                    }}
                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20"
                  >
                    <option value="">자격증 선택</option>
                    {CERT_PRESETS.map((p) => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                    <option value="__custom__">직접 입력</option>
                  </select>
                  {/* 직접 입력 텍스트 필드 — 프리셋 미매칭 시 표시 */}
                  {!CERT_PRESETS.some((p) => p.name === cert.name) && (
                    <input
                      type="text"
                      value={cert.name}
                      onChange={(e) => updateCertification(i, { name: e.target.value })}
                      placeholder="자격증명 직접 입력"
                      className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                  )}
                  {/* 발급기관 */}
                  <input
                    type="text"
                    value={cert.issuer}
                    onChange={(e) => updateCertification(i, { issuer: e.target.value })}
                    placeholder="발급기관"
                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                  {/* 취득일 — 년 + 월 */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={parseInt(cert.date.split('-')[0]) || ''}
                      onChange={(e) => {
                        const y = e.target.value;
                        const m = cert.date.split('-')[1] || '01';
                        updateCertification(i, { date: `${y}-${m}` });
                      }}
                      placeholder="년"
                      className="w-16 px-2 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                    <select
                      value={parseInt(cert.date.split('-')[1]) || 1}
                      onChange={(e) => {
                        const y = cert.date.split('-')[0] || new Date().getFullYear();
                        updateCertification(i, { date: `${y}-${String(e.target.value).padStart(2, '0')}` });
                      }}
                      className="w-16 px-1 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20"
                    >
                      {MONTHS.map((m) => <option key={m} value={m}>{m}월</option>)}
                    </select>
                    <span className="text-xs text-subtle">취득</span>
                  </div>
                  {/* 자격증 번호 */}
                  <input
                    type="text"
                    value={cert.license_number}
                    onChange={(e) => updateCertification(i, { license_number: e.target.value })}
                    placeholder="자격증 번호 (선택)"
                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeCertification(i)}
                  className="ml-2 mt-1 flex-shrink-0 text-subtle hover:text-red-500 transition-colors"
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

        {/* 6. Education */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">학력 사항</h3>
            <button
              type="button"
              onClick={addEducation}
              className="text-xs text-accent font-medium"
            >
              + 추가
            </button>
          </div>
          {education.length === 0 && (
            <p className="text-xs text-subtle">학력을 추가해주세요</p>
          )}
          {education.map((edu, i) => (
            <div key={i} className="p-3 bg-card border border-border rounded-xl space-y-2">
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-2 min-w-0">
                  {/* 학교명 */}
                  <input
                    type="text"
                    value={edu.school}
                    onChange={(e) => updateEducation(i, { school: e.target.value })}
                    placeholder="학교명"
                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                  {/* 전공/학과 */}
                  <input
                    type="text"
                    value={edu.major}
                    onChange={(e) => updateEducation(i, { major: e.target.value })}
                    placeholder="전공/학과 (예: 미용예술학과)"
                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                  {/* 기간 */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <input
                      type="number"
                      value={parseInt(edu.start_date.split('-')[0]) || ''}
                      onChange={(e) => {
                        const y = e.target.value;
                        const m = edu.start_date.split('-')[1] || '03';
                        updateEducation(i, { start_date: `${y}-${m}` });
                      }}
                      placeholder="년"
                      className="w-16 px-2 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                    <select
                      value={parseInt(edu.start_date.split('-')[1]) || 3}
                      onChange={(e) => {
                        const y = edu.start_date.split('-')[0] || new Date().getFullYear();
                        updateEducation(i, { start_date: `${y}-${String(e.target.value).padStart(2, '0')}` });
                      }}
                      className="w-16 px-1 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20"
                    >
                      {MONTHS.map((m) => <option key={m} value={m}>{m}월</option>)}
                    </select>
                    <span className="text-xs text-subtle">~</span>
                    {edu.end_date === null ? (
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked
                          onChange={() => updateEducation(i, { end_date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}` })}
                          className="rounded"
                        />
                        재학중
                      </label>
                    ) : (
                      <>
                        <input
                          type="number"
                          value={parseInt(edu.end_date.split('-')[0]) || ''}
                          onChange={(e) => {
                            const y = e.target.value;
                            const m = edu.end_date!.split('-')[1] || '02';
                            updateEducation(i, { end_date: `${y}-${m}` });
                          }}
                          placeholder="년"
                          className="w-16 px-2 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-accent/20"
                        />
                        <select
                          value={parseInt(edu.end_date.split('-')[1]) || 2}
                          onChange={(e) => {
                            const y = edu.end_date!.split('-')[0] || new Date().getFullYear();
                            updateEducation(i, { end_date: `${y}-${String(e.target.value).padStart(2, '0')}` });
                          }}
                          className="w-16 px-1 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20"
                        >
                          {MONTHS.map((m) => <option key={m} value={m}>{m}월</option>)}
                        </select>
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={() => updateEducation(i, { end_date: null })}
                            className="rounded"
                          />
                          재학중
                        </label>
                      </>
                    )}
                  </div>
                  {/* 졸업상태 */}
                  <select
                    value={edu.status}
                    onChange={(e) => updateEducation(i, { status: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20"
                  >
                    {GRADUATION_STATUS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => removeEducation(i)}
                  className="ml-2 mt-1 flex-shrink-0 text-subtle hover:text-red-500 transition-colors"
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

        {/* 7. SNS Links */}
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
                className="w-full mt-1 px-3 py-2.5 bg-surface border border-border rounded-xl text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">카카오톡</label>
              <input
                type="text"
                value={snsLinks.kakao ?? ""}
                onChange={(e) => setSnsLinks({ ...snsLinks, kakao: e.target.value || undefined })}
                placeholder="카카오톡 ID 또는 오픈채팅 URL"
                className="w-full mt-1 px-3 py-2.5 bg-surface border border-border rounded-xl text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">YouTube</label>
              <input
                type="text"
                value={snsLinks.youtube ?? ""}
                onChange={(e) => setSnsLinks({ ...snsLinks, youtube: e.target.value || undefined })}
                placeholder="채널 URL"
                className="w-full mt-1 px-3 py-2.5 bg-surface border border-border rounded-xl text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">블로그</label>
              <input
                type="text"
                value={snsLinks.blog ?? ""}
                onChange={(e) => setSnsLinks({ ...snsLinks, blog: e.target.value || undefined })}
                placeholder="블로그 URL"
                className="w-full mt-1 px-3 py-2.5 bg-surface border border-border rounded-xl text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>
        </section>

        {/* 8. Public Settings */}
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
                className="w-5 h-5 rounded text-accent focus:ring-accent"
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
                className="w-5 h-5 rounded text-accent focus:ring-accent"
              />
            </label>
          </div>
        </section>

        {/* 제안 수신 설정 */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">제안 수신 설정</h3>
          <label className="flex items-center justify-between p-3 bg-card border border-border rounded-xl cursor-pointer">
            <div>
              <p className="text-sm font-medium text-foreground">제안 받기</p>
              <p className="text-xs text-muted-foreground">현재 소속 매장에서는 자동으로 차단됩니다</p>
            </div>
            <input
              type="checkbox"
              checked={openToProposals}
              onChange={async (e) => {
                const newVal = e.target.checked;
                setOpenToProposals(newVal);
                setSavingTalent(true);
                try {
                  await updateTalentSettings({ open_to_proposals: newVal });
                } catch {
                  setOpenToProposals(!newVal);
                } finally {
                  setSavingTalent(false);
                }
              }}
              disabled={savingTalent}
              className="w-5 h-5 rounded text-accent focus:ring-accent"
            />
          </label>
        </section>

        {/* 9. Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-accent text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-opacity"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}

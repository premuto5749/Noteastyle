"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getDesignerPublicProfile, type DesignerPublicProfile } from "@/lib/api";

export default function DesignerProfilePage() {
  const { memberId } = useParams<{ memberId: string }>();
  const [profile, setProfile] = useState<DesignerPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memberId) return;
    setLoading(true);
    getDesignerPublicProfile(memberId)
      .then(setProfile)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [memberId]);

  if (loading) {
    return <div className="px-4 py-8 text-center text-subtle">불러오는 중...</div>;
  }

  if (error || !profile) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-muted-foreground text-sm">{error || "프로필을 찾을 수 없습니다."}</p>
        <Link href="/explore" className="text-accent text-sm mt-2 inline-block">
          탐색으로 돌아가기
        </Link>
      </div>
    );
  }

  const hasSns = profile.sns_links && Object.values(profile.sns_links).some(Boolean);

  return (
    <div className="pb-24">
      {/* Back button */}
      <div className="px-4 pt-3 pb-2">
        <Link href="/explore" className="text-sm text-accent">
          &larr; 탐색
        </Link>
      </div>

      {/* Profile Card */}
      <div className="px-4 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          {/* Avatar + Name */}
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-muted border border-border flex-shrink-0">
              {profile.profile_photo_url ? (
                <Image
                  src={profile.profile_photo_url}
                  alt={profile.display_name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-subtle">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground">{profile.display_name}</h2>
              {profile.specialty && (
                <p className="text-sm text-accent">{profile.specialty}</p>
              )}
              <p className="text-xs text-muted-foreground">{profile.shop.name}</p>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-muted-foreground">{profile.bio}</p>
          )}

          {/* Contact */}
          {profile.show_contact && profile.phone && (
            <div className="flex items-center gap-2 text-sm text-foreground">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              {profile.phone}
            </div>
          )}

          {/* SNS Links */}
          {hasSns && (
            <div className="flex gap-3">
              {profile.sns_links.instagram && (
                <a
                  href={profile.sns_links.instagram.startsWith("http") ? profile.sns_links.instagram : `https://instagram.com/${profile.sns_links.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline"
                >
                  Instagram
                </a>
              )}
              {profile.sns_links.kakao && (
                <span className="text-xs text-muted-foreground">
                  카카오: {profile.sns_links.kakao}
                </span>
              )}
              {profile.sns_links.youtube && (
                <a
                  href={profile.sns_links.youtube.startsWith("http") ? profile.sns_links.youtube : `https://youtube.com/${profile.sns_links.youtube}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline"
                >
                  YouTube
                </a>
              )}
              {profile.sns_links.blog && (
                <a
                  href={profile.sns_links.blog.startsWith("http") ? profile.sns_links.blog : `https://${profile.sns_links.blog}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline"
                >
                  블로그
                </a>
              )}
            </div>
          )}
        </div>

        {/* Career History */}
        {profile.career_history.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">경력</h3>
            <div className="space-y-2">
              {profile.career_history.map((career, i) => (
                <div key={i} className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-foreground">{career.company}</p>
                    <p className="text-xs text-muted-foreground">{career.role}</p>
                  </div>
                  <p className="text-xs text-subtle whitespace-nowrap">
                    {career.start_year} ~ {career.end_year ?? "현재"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {profile.certifications.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">자격증</h3>
            <div className="space-y-2">
              {profile.certifications.map((cert, i) => (
                <div key={i} className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-foreground">{cert.name}</p>
                    <p className="text-xs text-muted-foreground">{cert.issuer}</p>
                  </div>
                  <p className="text-xs text-subtle">{cert.year}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Portfolios */}
        {profile.portfolios.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground px-1">포트폴리오</h3>
            <div className="grid grid-cols-2 gap-3">
              {profile.portfolios.map((item) => (
                <div
                  key={item.id}
                  className="bg-card rounded-xl border border-border overflow-hidden"
                >
                  <div className="aspect-square bg-muted relative">
                    {(item.photo?.face_swapped_url || item.photo?.photo_url) ? (
                      <Image
                        src={item.photo.face_swapped_url || item.photo.photo_url}
                        alt={item.title || "포트폴리오"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 480px) 50vw, 240px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-hint">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {item.title && (
                    <div className="p-2.5">
                      <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

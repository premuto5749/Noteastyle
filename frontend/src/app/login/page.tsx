"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup" | "forgot-password";

function getErrorMessage(error: string): string {
  const errorMap: Record<string, string> = {
    "Invalid login credentials": "이메일 또는 비밀번호가 올바르지 않습니다.",
    "Email not confirmed": "이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.",
    "User already registered": "이미 가입된 이메일입니다.",
    "Password should be at least 6 characters": "비밀번호는 최소 6자 이상이어야 합니다.",
    "Email rate limit exceeded": "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
    "For security purposes, you can only request this once every 60 seconds": "보안을 위해 60초에 한 번만 요청할 수 있습니다.",
  };
  return errorMap[error] || error;
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired");

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(getErrorMessage(error.message));
      setIsLoading(false);
      return;
    }

    // Check for pending invite token from /invite page
    const pendingToken = localStorage.getItem("pending_invite_token");
    if (pendingToken) {
      localStorage.removeItem("pending_invite_token");
      router.push(`/invite/${pendingToken}`);
      router.refresh();
      return;
    }

    router.push("/");
    router.refresh();
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!fullName.trim()) {
      setError("이름을 입력해주세요.");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: fullName.trim() },
      },
    });

    if (error) {
      setError(getErrorMessage(error.message));
      setIsLoading(false);
      return;
    }

    // Create user_profiles entry
    if (data.user) {
      await fetch("/api/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName.trim() }),
      });
    }

    setMessage("인증 메일이 발송되었습니다. 메일함을 확인해주세요.");
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });

    if (error) {
      setError(getErrorMessage(error.message));
      setIsLoading(false);
      return;
    }

    setMessage("비밀번호 재설정 메일이 발송되었습니다. 메일함을 확인해주세요.");
    setIsLoading(false);
  };

  const handleKakaoLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (mode === "login") return handleLogin(e);
    if (mode === "signup") return handleSignup(e);
    return handleForgotPassword(e);
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError("");
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-card flex flex-col justify-center px-6 py-12">
      {/* Logo */}
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          note-a-style
        </h1>
      </div>

      {/* Greeting */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-foreground">
          {mode === "login" && "디자이너님, 반가워요!"}
          {mode === "signup" && "회원가입"}
          {mode === "forgot-password" && "비밀번호 찾기"}
        </h2>
        {mode === "forgot-password" && (
          <p className="text-sm text-subtle mt-2">
            가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.
          </p>
        )}
      </div>

      {/* Session expired notice */}
      {expired && mode === "login" && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-200">
          세션이 만료되었습니다. 다시 로그인해주세요.
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Success message */}
      {message && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-600 dark:text-green-400">
          {message}
        </div>
      )}

      {/* Kakao Login Button (login mode, before email form shown) */}
      {mode === "login" && !showEmailForm && (
        <>
          <button
            onClick={handleKakaoLogin}
            className="w-full py-3.5 bg-[#FEE500] text-[#191919] rounded-full font-bold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#191919">
              <path d="M12 3C6.48 3 2 6.48 2 10.5c0 2.55 1.71 4.8 4.27 6.1l-1.08 3.97c-.09.34.27.62.57.44l4.7-3.1c.5.06 1.01.09 1.54.09 5.52 0 10-3.48 10-7.5S17.52 3 12 3z" />
            </svg>
            카카오로 시작하기
          </button>

          {/* Divider */}
          <button
            onClick={() => setShowEmailForm(true)}
            className="w-full text-center mt-6 text-sm text-subtle"
          >
            또는 이메일로 로그인
          </button>
        </>
      )}

      {/* Email Form */}
      {(showEmailForm || mode !== "login") && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="이름"
                required
                className="w-full px-4 py-3.5 border border-border rounded-xl text-sm bg-card text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
              />
            </div>
          )}

          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              required
              className="w-full px-4 py-3.5 border border-border rounded-xl text-sm bg-card text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
            />
          </div>

          {mode !== "forgot-password" && (
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                required
                minLength={6}
                className="w-full px-4 py-3.5 border border-border rounded-xl text-sm bg-card text-foreground placeholder:text-subtle focus:outline-none focus:border-ring pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-subtle"
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          )}

          {/* Forgot Password link (login mode only) */}
          {mode === "login" && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => switchMode("forgot-password")}
                className="text-xs text-subtle"
              >
                비밀번호를 잊으셨나요?
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-primary text-primary-foreground rounded-full font-bold text-sm active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
          >
            {isLoading
              ? "처리 중..."
              : mode === "login"
                ? "로그인"
                : mode === "signup"
                  ? "회원가입"
                  : "재설정 메일 보내기"}
          </button>
        </form>
      )}

      {/* Mode switch links */}
      <div className="text-center mt-6">
        {mode === "login" && (
          <span className="text-sm text-subtle">
            아직 회원이 아니시라면{" "}
            <button
              onClick={() => switchMode("signup")}
              className="text-foreground font-bold underline"
            >
              회원가입
            </button>
          </span>
        )}
        {mode === "signup" && (
          <span className="text-sm text-subtle">
            이미 회원이시라면{" "}
            <button
              onClick={() => switchMode("login")}
              className="text-foreground font-bold underline"
            >
              로그인
            </button>
          </span>
        )}
        {mode === "forgot-password" && (
          <button
            onClick={() => switchMode("login")}
            className="text-sm text-foreground font-bold underline"
          >
            로그인으로 돌아가기
          </button>
        )}
      </div>

      {/* Kakao button in signup/forgot-password modes */}
      {mode !== "login" && (
        <>
          <div className="flex items-center gap-3 my-8">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-subtle">혹은</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button
            onClick={handleKakaoLogin}
            className="w-full py-3.5 bg-[#FEE500] text-[#191919] rounded-full font-bold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#191919">
              <path d="M12 3C6.48 3 2 6.48 2 10.5c0 2.55 1.71 4.8 4.27 6.1l-1.08 3.97c-.09.34.27.62.57.44l4.7-3.1c.5.06 1.01.09 1.54.09 5.52 0 10-3.48 10-7.5S17.52 3 12 3z" />
            </svg>
            카카오로 시작하기
          </button>
        </>
      )}

      {/* Divider + Kakao for login mode with email form shown */}
      {mode === "login" && showEmailForm && (
        <>
          <div className="flex items-center gap-3 my-8">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-subtle">혹은</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button
            onClick={handleKakaoLogin}
            className="w-full py-3.5 bg-[#FEE500] text-[#191919] rounded-full font-bold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#191919">
              <path d="M12 3C6.48 3 2 6.48 2 10.5c0 2.55 1.71 4.8 4.27 6.1l-1.08 3.97c-.09.34.27.62.57.44l4.7-3.1c.5.06 1.01.09 1.54.09 5.52 0 10-3.48 10-7.5S17.52 3 12 3z" />
            </svg>
            카카오로 시작하기
          </button>
        </>
      )}
    </div>
  );
}

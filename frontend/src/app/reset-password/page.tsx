"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
      } else {
        setHasSession(true);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    router.push("/");
  };

  if (!hasSession) {
    return (
      <div className="min-h-screen bg-card flex items-center justify-center">
        <div className="text-subtle text-sm">확인 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-card flex flex-col justify-center px-6 py-12">
      {/* Logo */}
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          note-a-style
        </h1>
      </div>

      {/* Heading */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-foreground">
          새 비밀번호 설정
        </h2>
        <p className="text-sm text-subtle mt-2">
          새로운 비밀번호를 입력해주세요. (최소 6자)
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="새 비밀번호"
            required
            minLength={6}
            className="w-full px-4 py-3.5 border border-border rounded-xl text-sm bg-card text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
          />
        </div>
        <div>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="새 비밀번호 확인"
            required
            minLength={6}
            className="w-full px-4 py-3.5 border border-border rounded-xl text-sm bg-card text-foreground placeholder:text-subtle focus:outline-none focus:border-ring"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 bg-primary text-primary-foreground rounded-full font-bold text-sm active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
        >
          {isLoading ? "처리 중..." : "비밀번호 변경"}
        </button>
      </form>
    </div>
  );
}

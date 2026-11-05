"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";

type Status = "checking" | "guest" | "user" | "confirm" | "working" | "done";

export function AccountDeleteAction() {
  const [status, setStatus] = useState<Status>("checking");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isApp, setIsApp] = useState(false);

  useEffect(() => {
    setIsApp(navigator.userAgent.includes("MyeongunApp"));
    const apply = (session: { user?: { user_metadata?: Record<string, unknown> } } | null) => {
      const meta = session?.user?.user_metadata;
      if (!session?.user) {
        setStatus((s) => (s === "done" ? s : "guest"));
        return;
      }
      setName(String(meta?.name ?? meta?.full_name ?? "회원"));
      setStatus((s) => (s === "checking" || s === "guest" ? "user" : s));
    };
    void supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => apply(session));
    return () => sub.subscription.unsubscribe();
  }, []);

  const login = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { scopes: "profile_nickname profile_image", redirectTo: `${window.location.origin}/account-delete` },
    });
  };

  const remove = async () => {
    setStatus("working");
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setStatus("guest");
        return;
      }
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ confirm: true }),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; message?: string } | null;
      if (!res.ok || !json?.success) throw new Error(json?.message || "삭제하지 못했습니다.");
      setStatus("done");
      await supabase.auth.signOut({ scope: "local" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제하지 못했습니다.");
      setStatus("confirm");
    }
  };

  const box = "mt-3 rounded-xl border border-white/15 bg-white/5 p-4";

  if (status === "checking") return <div className={box}>로그인 상태를 확인하고 있어요.</div>;

  if (status === "done") {
    return <div className={box}>계정을 삭제했어요. 이용해 주셔서 감사합니다.</div>;
  }

  if (status === "guest") {
    return (
      <div className={box}>
        <p className="break-keep">삭제할 계정을 확인하려면 먼저 로그인해 주세요. 로그인한 적이 없다면 삭제할 계정이 없습니다.</p>
        {isApp ? (
          <p className="mt-1 text-xs text-amber-200/80 break-keep">앱에서는 카카오 화면 아래쪽 카카오계정(아이디·비밀번호)으로 로그인해 주세요.</p>
        ) : null}
        <button type="button" onClick={login} className="mt-3 rounded-lg bg-[#FEE500] px-4 py-2.5 text-sm font-bold text-black">
          카카오로 로그인
        </button>
      </div>
    );
  }

  if (status === "user") {
    return (
      <div className={box}>
        <p className="break-keep"><strong className="text-amber-200">{name}</strong> 님으로 로그인되어 있어요.</p>
        <button type="button" onClick={() => setStatus("confirm")} className="mt-3 rounded-lg border border-red-400/60 px-4 py-2.5 text-sm font-bold text-red-300">
          계정 삭제하기
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-red-400/50 bg-red-500/10 p-4">
      <p className="font-bold text-red-200">정말 삭제할까요?</p>
      <p className="mt-1 break-keep">되돌릴 수 없어요. 구매한 소원 자물쇠도 벽에서 내려가고, 남은 이용권도 사라져요.</p>
      {error ? <p role="alert" className="mt-2 text-red-300 break-keep">{error}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={status === "working"} onClick={remove} className="rounded-lg bg-red-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {status === "working" ? "삭제하는 중…" : "삭제합니다"}
        </button>
        <button type="button" disabled={status === "working"} onClick={() => setStatus("user")} className="rounded-lg border border-white/20 px-4 py-2.5 text-sm text-white/80 disabled:opacity-50">
          취소
        </button>
      </div>
    </div>
  );
}

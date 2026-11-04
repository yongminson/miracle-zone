"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MenuTabs } from "@/components/layout/MenuTabs";
import { logEvent } from "@/lib/analytics";

// 단톡방 궁합 순위·우리 둘 궁합 카드 만들기 (2026-11-04). 방을 만들면 /together/{code} 로 가서 내 정보부터 넣는다.

export function TogetherClient() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState<"group" | "pair" | null>(null);

  const create = async (kind: "group" | "pair") => {
    if (busy) return;
    setBusy(kind);
    try {
      const res = await fetch("/api/group/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, title: kind === "group" ? title : null }),
      });
      const data = await res.json();
      if (!res.ok || !data.code) throw new Error(data.error ?? "방을 만들지 못했어요.");
      void logEvent("group_create", { kind });
      router.push(`/together/${data.code}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "방을 만들지 못했어요.");
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0610] text-slate-100">
      <SiteHeader variant="marketing" />
      <MenuTabs active="together" />

      <main className="mx-auto max-w-xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <header className="text-center">
          <p className="text-xs font-semibold tracking-[0.3em] text-pink-300/80">무료 · 로그인 없이</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            <span className="bg-gradient-to-r from-pink-300 via-rose-200 to-amber-200 bg-clip-text text-transparent">같이 보는 궁합</span>
          </h1>
          <p className="mt-3 text-sm text-white/60 break-keep">링크 하나를 보내면, 들어온 사람마다 생일만 넣어요. 사주로 서로 얼마나 잘 맞는지 바로 나와요.</p>
        </header>

        <section className="mt-8 rounded-3xl border border-pink-400/30 bg-gradient-to-b from-pink-950/40 to-black/40 p-5">
          <p className="text-lg font-bold text-pink-100">👥 우리 단톡방 궁합 순위</p>
          <p className="mt-1 text-sm text-white/60 break-keep">단톡방에 링크를 올리면 누가 누구랑 찰떡인지, 연애·돈 궁합 1위는 누구인지 줄을 세워 드려요. 최대 30명.</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 30))}
            placeholder="방 이름 (안 써도 돼요) 예: 고딩 친구들"
            className="mt-4 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-pink-400/60"
          />
          <button
            type="button"
            onClick={() => create("group")}
            disabled={!!busy}
            className="mt-3 w-full rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-pink-900/40 disabled:opacity-60"
          >
            {busy === "group" ? "방 만드는 중..." : "순위 방 만들기"}
          </button>
        </section>

        <section className="mt-5 rounded-3xl border border-amber-400/30 bg-gradient-to-b from-amber-950/30 to-black/40 p-5">
          <p className="text-lg font-bold text-amber-100">💑 우리 둘 궁합 카드</p>
          <p className="mt-1 text-sm text-white/60 break-keep">내 생일을 넣고 링크를 보내면, 그 사람이 생일을 넣는 순간 둘의 궁합 카드가 완성돼요. 연인·썸·친구 누구든.</p>
          <button
            type="button"
            onClick={() => create("pair")}
            disabled={!!busy}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-3.5 text-sm font-bold text-slate-900 shadow-lg shadow-amber-900/30 disabled:opacity-60"
          >
            {busy === "pair" ? "카드 만드는 중..." : "둘 카드 만들기"}
          </button>
        </section>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-white/40 break-keep">
          방에는 이름(별명)과 궁합 결과만 보이고, 다른 사람의 생일은 보이지 않아요. 방은 만든 지 30일이 지나면 자동으로 지워져요.
        </p>
      </main>
    </div>
  );
}

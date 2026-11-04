"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MenuTabs } from "@/components/layout/MenuTabs";
import { logEvent } from "@/lib/analytics";
import { readProfiles } from "@/lib/profiles/saved-profiles";
import type { GroupRanking, PairCard } from "@/lib/group/group-ranking";

// 단톡방 궁합 순위·우리 둘 궁합 카드 방 (2026-11-04). 서버: /api/group/rooms/{code}(보기)·/members(들어가기·빼기).
// 이 기기에서 들어간 정보(memberId·token)는 localStorage 에만 둔다 — token 이 있어야 내 정보를 뺄 수 있다.

type RoomData = {
  room: { code: string; kind: "group" | "pair"; title: string | null; expiresAt: string };
  members: { id: string; nickname: string }[];
  ranking?: GroupRanking;
  card?: PairCard | null;
};

type Mine = { memberId: string; token: string };

const mineKey = (code: string) => `group-member-v1-${code}`;

function newToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function formatBirthDate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-12 shrink-0 text-white/60">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-pink-400" style={{ width: `${value}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-white/80">{value}</span>
    </div>
  );
}

export function RoomClient({ code }: { code: string }) {
  const [data, setData] = useState<RoomData | null>(null);
  const [error, setError] = useState("");
  const [mine, setMine] = useState<Mine | null>(null);
  const [nickname, setNickname] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [calendarType, setCalendarType] = useState<"solar" | "lunar" | "lunar-leap">("solar");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [joining, setJoining] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/group/rooms/${code}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "방을 불러오지 못했어요.");
      setData(json);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "방을 불러오지 못했어요.");
    } finally {
      setRefreshing(false);
    }
  }, [code]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(mineKey(code)) || "null");
      if (saved?.memberId && saved?.token) setMine(saved);
    } catch {}
    const profiles = readProfiles();
    const me = profiles.find((p) => p.relation === "self");
    if (me) {
      setNickname(me.name || "");
      setBirthDate(me.birthDate);
      setCalendarType(me.calendar);
      setGender(me.gender);
    }
    void load();
  }, [code, load]);

  // 내가 들어간 기록이 있는데 방에서 빠졌으면(다른 기기에서 뺐거나 방이 바뀜) 기록을 지운다
  const isMember = !!mine && !!data?.members.some((m) => m.id === mine.memberId);

  const join = async () => {
    if (joining) return;
    if (!nickname.trim()) return alert("이름(별명)을 넣어 주세요.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return alert("생년월일 8자리를 넣어 주세요. (예: 19950503)");
    setJoining(true);
    const token = newToken();
    try {
      const res = await fetch(`/api/group/rooms/${code}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nickname.trim(), birthDate, calendarType, gender, token }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "들어가지 못했어요.");
      const next = { memberId: json.memberId as string, token };
      try { localStorage.setItem(mineKey(code), JSON.stringify(next)); } catch {}
      setMine(next);
      void logEvent("group_join", { kind: data?.room.kind ?? "group" });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "들어가지 못했어요.");
    } finally {
      setJoining(false);
    }
  };

  const leave = async () => {
    if (!mine || !confirm("이 방에서 내 정보(이름·생일)를 뺄까요?")) return;
    const res = await fetch(`/api/group/rooms/${code}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mine),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return alert(json.error ?? "빼지 못했어요.");
    try { localStorage.removeItem(mineKey(code)); } catch {}
    setMine(null);
    await load();
  };

  const share = async () => {
    const url = `${window.location.origin}/together/${code}`;
    const kind = data?.room.kind ?? "group";
    const text = kind === "pair" ? "생일만 넣으면 우리 둘 궁합 카드가 완성돼요 💑" : "생일만 넣으면 이 방에서 누가 누구랑 찰떡인지 나와요 👥";
    void logEvent("group_share", { kind });
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share && !navigator.userAgent.includes("MyeongunApp")) {
      try {
        await nav.share({ title: "명운 궁합", text, url });
        return;
      } catch {
        // 닫았거나 안 되면 복사로
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("아래 링크를 길게 눌러 복사해 주세요", url);
    }
  };

  if (error && !data) {
    return (
      <Shell>
        <div className="mt-10 rounded-2xl border border-white/10 bg-black/30 p-6 text-center">
          <p className="text-sm text-white/70">{error}</p>
          <Link href="/together" className="mt-4 inline-block rounded-xl bg-pink-500 px-5 py-3 text-sm font-bold text-white">
            새 방 만들기
          </Link>
        </div>
      </Shell>
    );
  }
  if (!data) return <Shell><p className="mt-16 text-center text-sm text-white/50">불러오는 중...</p></Shell>;

  const isPair = data.room.kind === "pair";
  const full = isPair ? data.members.length >= 2 : data.members.length >= 30;
  const ranking = data.ranking;
  const myBest = mine && ranking ? ranking.bestFor[mine.memberId] : undefined;
  const firstName = data.members[0]?.nickname;

  const joinForm = (
    <section className="mt-6 rounded-3xl border border-pink-400/30 bg-black/40 p-5">
      <p className="text-base font-bold text-pink-100">
        {isPair
          ? data.members.length === 0
            ? "먼저 내 정보를 넣어 주세요"
            : `${firstName}님이 보낸 궁합 카드예요. 생일을 넣으면 완성돼요`
          : "내 생일 넣고 순위에 들어가기"}
      </p>
      <input
        value={nickname}
        onChange={(e) => setNickname(e.target.value.slice(0, 20))}
        placeholder="이름 또는 별명 (다른 사람에게 보여요)"
        className="mt-3 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-pink-400/60"
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        {(["male", "female"] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGender(g)}
            className={`rounded-xl border py-2.5 text-sm ${gender === g ? "border-pink-400/60 bg-pink-500/15 text-pink-100" : "border-white/15 text-white/50"}`}
          >
            {g === "male" ? "남성" : "여성"}
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
        <input
          value={birthDate}
          onChange={(e) => setBirthDate(formatBirthDate(e.target.value))}
          inputMode="numeric"
          placeholder="생년월일 8자리 (19950503)"
          className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm tracking-wider outline-none placeholder:text-white/30 focus:border-pink-400/60"
        />
        <select
          value={calendarType}
          onChange={(e) => setCalendarType(e.target.value as "solar" | "lunar" | "lunar-leap")}
          className="rounded-xl border border-white/15 bg-black/40 px-3 py-3 text-sm outline-none"
        >
          <option value="solar">양력</option>
          <option value="lunar">음력</option>
          <option value="lunar-leap">윤달</option>
        </select>
      </div>
      <button
        type="button"
        onClick={join}
        disabled={joining}
        className="mt-3 w-full rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-3.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {joining ? "계산 중..." : isPair ? "우리 둘 카드 보기" : "순위 보기"}
      </button>
      <p className="mt-2 text-center text-[11px] text-white/40">생일은 다른 사람에게 보이지 않아요. 30일 뒤 자동으로 지워져요.</p>
    </section>
  );

  const shareBox = (
    <button
      type="button"
      onClick={share}
      className="mt-4 w-full rounded-xl border border-amber-300/50 bg-amber-400/10 px-5 py-3.5 text-sm font-bold text-amber-100"
    >
      {copied ? "✅ 링크를 복사했어요! 카톡에 붙여 넣으세요" : isPair ? "💌 그 사람에게 링크 보내기" : "📨 단톡방에 링크 올리기"}
    </button>
  );

  return (
    <Shell>
      <header className="text-center">
        <p className="text-xs font-semibold tracking-[0.3em] text-pink-300/80">{isPair ? "우리 둘 궁합 카드" : "단톡방 궁합 순위"}</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight break-keep">
          {data.room.title || (isPair ? "우리 둘, 얼마나 잘 맞을까" : "우리 방 궁합 순위")}
        </h1>
        <p className="mt-2 text-xs text-white/50">
          {isPair ? `${data.members.length}/2명` : `${data.members.length}명 참여`} · 사주(타고난 기운)로 계산해요
        </p>
      </header>

      {!isMember && !full ? joinForm : null}

      {isPair ? (
        data.card ? (
          <section className="mt-6 rounded-3xl border border-amber-400/40 bg-gradient-to-b from-amber-950/40 to-black/50 p-5 text-center">
            <p className="text-sm text-amber-100/80">{data.card.aName} 💑 {data.card.bName}</p>
            <p className="mt-2 text-5xl font-black text-amber-200">{data.card.score}<span className="text-xl">점</span></p>
            <p className="mt-1 text-sm font-bold text-pink-200">{data.card.grade}</p>
            <p className="mt-3 text-[13px] leading-relaxed text-white/80 break-keep">{data.card.relation}</p>
            <div className="mt-4 space-y-2 text-left">
              <ScoreBar label="성격" value={data.card.categoryScores.personality} />
              <ScoreBar label="가치관" value={data.card.categoryScores.values} />
              <ScoreBar label="연애" value={data.card.categoryScores.love} />
              <ScoreBar label="돈" value={data.card.categoryScores.money} />
              <ScoreBar label="미래" value={data.card.categoryScores.future} />
            </div>
            <div className="mt-4 space-y-2 rounded-xl bg-white/5 px-4 py-3 text-left text-[13px] leading-relaxed text-white/80">
              <p className="break-keep">🍀 {data.card.luckyDay}</p>
              <p className="break-keep">⚠️ {data.card.carefulDay}</p>
            </div>
            <Link
              href="/tools?tab=match"
              onClick={() => void logEvent("group_to_match", {})}
              className="mt-4 inline-block w-full rounded-xl border border-pink-300/40 bg-pink-500/10 px-5 py-3 text-sm font-bold text-pink-100"
            >
              둘의 관계 흐름까지 자세히 보기 →
            </Link>
          </section>
        ) : isMember ? (
          <section className="mt-6 rounded-3xl border border-white/10 bg-black/30 p-5 text-center">
            <p className="text-base font-bold text-white/90">이제 링크를 그 사람에게 보내세요</p>
            <p className="mt-1 text-sm text-white/55 break-keep">그 사람이 생일을 넣는 순간 둘의 카드가 완성돼요.</p>
            {shareBox}
            <button type="button" onClick={load} disabled={refreshing} className="mt-3 text-xs text-white/50 underline">
              {refreshing ? "확인 중..." : "들어왔는지 다시 보기"}
            </button>
          </section>
        ) : null
      ) : ranking ? (
        <>
          {isMember || full ? shareBox : null}
          {myBest ? (
            <section className="mt-5 rounded-2xl border border-pink-400/40 bg-pink-500/10 px-4 py-4 text-center">
              <p className="text-xs text-pink-200/80">이 방에서 나랑 제일 잘 맞는 사람</p>
              <p className="mt-1 text-xl font-black text-pink-100">{myBest.partnerName} · {myBest.score}점</p>
            </section>
          ) : null}

          {data.members.length < 2 ? (
            <p className="mt-6 rounded-2xl border border-white/10 bg-black/30 px-4 py-6 text-center text-sm text-white/60 break-keep">
              두 명 이상 들어오면 순위가 나와요. 링크를 단톡방에 올려 보세요!
            </p>
          ) : (
            <>
              <section className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {ranking.awards.map((award) => (
                  <div key={award.key} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-xs text-white/60">{award.emoji} {award.title}</p>
                    <p className="mt-1 text-base font-bold text-white break-keep">{award.pair.aName} ♥ {award.pair.bName}</p>
                    <p className="mt-1 text-[12px] text-white/60 break-keep">{award.reason}</p>
                  </div>
                ))}
              </section>

              <section className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-sm font-bold text-white/90">전체 궁합 순위</p>
                <ol className="mt-3 space-y-2">
                  {(showAll ? ranking.pairs : ranking.pairs.slice(0, 10)).map((p, i) => (
                    <li key={`${p.a}-${p.b}`} className="flex items-start gap-3 rounded-xl bg-white/5 px-3 py-2.5">
                      <span className="w-6 shrink-0 text-center text-sm font-black text-pink-200">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white break-keep">{p.aName} ♥ {p.bName} <span className="text-amber-200">{p.score}점</span></p>
                        <p className="mt-0.5 text-[11px] text-white/55 break-keep">{p.line}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                {ranking.pairs.length > 10 ? (
                  <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 w-full text-xs text-white/60 underline">
                    {showAll ? "접기" : `${ranking.pairs.length}쌍 모두 보기`}
                  </button>
                ) : null}
              </section>
            </>
          )}

          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-white/50">
            <button type="button" onClick={load} disabled={refreshing} className="underline">
              {refreshing ? "불러오는 중..." : "새로 들어온 사람 보기"}
            </button>
            <span>참여: {data.members.map((m) => m.nickname).join(", ") || "아직 없음"}</span>
          </div>
        </>
      ) : null}

      {isMember ? (
        <p className="mt-6 text-center">
          <button type="button" onClick={leave} className="text-[11px] text-white/35 underline">이 방에서 내 정보 빼기</button>
        </p>
      ) : null}
      <p className="mt-8 text-center text-[11px] text-white/35 break-keep">
        궁합 점수는 두 사람의 타고난 기운(일간)·일지·띠·오행 관계로 계산해요. 재미로 보는 참고용이에요.
      </p>
      <p className="mt-2 text-center">
        <Link href="/together" className="text-xs text-pink-200/70 underline">새 방 만들기</Link>
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0610] text-slate-100">
      <SiteHeader variant="marketing" />
      <MenuTabs active="together" />
      <main className="mx-auto max-w-xl px-4 pb-24 pt-8 sm:px-6 sm:pt-10">{children}</main>
    </div>
  );
}

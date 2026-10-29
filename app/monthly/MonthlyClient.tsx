"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MenuTabs } from "@/components/layout/MenuTabs";
import { ProfileQuickPicker } from "@/components/profiles/ProfileQuickPicker";
import { logEvent } from "@/lib/analytics";
import type { SavedProfile } from "@/lib/profiles/saved-profiles";
import type { NewYearCalendarType } from "@/lib/newyear/newyear-types";
import type { MonthlyResult } from "@/lib/monthly/monthly-types";
import { MonthlyPaywall, MonthlyView, MonthlyWaiting, ownsMonthly, useMonthlyDetail } from "./MonthlyDetail";

/** 숫자만 받아 YYYY-MM-DD 로 맞춘다 (19900503 → 1990-05-03) */
function formatBirthDate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function scoreLabel(score: number): string {
  if (score >= 85) return "아주 좋음";
  if (score >= 75) return "좋음";
  if (score >= 65) return "무난함";
  if (score >= 55) return "조심";
  return "각별히 조심";
}

export function MonthlyClient() {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [birthDate, setBirthDate] = useState("");
  const [calendar, setCalendar] = useState<NewYearCalendarType>("solar");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MonthlyResult | null>(null);

  // 상세 풀이(유료). 결제에서 돌아오거나 다시 볼 때는 그 사람의 입력값으로 화면을 되살린다
  const paid = useMonthlyDetail((input, restored) => {
    setName(input.name);
    setGender(input.gender);
    setBirthDate(input.birthDate);
    setCalendar(input.calendarType);
    setResult(restored);
  });

  const applyProfile = useCallback((profile: SavedProfile) => {
    setName(profile.name);
    setGender(profile.gender);
    setBirthDate(profile.birthDate);
    setCalendar(profile.calendar);
  }, []);

  const submit = useCallback(async () => {
    if (!name.trim()) {
      setError("이름을 입력해 주세요.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      setError("생년월일 8자리를 입력해 주세요. 예) 19900503");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate, calendarType: calendar, gender }),
      });
      const json = (await res.json()) as { success?: boolean; message?: string; result?: MonthlyResult };
      if (!res.ok || !json.success || !json.result) {
        setError(json.message || "이달의 운세를 불러오지 못했습니다.");
        return;
      }
      setResult(json.result);
      void logEvent("monthly_result", { monthKey: json.result.monthKey, tenGod: json.result.tenGod, score: json.result.score });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("이달의 운세를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }, [birthDate, calendar, gender, name]);

  const owned = result ? ownsMonthly(paid.purchases, { birthDate, calendarType: calendar }, result.monthKey) : undefined;

  return (
    <div className="min-h-screen bg-[#060810] text-slate-100">
      <SiteHeader variant="marketing" />
      <MenuTabs active="monthly" />

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <header className="text-center">
          <p className="text-xs font-semibold tracking-[0.3em] text-sky-300/80">MONTHLY</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            <span className="bg-gradient-to-r from-sky-300 via-violet-200 to-sky-300 bg-clip-text text-transparent">
              이달의 운세
            </span>
          </h1>
          <p className="mt-2 text-sm text-white/55">내 사주로 계산한 한 달 흐름과 좋은 날·조심할 날</p>
        </header>

        {result ? (
          <div className="mt-8 space-y-4">
            {/* 이달의 기운(무료) */}
            <section className="rounded-3xl border border-sky-500/25 bg-gradient-to-b from-sky-950/40 to-black/50 p-5 text-center shadow-2xl shadow-black/40 sm:p-6">
              <p className="text-xs text-white/50">
                {name.trim() ? `${name.trim()} 님 · ` : ""}
                {result.year}년 {result.month}월 · 일간 {result.dayMaster.korean}
                {result.dayMaster.element}({result.dayMaster.hanja})
              </p>
              {/* 신년운세(한 해 흐름)와 달리 이 화면의 주인공은 날짜다 — 좋은 날·조심할 날 개수를 크게 */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-950/30 py-3">
                  <p className="text-[11px] text-emerald-200/70">{result.month}월 좋은 날</p>
                  <p className="text-3xl font-black text-emerald-200">{result.goodCount}일</p>
                </div>
                <div className="rounded-2xl border border-amber-400/30 bg-amber-950/30 py-3">
                  <p className="text-[11px] text-amber-200/70">{result.month}월 조심할 날</p>
                  <p className="text-3xl font-black text-amber-200">{result.cautionCount}일</p>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-white/45">
                🔒 그 날짜가 언제인지, 계약·고백·이사에 좋은 날은 상세 풀이에서 알려 드려요
              </p>
              <h2 className="mt-4 text-xl font-black text-violet-100">{result.title}</h2>
              <p className="text-[11px] text-white/40">
                {result.month}월 기운 {result.score}점 · {scoreLabel(result.score)}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                {result.keywords.map((k) => (
                  <span key={k} className="rounded-full bg-sky-500/15 px-2.5 py-1 text-[11px] text-sky-100">
                    #{k}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-left text-sm leading-relaxed text-white/75">{result.summary}</p>
              {result.note ? (
                <p className="mt-3 rounded-xl bg-white/[0.04] px-3 py-2.5 text-left text-[13px] leading-relaxed text-amber-100/90">
                  💡 {result.note}
                </p>
              ) : null}
            </section>

            {/* 상세 풀이(유료) — 결제 전에는 안내, 결제 후에는 풀이 */}
            {paid.paid && paid.paid.result.monthKey === result.monthKey ? (
              <MonthlyView paid={paid.paid} />
            ) : (
              <MonthlyPaywall
                result={result}
                onBuy={() =>
                  paid.startPurchase({ name: name.trim(), birthDate, calendarType: calendar, gender }, result.monthKey)
                }
                busy={paid.busy}
                error={paid.error}
                appNeedsUpdate={paid.app.isApp && !paid.app.canBuy}
                adminFree={paid.isAdmin}
                generating={paid.generating}
                alreadyOwned={!!owned}
              />
            )}

            <button
              type="button"
              onClick={() => {
                setResult(null);
                paid.clearPaid();
              }}
              className="w-full rounded-2xl border border-white/15 py-3 text-sm text-white/70 hover:border-white/30"
            >
              가족·친구 것도 보기
            </button>

            <Link
              href="/tools?tab=fortune"
              className="block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-xs text-white/60 hover:border-white/25"
            >
              매일의 흐름은 <span className="font-bold text-sky-200">오늘의 운세</span>에서 확인하세요 →
            </Link>
          </div>
        ) : (
          <section className="mt-8 rounded-3xl border border-sky-500/20 bg-gradient-to-b from-sky-950/30 to-black/40 p-5 shadow-2xl shadow-black/40 sm:p-6">
            {paid.generating ? (
              <div className="mb-4">
                <MonthlyWaiting />
              </div>
            ) : null}
            {paid.error ? (
              <p className="mb-4 rounded-xl bg-rose-500/10 px-3 py-2.5 text-center text-xs leading-relaxed text-rose-200">
                {paid.error}
              </p>
            ) : null}
            {paid.purchases.length > 0 ? (
              <div className="mb-4 rounded-2xl border border-sky-400/25 bg-sky-950/20 p-3">
                <p className="text-[11px] text-sky-200/80">구매한 상세 풀이 다시 보기</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {paid.purchases.map((purchase) => (
                    <button
                      key={`${purchase.savedAt}-${purchase.input.birthDate}`}
                      type="button"
                      disabled={paid.busy}
                      onClick={() => paid.reopen(purchase)}
                      className="rounded-full border border-sky-400/40 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-100 transition hover:bg-sky-500/20 disabled:opacity-50"
                    >
                      {Number(purchase.monthKey.slice(5))}월 · {purchase.input.name || "이름 없음"}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <ProfileQuickPicker
              draft={{ name, gender, birthDate, calendar }}
              onApply={applyProfile}
              source="monthly"
              accent="amber"
              className="mb-4"
            />

            <label className="block text-xs text-white/60">
              이름
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 20))}
                placeholder="홍길동"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-3 text-sm outline-none placeholder:text-white/25 focus:border-sky-400/60"
              />
            </label>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {(["male", "female"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setGender(value)}
                  className={`rounded-xl border py-2.5 text-sm transition ${
                    gender === value
                      ? "border-sky-400/60 bg-sky-500/15 text-sky-100"
                      : "border-white/15 text-white/50 hover:border-white/30"
                  }`}
                >
                  {value === "male" ? "남성" : "여성"}
                </button>
              ))}
            </div>

            <label className="mt-4 block text-xs text-white/60">
              생년월일 (8자리)
              <input
                value={birthDate}
                onChange={(e) => setBirthDate(formatBirthDate(e.target.value))}
                inputMode="numeric"
                placeholder="19900503"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-3 text-sm tracking-wider outline-none placeholder:text-white/25 focus:border-sky-400/60"
              />
            </label>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {(
                [
                  ["solar", "양력"],
                  ["lunar", "음력"],
                  ["lunar-leap", "음력 윤달"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCalendar(value)}
                  className={`rounded-xl border py-2 text-xs transition ${
                    calendar === value
                      ? "border-sky-400/60 bg-sky-500/15 text-sky-100"
                      : "border-white/15 text-white/50 hover:border-white/30"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}

            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-sky-600 via-sky-500 to-violet-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-900/40 transition hover:brightness-110 disabled:opacity-50"
            >
              {busy ? "한 달의 흐름을 읽는 중…" : "무료로 이달의 운세 보기"}
            </button>
            <p className="mt-2 text-center text-[11px] text-white/35">
              태어난 시간 없이 생년월일만으로 봅니다. 무료 결과는 서버에 저장하지 않습니다.
            </p>
          </section>
        )}
      </main>
      {paid.paymentModal}
    </div>
  );
}

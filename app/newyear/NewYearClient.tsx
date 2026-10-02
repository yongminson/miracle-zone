"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ProfileQuickPicker } from "@/components/profiles/ProfileQuickPicker";
import { logEvent, withShareUtm } from "@/lib/analytics";
import type { SavedProfile } from "@/lib/profiles/saved-profiles";
import type { NewYearCalendarType, NewYearResult } from "@/lib/newyear/newyear-types";
import { DetailPaywall, DetailView, useNewYearDetail } from "./NewYearDetail";
import { WeekLuck } from "@/components/calendar/WeekLuck";
import { ShareCardButton } from "./ShareCardButton";

/** 앱인토스에서는 명운 웹 주소로 보낸다 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

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

export function NewYearClient() {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [birthDate, setBirthDate] = useState("");
  const [calendar, setCalendar] = useState<NewYearCalendarType>("solar");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NewYearResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // 상세 풀이(유료). 결제에서 돌아오거나 다시 볼 때는 그 사람의 입력값으로 화면을 되살린다
  const paid = useNewYearDetail((input, restored) => {
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
      const res = await fetch(`${API_BASE}/api/newyear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate, calendarType: calendar, gender }),
      });
      const json = (await res.json()) as { success?: boolean; message?: string; result?: NewYearResult };
      if (!res.ok || !json.success || !json.result) {
        setError(json.message || "신년운세를 불러오지 못했습니다.");
        return;
      }
      setResult(json.result);
      void logEvent("newyear_result", { tenGod: json.result.tenGod, score: json.result.score });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("신년운세를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }, [birthDate, calendar, gender, name]);

  const share = useCallback(async () => {
    if (!result) return;
    const origin = API_BASE || window.location.origin;
    const url = withShareUtm(`${origin}/newyear`, "newyear");
    const text = `2027 정미년, 나는 "${result.title}"\n너의 2027년은 어떤 해일까?`;
    void logEvent("newyear_share", { tenGod: result.tenGod });
    try {
      if (navigator.share) {
        await navigator.share({ title: "2027 신년운세 — 명운", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setNotice("링크를 복사했습니다. 붙여넣어 공유해 보세요.");
    } catch {
      // 공유를 취소한 경우도 여기로 온다 — 알리지 않는다
    }
  }, [result]);

  return (
    <div className="min-h-screen bg-[#07060b] text-slate-100">
      <SiteHeader variant="marketing" />

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <header className="text-center">
          <p className="text-xs font-semibold tracking-[0.3em] text-rose-300/80">2027 丁未年</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            <span className="bg-gradient-to-r from-rose-300 via-amber-200 to-rose-300 bg-clip-text text-transparent">
              2027 신년운세
            </span>
          </h1>
          <p className="mt-2 text-sm text-white/55">붉은 양의 해, 나의 한 해 흐름과 좋은 달·조심할 달</p>
        </header>

        {result ? (
          <ResultView
            name={name.trim()}
            result={result}
            birthDate={birthDate}
            calendarType={calendar}
            onShare={share}
            notice={notice}
            onReset={() => {
              setResult(null);
              setNotice(null);
              paid.clearDetail();
            }}
            detailSlot={
              paid.detail ? (
                <DetailView detail={paid.detail} result={result} />
              ) : (
                <DetailPaywall
                  onBuy={() =>
                    paid.startPurchase({ name: name.trim(), birthDate, calendarType: calendar, gender })
                  }
                  busy={paid.busy}
                  error={paid.error}
                  appNeedsUpdate={paid.app.isApp && !paid.app.canBuy}
                  isToss={paid.isToss}
                  adminFree={paid.isAdmin}
                />
              )
            }
          />
        ) : (
          <section className="mt-8 rounded-3xl border border-rose-500/20 bg-gradient-to-b from-rose-950/30 to-black/40 p-5 shadow-2xl shadow-black/40 sm:p-6">
            {paid.busy ? (
              <p className="mb-4 rounded-xl bg-amber-500/10 px-3 py-2.5 text-center text-xs text-amber-200">
                결제를 확인하고 상세 풀이를 쓰는 중이에요… (최대 30초)
              </p>
            ) : null}
            {paid.error ? (
              <p className="mb-4 rounded-xl bg-rose-500/10 px-3 py-2.5 text-center text-xs leading-relaxed text-rose-200">
                {paid.error}
              </p>
            ) : null}
            {paid.purchases.length > 0 ? (
              <div className="mb-4 rounded-2xl border border-amber-400/25 bg-amber-950/20 p-3">
                <p className="text-[11px] text-amber-200/80">구매한 상세 풀이 다시 보기</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {paid.purchases.map((purchase) => (
                    <button
                      key={`${purchase.savedAt}-${purchase.input.birthDate}`}
                      type="button"
                      disabled={paid.busy}
                      onClick={() => paid.reopen(purchase)}
                      className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-100 transition hover:bg-amber-500/20 disabled:opacity-50"
                    >
                      {purchase.input.name || "이름 없음"} · {purchase.input.birthDate}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <ProfileQuickPicker
              draft={{ name, gender, birthDate, calendar }}
              onApply={applyProfile}
              source="newyear"
              accent="rose"
              className="mb-4"
            />

            <label className="block text-xs text-white/60">
              이름
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 20))}
                placeholder="홍길동"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-3 text-sm outline-none placeholder:text-white/25 focus:border-rose-400/60"
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
                      ? "border-rose-400/60 bg-rose-500/15 text-rose-100"
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
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-3 text-sm tracking-wider outline-none placeholder:text-white/25 focus:border-rose-400/60"
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
                      ? "border-rose-400/60 bg-rose-500/15 text-rose-100"
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
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-900/40 transition hover:brightness-110 disabled:opacity-50"
            >
              {busy ? "한 해의 흐름을 읽는 중…" : "무료로 2027년 운세 보기"}
            </button>
            <p className="mt-2 text-center text-[11px] text-white/35">
              태어난 시간 없이 생년월일만으로 봅니다. 입력한 정보는 서버에 저장하지 않습니다.
            </p>
          </section>
        )}
      </main>
      {paid.paymentModal}
    </div>
  );
}

function ResultView({
  name,
  result,
  onShare,
  onReset,
  notice,
  detailSlot,
  birthDate,
  calendarType,
}: {
  name: string;
  result: NewYearResult;
  birthDate: string;
  calendarType: NewYearCalendarType;
  onShare: () => void;
  onReset: () => void;
  notice: string | null;
  detailSlot: React.ReactNode;
}) {
  return (
    <div className="mt-8 space-y-4">
      {/* 한 해 총운 */}
      <section className="rounded-3xl border border-rose-500/25 bg-gradient-to-b from-rose-950/40 to-black/50 p-5 text-center shadow-2xl shadow-black/40 sm:p-6">
        <p className="text-xs text-white/50">
          {name ? `${name} 님 · ` : ""}
          {result.zodiac}띠 · 일간 {result.dayMaster.korean}
          {result.dayMaster.element}({result.dayMaster.hanja})
        </p>
        <p className="mt-3 text-5xl font-black text-rose-200">{result.score}</p>
        <p className="text-xs text-white/45">2027년 종합 · {scoreLabel(result.score)}</p>
        <h2 className="mt-4 text-2xl font-black text-amber-100">{result.title}</h2>
        <p className="mt-1 text-sm text-rose-200/80">{result.keyword}</p>
        <p className="mt-4 text-left text-sm leading-relaxed text-white/75">{result.summary}</p>
        <p className="mt-3 rounded-xl bg-white/[0.04] px-3 py-2.5 text-left text-[13px] leading-relaxed text-amber-100/90">
          💡 {result.advice}
        </p>
      </section>

      {/* 삼재·충·합 */}
      {result.flags.map((flag) => (
        <section
          key={flag.title}
          className={`rounded-2xl border p-4 ${
            flag.tone === "good"
              ? "border-emerald-400/30 bg-emerald-950/30"
              : flag.tone === "caution"
                ? "border-amber-400/30 bg-amber-950/30"
                : "border-white/15 bg-white/[0.03]"
          }`}
        >
          <p className="text-sm font-bold text-white/90">{flag.title}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-white/65">{flag.text}</p>
        </section>
      ))}

      {/* 좋은 달·조심할 달 */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-emerald-400/25 bg-emerald-950/25 p-4 text-center">
          <p className="text-[11px] text-emerald-200/70">좋은 달</p>
          <p className="mt-1 text-xl font-black text-emerald-200">{result.bestMonths.map((m) => `${m}월`).join(" · ")}</p>
        </div>
        <div className="rounded-2xl border border-amber-400/25 bg-amber-950/25 p-4 text-center">
          <p className="text-[11px] text-amber-200/70">조심할 달</p>
          <p className="mt-1 text-xl font-black text-amber-200">{result.cautionMonths.map((m) => `${m}월`).join(" · ")}</p>
        </div>
      </section>

      {/* 2027년을 기다리는 동안 — 이번 주 나의 흐름 */}
      <WeekLuck birthDate={birthDate} calendarType={calendarType} source="newyear" />

      {/* 월별 흐름 */}
      <section className="rounded-3xl border border-white/10 bg-black/40 p-4 sm:p-5">
        <h3 className="text-sm font-bold text-white/85">월별 흐름</h3>
        <ul className="mt-3 space-y-2.5">
          {result.months.map((month) => (
            <li key={month.month} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="w-9 shrink-0 text-sm font-bold text-white/85">{month.month}월</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full ${
                      month.tag === "good"
                        ? "bg-emerald-400"
                        : month.tag === "caution"
                          ? "bg-amber-400"
                          : "bg-rose-300/70"
                    }`}
                    style={{ width: `${month.score}%` }}
                  />
                </div>
                <span className="w-7 shrink-0 text-right text-xs text-white/55">{month.score}</span>
                {month.tag ? (
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      month.tag === "good" ? "bg-emerald-500/20 text-emerald-200" : "bg-amber-500/20 text-amber-200"
                    }`}
                  >
                    {month.tag === "good" ? "좋음" : "조심"}
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 pl-11 text-xs leading-relaxed text-white/60">{month.line}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-relaxed text-white/35">
          월은 양력 기준이며, 사주에서는 절기(입춘 등)로 달이 바뀝니다. 1월은 아직 2026년 기운이 이어지는 달입니다.
        </p>
      </section>

      {/* 상세 풀이(유료) — 결제 전에는 안내, 결제 후에는 풀이 */}
      {detailSlot}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onShare}
          className="rounded-2xl bg-gradient-to-r from-rose-600 to-amber-500 py-3 text-sm font-bold text-white"
        >
          친구에게 공유하기
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-2xl border border-white/15 py-3 text-sm text-white/70 hover:border-white/30"
        >
          다른 사람 보기
        </button>
      </div>
      <ShareCardButton result={result} />
      {notice ? <p className="text-center text-xs text-amber-200/90">{notice}</p> : null}

      <Link
        href="/tools?tab=fortune"
        className="block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-xs text-white/60 hover:border-white/25"
      >
        한 해 흐름은 매일 쌓입니다 — <span className="font-bold text-amber-200">오늘의 운세</span> 보러 가기 →
      </Link>
    </div>
  );
}

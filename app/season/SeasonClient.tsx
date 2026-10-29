"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MenuTabs } from "@/components/layout/MenuTabs";
import { ProfileQuickPicker } from "@/components/profiles/ProfileQuickPicker";
import { logEvent } from "@/lib/analytics";
import type { SavedProfile } from "@/lib/profiles/saved-profiles";
import type { NewYearCalendarType } from "@/lib/newyear/newyear-types";
import { PaidWaiting, usePaidProduct } from "@/lib/paid/use-paid-product";
import {
  SEASONS,
  SEASON_ORDER_NAME,
  SEASON_PRICE_WON,
  SEASON_PRODUCT_ID,
  type SeasonInput,
  type SeasonPaid,
  type SeasonPerson,
  type SeasonPreview,
} from "@/lib/season/season-types";

/** 숫자만 받아 YYYY-MM-DD 로 맞춘다 (19900503 → 1990-05-03) */
function formatDate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function dateLabel(date: string, weekday?: string) {
  const [, m, d] = date.split("-").map(Number);
  return `${m}월 ${d}일${weekday ? `(${weekday})` : ""}`;
}

const TONE: Record<string, { label: string; cls: string }> = {
  good: { label: "힘이 실리는 날", cls: "text-emerald-200" },
  normal: { label: "무난한 날", cls: "text-sky-200" },
  caution: { label: "차분함이 필요한 날", cls: "text-amber-200" },
};

const sameKey = (i: SeasonInput) => `${i.season}|${i.person.birthDate}${i.person.calendarType}|${i.eventDate}`;

export function SeasonClient() {
  const season = "exam" as const;
  const [person, setPerson] = useState<SeasonPerson>({ name: "", birthDate: "", calendarType: "solar", gender: "male" });
  const [eventDate, setEventDate] = useState(SEASONS.exam.defaultDate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<SeasonPreview | null>(null);
  const [input, setInput] = useState<SeasonInput | null>(null);

  const paid = usePaidProduct<SeasonInput, SeasonPaid>(
    {
      product: "season_luck",
      googleProductId: SEASON_PRODUCT_ID,
      priceWon: SEASON_PRICE_WON,
      endpoint: "/api/season/detail",
      storageKey: "myeongun_season",
      appUaToken: "MyeongunIAP/season",
      productName: SEASON_ORDER_NAME,
      description: "시험 날 흐름, 집중하기 좋은 날과 컨디션을 지킬 날, D-day 준비 계획을 바로 보여 드립니다.",
      sameKey,
    },
    (result) => {
      setPreview(result.preview);
      setInput(result.input);
      setPerson(result.input.person);
      setEventDate(result.input.eventDate);
    },
  );

  const applyProfile = useCallback((profile: SavedProfile) => {
    setPerson({ name: profile.name, birthDate: profile.birthDate, calendarType: profile.calendar, gender: profile.gender });
  }, []);

  const submit = useCallback(async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(person.birthDate)) {
      setError("수험생 생년월일 8자리를 입력해 주세요. 예) 20080503");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
      setError("시험 날짜 8자리를 입력해 주세요. 예) 20261119");
      return;
    }
    const next: SeasonInput = { season, person, eventDate };
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/season", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: next }),
      });
      const json = (await res.json()) as { success?: boolean; message?: string; preview?: SeasonPreview };
      if (!res.ok || !json.success || !json.preview) {
        setError(json.message || "시험 합격운을 계산하지 못했습니다.");
        return;
      }
      setPreview(json.preview);
      setInput(next);
      void logEvent("season_result", { season, dDay: json.preview.dDay, tone: json.preview.eventTone });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("계산하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }, [eventDate, person, season]);

  const result = paid.paid;
  const owned = input ? !!paid.owned(input) : false;

  return (
    <div className="min-h-screen bg-[#08070d] text-slate-100">
      <SiteHeader variant="marketing" />
      <MenuTabs active="season" />

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <header className="text-center">
          <p className="text-xs font-semibold tracking-[0.3em] text-indigo-300/80">SEASON</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            <span className="bg-gradient-to-r from-indigo-300 via-amber-200 to-indigo-300 bg-clip-text text-transparent">
              {SEASONS.exam.emoji} 시험 합격운
            </span>
          </h1>
          <p className="mt-2 text-sm text-white/55">수능·공무원·자격증 — 시험 날 흐름과 남은 기간 준비 계획</p>
        </header>

        {preview && input ? (
          <div className="mt-8 space-y-4">
            <section className="rounded-3xl border border-indigo-500/25 bg-gradient-to-b from-indigo-950/40 to-black/50 p-5 text-center">
              <p className="text-xs text-white/50">
                {input.person.name ? `${input.person.name} · ` : ""}시험 {dateLabel(preview.eventDate)}
              </p>
              <p className="mt-2 text-5xl font-black text-indigo-200">D-{preview.dDay}</p>
              <p className={`mt-3 text-lg font-black ${TONE[preview.eventTone]?.cls ?? ""}`}>
                시험 날은 {TONE[preview.eventTone]?.label}
              </p>
              <p className="mt-1 text-sm text-white/65">“{preview.eventTitle}”</p>
              <p className="mt-3 text-[11px] text-white/45">
                🔒 시험 전까지 집중하기 좋은 날 {preview.focusCount}일 — 날짜와 준비 계획은 상세 풀이에서
              </p>
            </section>

            {result ? (
              <div className="space-y-4">
                <section className="rounded-3xl border border-indigo-400/30 bg-gradient-to-b from-indigo-950/40 to-black/40 p-5">
                  <p className="text-center text-lg font-black text-amber-100">“{result.detail.cheer}”</p>
                  <p className="mt-3 text-sm leading-relaxed text-white/75">{result.detail.overview}</p>
                </section>
                <section className="rounded-3xl border border-white/10 bg-black/40 p-4">
                  <h3 className="text-sm font-bold text-white/85">📍 시험 당일 ({dateLabel(result.eventDay.date, result.eventDay.weekday)})</h3>
                  <p className="mt-1.5 text-xs text-white/55">
                    {result.eventDay.title} · {result.eventDay.action}
                  </p>
                  <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-white/80">
                    {result.detail.eventDayTips.map((t) => (
                      <li key={t}>✅ {t}</li>
                    ))}
                  </ul>
                </section>
                <section className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-950/15 p-4">
                    <h3 className="text-sm font-bold text-emerald-200">🔥 집중하기 좋은 날</h3>
                    <p className="mt-0.5 text-[11px] text-white/45">실전 모의고사·어려운 단원에 힘을 쓰세요</p>
                    <div className="mt-2 space-y-1">
                      {result.focusDays.length ? (
                        result.focusDays.map((d) => (
                          <p key={d.date} className="text-[13px] text-white/80">
                            <span className="font-bold text-emerald-100">{dateLabel(d.date, d.weekday)}</span> · {d.title}
                          </p>
                        ))
                      ) : (
                        <p className="text-[13px] text-white/60">남은 기간이 짧아요. 매일 같은 리듬을 지키는 게 가장 좋아요.</p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-950/15 p-4">
                    <h3 className="text-sm font-bold text-amber-200">🌙 컨디션을 지킬 날</h3>
                    <p className="mt-0.5 text-[11px] text-white/45">무리하지 말고 오답 정리·일찍 자기</p>
                    <div className="mt-2 space-y-1">
                      {result.restDays.length ? (
                        result.restDays.map((d) => (
                          <p key={d.date} className="text-[13px] text-white/80">
                            <span className="font-bold text-amber-100">{dateLabel(d.date, d.weekday)}</span> · {d.title}
                          </p>
                        ))
                      ) : (
                        <p className="text-[13px] text-white/60">크게 흔들리는 날은 없어요.</p>
                      )}
                    </div>
                  </div>
                </section>
                <section className="rounded-3xl border border-white/10 bg-black/40 p-4">
                  <h3 className="text-sm font-bold text-white/85">🗓 D-day 준비 계획</h3>
                  <div className="mt-2 space-y-2">
                    {result.detail.plan.map((p) => (
                      <div key={p.label} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                        <p className="text-xs font-bold text-indigo-200">{p.label}</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-white/75">{p.text}</p>
                      </div>
                    ))}
                  </div>
                </section>
                <p className="text-center text-[11px] text-white/35">
                  {dateLabel(result.detail.start)} 기준이에요. 운세는 결과를 정하지 않아요 — 준비한 만큼 해내실 거예요.
                </p>
              </div>
            ) : (
              <section className="rounded-3xl border border-indigo-400/30 bg-gradient-to-b from-indigo-950/40 to-violet-950/30 p-5 text-center">
                <p className="text-xs font-semibold tracking-widest text-indigo-300/80">상세 풀이</p>
                <h3 className="mt-1 text-lg font-black text-indigo-100">시험까지 남은 {preview.dDay}일, 어떻게 쓸까?</h3>
                <ul className="mx-auto mt-3 max-w-xs space-y-1.5 text-left text-[13px] text-white/70">
                  <li>✦ 시험 당일 흐름과 실수 줄이는 팁</li>
                  <li>✦ 집중하기 좋은 날 · 컨디션을 지킬 날</li>
                  <li>✦ D-day 구간별 준비 계획</li>
                  <li>✦ 응원 한마디 · 언제든 다시 보기</li>
                </ul>
                {paid.app.isApp && !paid.app.canBuy ? (
                  <a
                    href="https://play.google.com/store/apps/details?id=kr.co.ymstudio.myeongun"
                    className="mt-4 block rounded-2xl border border-indigo-400/40 py-3 text-sm font-bold text-indigo-200"
                  >
                    앱 업데이트 후 볼 수 있어요 →
                  </a>
                ) : paid.generating ? (
                  <PaidWaiting steps={["결제를 확인했어요", "시험 날까지 하루씩 계산하고 있어요", "준비 계획을 쓰고 있어요"]} seconds={10} />
                ) : (
                  <button
                    type="button"
                    disabled={paid.busy}
                    onClick={() => paid.startPurchase(input)}
                    className="mt-4 w-full rounded-2xl bg-gradient-to-r from-indigo-400 via-violet-300 to-amber-200 py-3.5 text-sm font-black text-stone-950 shadow-lg shadow-indigo-900/40 transition hover:brightness-105 disabled:opacity-60"
                  >
                    {paid.busy
                      ? "결제 진행 중…"
                      : owned
                        ? "✓ 구매한 합격운 다시 보기 (추가 결제 없음)"
                        : paid.isAdmin
                          ? "⚡ [운영자] 무료로 합격운 보기"
                          : `시험 합격운 상세 보기 · ${SEASON_PRICE_WON.toLocaleString()}원`}
                  </button>
                )}
                {paid.error ? <p className="mt-3 text-xs leading-relaxed text-rose-300">{paid.error}</p> : null}
              </section>
            )}

            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setInput(null);
                paid.clearPaid();
              }}
              className="w-full rounded-2xl border border-white/15 py-3 text-sm text-white/70 hover:border-white/30"
            >
              다른 수험생·다른 시험 보기
            </button>
            <Link href="/taekil" className="block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-xs text-white/60">
              면접·발표 날짜를 고른다면 <span className="font-bold text-emerald-200">좋은 날 고르기(택일)</span> →
            </Link>
          </div>
        ) : (
          <section className="mt-8 space-y-4 rounded-3xl border border-indigo-500/20 bg-gradient-to-b from-indigo-950/30 to-black/40 p-5">
            {paid.generating ? <PaidWaiting steps={["결제를 확인했어요", "합격운을 계산하고 있어요"]} seconds={10} /> : null}
            {paid.error ? <p className="rounded-xl bg-rose-500/10 px-3 py-2.5 text-center text-xs text-rose-200">{paid.error}</p> : null}
            {paid.purchases.length ? (
              <div className="rounded-2xl border border-indigo-400/25 bg-indigo-950/20 p-3">
                <p className="text-[11px] text-indigo-200/80">구매한 합격운 다시 보기</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {paid.purchases.map((p) => (
                    <button
                      key={p.savedAt}
                      type="button"
                      disabled={paid.busy}
                      onClick={() => paid.reopen(p)}
                      className="rounded-full border border-indigo-400/40 bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-100 disabled:opacity-50"
                    >
                      {p.input.person.name || "수험생"} · {dateLabel(p.input.eventDate)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <ProfileQuickPicker
              draft={{ name: person.name, gender: person.gender, birthDate: person.birthDate, calendar: person.calendarType }}
              onApply={applyProfile}
              source="season"
              accent="amber"
            />
            <p className="text-[11px] text-white/45">부모님이 자녀 것을 볼 때는 수험생(자녀) 정보를 넣어 주세요.</p>
            <input
              value={person.name}
              onChange={(e) => setPerson({ ...person, name: e.target.value.slice(0, 20) })}
              placeholder="수험생 이름"
              className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-3 text-sm outline-none placeholder:text-white/25 focus:border-indigo-400/60"
            />
            <div className="grid grid-cols-2 gap-2">
              {(["male", "female"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setPerson({ ...person, gender: g })}
                  className={`rounded-xl border py-2.5 text-sm ${person.gender === g ? "border-indigo-400/60 bg-indigo-500/15 text-indigo-100" : "border-white/15 text-white/50"}`}
                >
                  {g === "male" ? "남성" : "여성"}
                </button>
              ))}
            </div>
            <input
              value={person.birthDate}
              onChange={(e) => setPerson({ ...person, birthDate: formatDate(e.target.value) })}
              inputMode="numeric"
              placeholder="생년월일 8자리 (20080503)"
              className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-3 text-sm tracking-wider outline-none placeholder:text-white/25 focus:border-indigo-400/60"
            />
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["solar", "양력"],
                  ["lunar", "음력"],
                  ["lunar-leap", "음력 윤달"],
                ] as const
              ).map(([c, label]) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPerson({ ...person, calendarType: c as NewYearCalendarType })}
                  className={`rounded-xl border py-2 text-xs ${person.calendarType === c ? "border-indigo-400/60 bg-indigo-500/15 text-indigo-100" : "border-white/15 text-white/50"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="block text-xs text-white/60">
              {SEASONS.exam.dateLabel} (수능은 2026년 11월 19일)
              <input
                value={eventDate}
                onChange={(e) => setEventDate(formatDate(e.target.value))}
                inputMode="numeric"
                placeholder="20261119"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-3 text-sm tracking-wider outline-none placeholder:text-white/25 focus:border-indigo-400/60"
              />
            </label>

            {error ? <p className="text-xs text-rose-300">{error}</p> : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-900/40 disabled:opacity-50"
            >
              {busy ? "시험 날 흐름을 읽는 중…" : "무료로 시험 날 흐름 보기"}
            </button>
            <p className="text-center text-[11px] text-white/35">태어난 시간 없이 생년월일만으로 봅니다. 무료 결과는 서버에 저장하지 않습니다.</p>
          </section>
        )}
      </main>
      {paid.paymentModal}
    </div>
  );
}

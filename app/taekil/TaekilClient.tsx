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
  TAEKIL_ORDER_NAME,
  TAEKIL_PRICE_WON,
  TAEKIL_PRODUCT_ID,
  TAEKIL_PURPOSES,
  type TaekilInput,
  type TaekilPaid,
  type TaekilPerson,
  type TaekilPreview,
  type TaekilPurpose,
} from "@/lib/taekil/taekil-types";

/** 숫자만 받아 YYYY-MM-DD 로 맞춘다 (19900503 → 1990-05-03) */
function formatBirthDate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function kstMonth(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date()).slice(0, 7);
}

function dateLabel(date: string, weekday?: string) {
  const [, m, d] = date.split("-").map(Number);
  return `${m}월 ${d}일${weekday ? `(${weekday})` : ""}`;
}

const sameKey = (i: TaekilInput) => `${i.purpose}|${i.a.birthDate}${i.a.calendarType}|${i.b ? `${i.b.birthDate}${i.b.calendarType}` : ""}|${i.month}`;

const EMPTY: TaekilPerson = { name: "", birthDate: "", calendarType: "solar", gender: "male" };

function PersonFields({
  value,
  onChange,
  title,
}: {
  value: TaekilPerson;
  onChange: (v: TaekilPerson) => void;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
      <p className="text-xs font-bold text-white/70">{title}</p>
      <input
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value.slice(0, 20) })}
        placeholder="이름"
        className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm outline-none placeholder:text-white/25 focus:border-emerald-400/60"
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        {(["male", "female"] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onChange({ ...value, gender: g })}
            className={`rounded-xl border py-2 text-xs ${value.gender === g ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-100" : "border-white/15 text-white/50"}`}
          >
            {g === "male" ? "남성" : "여성"}
          </button>
        ))}
      </div>
      <input
        value={value.birthDate}
        onChange={(e) => onChange({ ...value, birthDate: formatBirthDate(e.target.value) })}
        inputMode="numeric"
        placeholder="생년월일 8자리 (19900503)"
        className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm tracking-wider outline-none placeholder:text-white/25 focus:border-emerald-400/60"
      />
      <div className="mt-2 grid grid-cols-3 gap-2">
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
            onClick={() => onChange({ ...value, calendarType: c as NewYearCalendarType })}
            className={`rounded-xl border py-1.5 text-[11px] ${value.calendarType === c ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-100" : "border-white/15 text-white/50"}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TaekilClient() {
  const [purpose, setPurpose] = useState<TaekilPurpose>("move");
  const [me, setMe] = useState<TaekilPerson>(EMPTY);
  const [withOther, setWithOther] = useState(false);
  const [other, setOther] = useState<TaekilPerson>({ ...EMPTY, gender: "female" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<TaekilPreview | null>(null);
  const [input, setInput] = useState<TaekilInput | null>(null);

  const paid = usePaidProduct<TaekilInput, TaekilPaid>(
    {
      product: "taekil",
      googleProductId: TAEKIL_PRODUCT_ID,
      priceWon: TAEKIL_PRICE_WON,
      endpoint: "/api/taekil/detail",
      storageKey: "myeongun_taekil",
      appUaToken: "MyeongunIAP/taekil",
      productName: TAEKIL_ORDER_NAME,
      description: "앞으로 3개월 중 목적에 맞는 좋은 날 순위와 피할 날을 바로 보여 드립니다.",
      sameKey,
    },
    (result) => {
      setPreview(result.preview);
      setInput(result.input);
      setPurpose(result.input.purpose);
      setMe(result.input.a);
      if (result.input.b) {
        setWithOther(true);
        setOther(result.input.b);
      }
    },
  );

  const applyProfile = useCallback((profile: SavedProfile) => {
    setMe({ name: profile.name, birthDate: profile.birthDate, calendarType: profile.calendar, gender: profile.gender });
  }, []);

  const submit = useCallback(async () => {
    const valid = (p: TaekilPerson) => /^\d{4}-\d{2}-\d{2}$/.test(p.birthDate);
    if (!valid(me) || (withOther && !valid(other))) {
      setError("생년월일 8자리를 입력해 주세요. 예) 19900503");
      return;
    }
    const next: TaekilInput = { purpose, a: me, b: withOther ? other : null, month: kstMonth() };
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/taekil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: next }),
      });
      const json = (await res.json()) as { success?: boolean; message?: string; preview?: TaekilPreview };
      if (!res.ok || !json.success || !json.preview) {
        setError(json.message || "좋은 날을 계산하지 못했습니다.");
        return;
      }
      setPreview(json.preview);
      setInput(next);
      void logEvent("taekil_result", { purpose, together: withOther, candidates: json.preview.candidateCount });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("좋은 날을 계산하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }, [me, other, purpose, withOther]);

  const result = paid.paid;
  const owned = input ? !!paid.owned(input) : false;

  return (
    <div className="min-h-screen bg-[#05090a] text-slate-100">
      <SiteHeader variant="marketing" />
      <MenuTabs active="taekil" />

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <header className="text-center">
          <p className="text-xs font-semibold tracking-[0.3em] text-emerald-300/80">택일 擇日</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-300 bg-clip-text text-transparent">좋은 날 고르기</span>
          </h1>
          <p className="mt-2 text-sm text-white/55">이사·계약·고백·결혼… 앞으로 3개월 중 나에게 좋은 날</p>
        </header>

        {preview && input ? (
          <div className="mt-8 space-y-4">
            <section className="rounded-3xl border border-emerald-500/25 bg-gradient-to-b from-emerald-950/40 to-black/50 p-5 text-center">
              <p className="text-xs text-white/50">
                {TAEKIL_PURPOSES.find((p) => p.key === preview.purpose)?.emoji} {preview.label} · {dateLabel(preview.start)} ~ {dateLabel(preview.end)}
                {preview.together ? " · 두 사람 기준" : ""}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-950/30 py-3">
                  <p className="text-[11px] text-emerald-200/70">{preview.label}에 좋은 날</p>
                  <p className="text-3xl font-black text-emerald-200">{preview.candidateCount}일</p>
                  <p className="text-[10px] text-white/40">앞으로 90일 중</p>
                </div>
                <div className="rounded-2xl border border-amber-400/30 bg-amber-950/30 py-3">
                  <p className="text-[11px] text-amber-200/70">꼭 피할 날</p>
                  <p className="text-3xl font-black text-amber-200">{Math.min(3, preview.avoidCount)}일</p>
                  <p className="text-[10px] text-white/40">날짜는 결과에서</p>
                </div>
              </div>
            </section>

            {result ? (
              <div className="space-y-4">
                <section className="rounded-3xl border border-emerald-400/30 bg-gradient-to-b from-emerald-950/40 to-black/40 p-5">
                  <p className="text-center text-lg font-black text-emerald-100">“{result.detail.motto}”</p>
                  <p className="mt-3 text-sm leading-relaxed text-white/75">{result.detail.overview}</p>
                </section>
                <section className="space-y-2">
                  {result.ranked.map((d, i) => (
                    <div key={d.date} className="rounded-2xl border border-emerald-400/20 bg-black/40 p-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400 text-xs font-black text-stone-950">{i + 1}</span>
                        <p className="text-base font-black text-emerald-100">{dateLabel(d.date, d.weekday)}</p>
                        <span className="ml-auto text-xs text-white/40">{d.score}점</span>
                      </div>
                      <p className="mt-2 text-xs text-white/55">{d.title} · {d.why}</p>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-white/80">
                        💡 {result.detail.tips.find((t) => t.date === d.date)?.tip}
                      </p>
                    </div>
                  ))}
                </section>
                {result.avoid.length ? (
                  <section className="rounded-3xl border border-amber-400/20 bg-amber-950/15 p-4">
                    <h3 className="text-sm font-bold text-amber-200">⚠️ 가능하면 피할 날</h3>
                    <div className="mt-2 space-y-1.5">
                      {result.avoid.map((d) => (
                        <p key={d.date} className="text-[13px] text-white/75">
                          <span className="font-bold text-amber-100">{dateLabel(d.date, d.weekday)}</span> · {d.why}
                        </p>
                      ))}
                    </div>
                  </section>
                ) : null}
                <section className="rounded-3xl border border-white/10 bg-black/40 p-4">
                  <h3 className="text-sm font-bold text-white/85">🗂 그날까지 준비할 것</h3>
                  <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-white/75">
                    {result.detail.prepare.map((p) => (
                      <li key={p}>· {p}</li>
                    ))}
                  </ul>
                </section>
                <p className="text-center text-[11px] text-white/35">
                  {dateLabel(result.detail.start)}에 고른 결과예요. 건강·법률·투자 판단은 꼭 전문가와 상의하세요.
                </p>
              </div>
            ) : (
              <section className="rounded-3xl border border-emerald-400/30 bg-gradient-to-b from-emerald-950/40 to-teal-950/30 p-5 text-center">
                <p className="text-xs font-semibold tracking-widest text-emerald-300/80">택일 결과</p>
                <h3 className="mt-1 text-lg font-black text-emerald-100">가장 좋은 날 1~5순위</h3>
                <div className="mx-auto mt-3 max-w-xs space-y-1.5 blur-[3px]" aria-hidden>
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="rounded-xl bg-white/10 py-2 text-xs text-white/60">
                      {n}순위 · ○월 ○○일(○) · ○○점
                    </div>
                  ))}
                </div>
                <ul className="mx-auto mt-3 max-w-xs space-y-1.5 text-left text-[13px] text-white/70">
                  <li>✦ 좋은 날 1~5순위와 그 이유</li>
                  <li>✦ 날짜마다 그날 할 때의 조언</li>
                  <li>✦ 가능하면 피할 날</li>
                  <li>✦ 그날까지 준비할 것</li>
                </ul>
                {paid.app.isApp && !paid.app.canBuy ? (
                  <a
                    href="https://play.google.com/store/apps/details?id=kr.co.ymstudio.myeongun"
                    className="mt-4 block rounded-2xl border border-emerald-400/40 py-3 text-sm font-bold text-emerald-200"
                  >
                    앱 업데이트 후 볼 수 있어요 →
                  </a>
                ) : paid.generating ? (
                  <PaidWaiting steps={["결제를 확인했어요", "앞으로 90일을 하루씩 계산하고 있어요", "목적에 맞는 날을 고르고 있어요", "날짜별 조언을 쓰고 있어요"]} seconds={10} />
                ) : (
                  <button
                    type="button"
                    disabled={paid.busy}
                    onClick={() => paid.startPurchase(input)}
                    className="mt-4 w-full rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300 py-3.5 text-sm font-black text-stone-950 shadow-lg shadow-emerald-900/40 transition hover:brightness-105 disabled:opacity-60"
                  >
                    {paid.busy
                      ? "결제 진행 중…"
                      : owned
                        ? "✓ 구매한 택일 결과 다시 보기 (추가 결제 없음)"
                        : paid.isAdmin
                          ? "⚡ [운영자] 무료로 택일 결과 보기"
                          : `좋은 날 순위 보기 · ${TAEKIL_PRICE_WON.toLocaleString()}원`}
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
              다른 목적·다른 사람으로 고르기
            </button>
            <Link href="/monthly" className="block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-xs text-white/60">
              이번 달 날마다의 흐름은 <span className="font-bold text-sky-200">이달의 운세</span>에서 →
            </Link>
          </div>
        ) : (
          <section className="mt-8 space-y-4 rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-950/30 to-black/40 p-5">
            {paid.generating ? <PaidWaiting steps={["결제를 확인했어요", "좋은 날을 고르고 있어요"]} seconds={10} /> : null}
            {paid.error ? <p className="rounded-xl bg-rose-500/10 px-3 py-2.5 text-center text-xs text-rose-200">{paid.error}</p> : null}
            {paid.purchases.length ? (
              <div className="rounded-2xl border border-emerald-400/25 bg-emerald-950/20 p-3">
                <p className="text-[11px] text-emerald-200/80">구매한 택일 다시 보기</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {paid.purchases.map((p) => (
                    <button
                      key={p.savedAt}
                      type="button"
                      disabled={paid.busy}
                      onClick={() => paid.reopen(p)}
                      className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-100 disabled:opacity-50"
                    >
                      {TAEKIL_PURPOSES.find((x) => x.key === p.input.purpose)?.label} · {p.input.a.name || "나"}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <p className="text-xs text-white/60">무엇을 할 날을 고를까요?</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {TAEKIL_PURPOSES.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPurpose(p.key)}
                    className={`rounded-xl border px-2 py-2.5 text-xs ${purpose === p.key ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-100" : "border-white/15 text-white/55"}`}
                  >
                    {p.emoji} {p.label}
                  </button>
                ))}
              </div>
            </div>

            <ProfileQuickPicker
              draft={{ name: me.name, gender: me.gender, birthDate: me.birthDate, calendar: me.calendarType }}
              onApply={applyProfile}
              source="taekil"
              accent="amber"
            />
            <PersonFields title="나" value={me} onChange={setMe} />

            <label className="flex items-center gap-2 text-xs text-white/70">
              <input type="checkbox" checked={withOther} onChange={(e) => setWithOther(e.target.checked)} />
              함께하는 사람도 넣기 (결혼·이사·여행 등 — 두 사람 모두 좋은 날)
            </label>
            {withOther ? <PersonFields title="함께하는 사람" value={other} onChange={setOther} /> : null}

            {error ? <p className="text-xs text-rose-300">{error}</p> : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/40 disabled:opacity-50"
            >
              {busy ? "90일을 하루씩 계산하는 중…" : "무료로 좋은 날 찾아보기"}
            </button>
            <p className="text-center text-[11px] text-white/35">태어난 시간 없이 생년월일만으로 봅니다. 무료 결과는 서버에 저장하지 않습니다.</p>
          </section>
        )}
      </main>
      {paid.paymentModal}
    </div>
  );
}

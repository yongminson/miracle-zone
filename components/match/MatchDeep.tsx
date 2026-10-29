"use client";

import { useRef } from "react";
import { PaidWaiting, usePaidProduct } from "@/lib/paid/use-paid-product";
import {
  MATCH_DEEP_ORDER_NAME,
  MATCH_DEEP_PRICE_WON,
  MATCH_DEEP_PRODUCT_ID,
  MATCH_RELATIONS,
  type MatchDeepInput,
  type MatchDeepPaid,
} from "@/lib/match/match-deep-types";

/**
 * 궁합 심층 풀이(유료 2,200원) — 도구 화면 궁합 탭의 무료 결과 아래에 붙는다.
 * 모바일 결제는 /tools 로 돌아오므로, 풀이가 도착하면 궁합 탭으로 옮겨 보여 준다(onShow).
 */

type Info = { name: string; gender: string; calendar: string; birthDate: string };

function toInput(my: Info, partner: Info, relationship: string): MatchDeepInput {
  const person = (i: Info) => ({
    name: i.name.trim().slice(0, 20),
    birthDate: i.birthDate.trim(),
    calendarType: (i.calendar === "lunar" || i.calendar === "lunar-leap" ? i.calendar : "solar") as MatchDeepInput["a"]["calendarType"],
    gender: (i.gender === "female" ? "female" : "male") as MatchDeepInput["a"]["gender"],
  });
  return { a: person(my), b: person(partner), relationship };
}

const sameKey = (i: MatchDeepInput) =>
  [`${i.a.birthDate}${i.a.calendarType}`, `${i.b.birthDate}${i.b.calendarType}`].sort().join("|") + `|${i.relationship}`;

function dayLabel(date: string) {
  const [, m, d] = date.split("-").map(Number);
  const w = ["일", "월", "화", "수", "목", "금", "토"][new Date(`${date}T12:00:00+09:00`).getDay()];
  return `${m}월 ${d}일(${w})`;
}

export function MatchDeep({
  myInfo,
  partnerInfo,
  relationshipType,
  hasFreeResult,
  onShow,
}: {
  myInfo: Info;
  partnerInfo: Info;
  relationshipType: string;
  hasFreeResult: boolean;
  onShow: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const deep = usePaidProduct<MatchDeepInput, MatchDeepPaid>(
    {
      product: "match_deep",
      googleProductId: MATCH_DEEP_PRODUCT_ID,
      priceWon: MATCH_DEEP_PRICE_WON,
      endpoint: "/api/match/deep",
      storageKey: "myeongun_match_deep",
      appUaToken: "MyeongunIAP/match",
      productName: MATCH_DEEP_ORDER_NAME,
      description: "두 사람의 사주로 계산한 성격·돈·애정·미래 궁합과 함께하면 좋은 날을 바로 보여 드립니다.",
      sameKey,
    },
    () => {
      onShow();
      window.setTimeout(() => boxRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    },
  );

  const paid = deep.paid;
  if (!paid && !hasFreeResult && !deep.generating && !deep.error) return deep.paymentModal;

  const input = toInput(myInfo, partnerInfo, relationshipType);
  const owned = !!deep.owned(input);
  const aName = paid?.input.a.name || "나";
  const bName = paid?.input.b.name || "상대";

  return (
    <div ref={boxRef} id="match-deep" className="mx-auto mt-6 w-full max-w-md scroll-mt-24">
      {paid ? (
        <div className="space-y-4 text-left">
          <section className="rounded-3xl border border-pink-400/30 bg-gradient-to-b from-pink-950/40 to-black/40 p-5">
            <p className="text-center text-xs font-semibold tracking-widest text-pink-300/80">
              궁합 심층 풀이 · {MATCH_RELATIONS[paid.input.relationship] ?? "연인"}
            </p>
            <p className="mt-1 text-center text-sm text-white/60">
              {aName} ♥ {bName} · {paid.calc.score}점 {paid.calc.grade}
            </p>
            <p className="mt-2 text-center text-lg font-black text-pink-100">“{paid.detail.motto}”</p>
            <p className="mt-4 text-sm leading-relaxed text-white/75">{paid.detail.overview}</p>
          </section>

          <section className="grid gap-3">
            {paid.detail.areas.map((a) => (
              <div key={a.key} className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="text-sm font-bold text-pink-200">{a.label}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{a.summary}</p>
                {a.tip ? <p className="mt-2 text-xs leading-relaxed text-emerald-200/90">✅ {a.tip}</p> : null}
              </div>
            ))}
          </section>

          <section className="rounded-3xl border border-emerald-400/20 bg-emerald-950/15 p-4">
            <h3 className="text-sm font-bold text-emerald-200">💞 잘 맞는 점</h3>
            <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-white/75">
              {paid.detail.goodPoints.map((g) => (
                <li key={g}>· {g}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl border border-amber-400/20 bg-amber-950/15 p-4">
            <h3 className="text-sm font-bold text-amber-200">⚡ 부딪히기 쉬운 순간과 해결법</h3>
            <div className="mt-2 space-y-2.5">
              {paid.detail.clashPoints.map((c) => (
                <div key={c.point} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                  <p className="text-[13px] leading-relaxed text-white/80">{c.point}</p>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-200/90">→ {c.fix}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-black/40 p-4">
            <h3 className="text-sm font-bold text-white/85">🌱 오래 가는 두 사람의 습관</h3>
            <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-white/75">
              {paid.detail.habits.map((h) => (
                <li key={h}>· {h}</li>
              ))}
            </ul>
          </section>

          {paid.togetherDays.length ? (
            <section className="rounded-3xl border border-sky-400/20 bg-sky-950/15 p-4">
              <h3 className="text-sm font-bold text-sky-200">📅 앞으로 30일, 함께하면 좋은 날</h3>
              <div className="mt-2 space-y-1.5">
                {paid.togetherDays.map((d) => (
                  <p key={d.date} className="text-[13px] text-white/80">
                    <span className="font-bold text-sky-100">{dayLabel(d.date)}</span> · {d.title}
                  </p>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-white/40">두 사람 모두 조심할 날이 아니고, 한 사람 이상 좋은 날이에요.</p>
            </section>
          ) : null}
        </div>
      ) : (
        <section className="rounded-3xl border border-pink-400/30 bg-gradient-to-b from-pink-950/40 to-violet-950/30 p-5 text-center">
          <p className="text-xs font-semibold tracking-widest text-pink-300/80">궁합 심층 풀이</p>
          <h3 className="mt-1 text-lg font-black text-pink-100">두 사람, 어디서 맞고 어디서 부딪힐까?</h3>
          <ul className="mx-auto mt-3 max-w-xs space-y-1.5 text-left text-[13px] text-white/70">
            <li>✦ 성격·대화 · 돈·생활 · 애정·신뢰 · 미래</li>
            <li>✦ 부딪히기 쉬운 순간 3가지와 해결법</li>
            <li>✦ 오래 가는 두 사람의 습관</li>
            <li>✦ 앞으로 30일, 함께하면 좋은 날</li>
            <li>✦ 한 번 결제하면 언제든 다시 보기</li>
          </ul>
          {deep.app.isApp && !deep.app.canBuy ? (
            <a
              href="https://play.google.com/store/apps/details?id=kr.co.ymstudio.myeongun"
              className="mt-4 block rounded-2xl border border-pink-400/40 py-3 text-sm font-bold text-pink-200"
            >
              앱 업데이트 후 볼 수 있어요 →
            </a>
          ) : deep.generating ? (
            <PaidWaiting
              steps={["결제를 확인했어요", "두 사람의 사주를 맞대 보고 있어요", "함께하면 좋은 날을 고르고 있어요", "심층 풀이를 쓰고 있어요"]}
            />
          ) : (
            <button
              type="button"
              disabled={deep.busy}
              onClick={() => deep.startPurchase(input)}
              className="mt-4 w-full rounded-2xl bg-gradient-to-r from-pink-500 via-rose-400 to-violet-400 py-3.5 text-sm font-black text-white shadow-lg shadow-pink-900/40 transition hover:brightness-105 disabled:opacity-60"
            >
              {deep.busy
                ? "결제 진행 중…"
                : owned
                  ? "✓ 구매한 심층 풀이 다시 보기 (추가 결제 없음)"
                  : deep.isAdmin
                    ? "⚡ [운영자] 무료로 심층 풀이 보기"
                    : `궁합 심층 풀이 보기 · ${MATCH_DEEP_PRICE_WON.toLocaleString()}원`}
            </button>
          )}
          {deep.error ? <p className="mt-3 text-xs leading-relaxed text-rose-300">{deep.error}</p> : null}
        </section>
      )}
      {deep.paymentModal}
    </div>
  );
}

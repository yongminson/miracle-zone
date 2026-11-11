"use client";

import { useEffect, useState } from "react";
import { logEvent } from "@/lib/analytics";
import { REVIEW_BODY_MAX, REVIEW_BODY_MIN, type PublicReview, type ReviewProduct } from "@/lib/reviews/reviews";

/**
 * 구매 인증 후기 — 목록(결제 전 화면)과 쓰기(결제 후 화면). 2026-11-12
 * 후기가 하나도 없으면 목록은 아무것도 그리지 않는다(가짜 후기를 채우지 않는다).
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

function Stars({ value, size = "text-xs" }: { value: number; size?: string }) {
  return (
    <span className={`${size} tracking-tight text-amber-300`} aria-label={`별점 ${value}점`}>
      {"★".repeat(value)}
      <span className="text-white/20">{"★".repeat(5 - value)}</span>
    </span>
  );
}

function dateLabel(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function ReviewList({ product, title = "구매 인증 후기" }: { product: ReviewProduct; title?: string }) {
  const [data, setData] = useState<{ count: number; average: number | null; reviews: PublicReview[] } | null>(null);
  const [all, setAll] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/api/reviews?product=${product}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive && j?.success) setData({ count: j.count, average: j.average, reviews: j.reviews ?? [] });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [product]);

  if (!data || data.count === 0 || data.reviews.length === 0) return null;
  const shown = all ? data.reviews : data.reviews.slice(0, 3);

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-left">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-bold text-white/90">💬 {title} {data.count}개</p>
        {data.average !== null ? (
          <p className="text-[12px] text-amber-200">
            ★ {data.average.toFixed(1)} <span className="text-white/40">/ 5</span>
          </p>
        ) : null}
      </div>
      <ul className="mt-3 space-y-3">
        {shown.map((r) => (
          <li key={r.id} className="border-t border-white/5 pt-3 first:border-0 first:pt-0">
            <div className="flex items-center justify-between gap-2">
              <Stars value={r.rating} />
              <span className="text-[10px] text-white/35">
                {r.displayName}
                {r.zodiac ? ` · ${r.zodiac}띠` : ""} · {dateLabel(r.createdAt)} · 구매 확인
              </span>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-white/75 break-keep">{r.body}</p>
          </li>
        ))}
      </ul>
      {data.reviews.length > 3 ? (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-3 w-full text-center text-[11px] text-white/45">
          {all ? "접기" : `후기 ${data.reviews.length - 3}개 더 보기`}
        </button>
      ) : null}
    </div>
  );
}

type Ids = { paymentId?: string; purchaseToken?: string; tossOrderId?: string; admin?: boolean };

export function ReviewForm({ product, ids }: { product: ReviewProduct; ids: Ids | null | undefined }) {
  const ref = ids?.tossOrderId ?? ids?.purchaseToken ?? ids?.paymentId ?? "";
  const doneKey = `myeongun_review_done_${product}_${ref.slice(-16)}`;
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(doneKey)) setDone(true);
    } catch {}
  }, [doneKey]);

  // 운영자 무료 풀이·구매 정보가 없는 기기에서는 쓰기 칸을 보여 주지 않는다
  if (!ref || ids?.admin) return null;

  if (done) {
    return (
      <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 px-4 py-3 text-center text-[12px] text-emerald-200/80">
        후기 고마워요! 다른 분들이 결제 전에 보고 있어요.
      </p>
    );
  }

  const submit = async () => {
    if (rating < 1) return setMsg("별점을 골라 주세요.");
    if (text.trim().length < REVIEW_BODY_MIN) return setMsg(`${REVIEW_BODY_MIN}자 이상 적어 주세요.`);
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product,
          rating,
          body: text.trim(),
          paymentId: ids?.paymentId,
          purchaseToken: ids?.purchaseToken,
          tossOrderId: ids?.tossOrderId,
        }),
      });
      const j = (await res.json().catch(() => null)) as { success?: boolean; message?: string } | null;
      if (res.ok && j?.success) {
        void logEvent("review_submit", { product, rating });
        try {
          localStorage.setItem(doneKey, new Date().toISOString());
        } catch {}
        setDone(true);
        return;
      }
      if (res.status === 409) {
        try {
          localStorage.setItem(doneKey, new Date().toISOString());
        } catch {}
        setDone(true);
        return;
      }
      setMsg(j?.message || "후기를 저장하지 못했어요.");
    } catch {
      setMsg("후기를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-amber-400/25 bg-black/40 p-4 sm:p-5">
      <p className="text-center text-sm font-bold text-amber-100">풀이가 어땠나요?</p>
      <p className="mt-1 text-center text-[11px] text-white/45 break-keep">
        구매 확인된 후기만 이름을 가려서(예: 홍*동) 결제 전 화면에 보여요.
      </p>
      <div className="mt-3 flex justify-center gap-1.5" role="radiogroup" aria-label="별점">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n}점`}
            onClick={() => setRating(n)}
            className={`text-3xl leading-none transition ${n <= rating ? "text-amber-300" : "text-white/20"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, REVIEW_BODY_MAX))}
        rows={3}
        placeholder="잘 맞았던 부분, 도움이 된 부분을 적어 주세요"
        className="mt-3 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-[13px] text-white outline-none placeholder:text-white/30 focus:border-amber-400/50"
      />
      <div className="mt-1 text-right text-[10px] text-white/30">
        {text.length}/{REVIEW_BODY_MAX}
      </div>
      {msg ? <p className="mt-1 text-center text-[12px] text-rose-300">{msg}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={submit}
        className="mt-2 w-full rounded-xl bg-amber-500/90 py-3 text-sm font-bold text-stone-950 disabled:opacity-50"
      >
        {busy ? "저장 중…" : "후기 남기기"}
      </button>
    </section>
  );
}

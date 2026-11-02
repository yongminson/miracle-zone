"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logEvent } from "@/lib/analytics";
import { readProfiles } from "@/lib/profiles/saved-profiles";

/**
 * 첫 화면에서 바로 오늘의 운세 — 생년월일만 넣으면 도구 화면으로 가서 곧바로 결과를 연다.
 * 2026-10 웹 첫 화면 방문의 69% 가 아무것도 하지 않고 나갔다(소개 글·버튼만 있었다).
 * 넘기는 값: /tools?tab=fortune&qb=YYYY-MM-DD&qg=male|female (FortuneTab 이 받아 채우고 바로 조회)
 */
export function QuickFortune() {
  const router = useRouter();
  const [digits, setDigits] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [error, setError] = useState<string | null>(null);

  // 저장해 둔 내 프로필이 있으면 채워 둔다 — 다시 온 손님은 한 번만 누르면 된다
  useEffect(() => {
    const profiles = readProfiles();
    const me = profiles.find((p) => p.relation === "self") ?? profiles[0];
    if (!me || me.calendar !== "solar") return;
    setDigits(me.birthDate.replace(/-/g, ""));
    setGender(me.gender);
  }, []);

  const shown =
    digits.length > 6
      ? `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
      : digits.length > 4
        ? `${digits.slice(0, 4)}-${digits.slice(4)}`
        : digits;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const y = Number(digits.slice(0, 4));
    const m = Number(digits.slice(4, 6));
    const d = Number(digits.slice(6, 8));
    const date = new Date(Date.UTC(y, m - 1, d));
    if (digits.length !== 8 || y < 1920 || y > 2026 || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
      setError("생년월일 8자리를 확인해 주세요. (예: 19900515)");
      return;
    }
    setError(null);
    void logEvent("landing_quick_fortune", {});
    const birth = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
    router.push(`/tools?tab=fortune&qb=${birth}&qg=${gender}`);
  };

  return (
    <form
      onSubmit={submit}
      className="mx-auto mt-8 w-full max-w-md rounded-2xl border border-amber-400/30 bg-gradient-to-b from-amber-950/40 to-slate-950/60 p-4 text-left shadow-[0_0_30px_-12px_rgba(245,158,11,0.5)]"
    >
      <p className="text-center text-sm font-bold text-amber-100">생년월일만 넣으면 오늘의 운세가 바로 나와요</p>
      <div className="mt-3 flex gap-2">
        <input
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder="예: 19900515 (양력)"
          aria-label="생년월일 8자리"
          value={shown}
          onChange={(e) => setDigits(e.target.value.replace(/[^0-9]/g, "").slice(0, 8))}
          className="min-w-0 flex-1 rounded-xl border border-white/20 bg-slate-900/80 px-3 py-3 text-base text-white placeholder-white/30 focus:border-amber-400/60 focus:outline-none"
        />
        <div className="flex shrink-0 overflow-hidden rounded-xl border border-white/20">
          {(["male", "female"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              className={`px-3 text-sm font-bold transition ${gender === g ? "bg-amber-500/25 text-amber-100" : "text-white/50"}`}
            >
              {g === "male" ? "남" : "여"}
            </button>
          ))}
        </div>
      </div>
      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
      <button
        type="submit"
        className="mt-3 w-full rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 py-3 text-sm font-black text-stone-950 transition hover:brightness-105"
      >
        ✨ 오늘의 운세 무료로 보기
      </button>
      <p className="mt-2 text-center text-[11px] text-white/40">음력·태어난 시간은 다음 화면에서 바꿀 수 있어요</p>
    </form>
  );
}

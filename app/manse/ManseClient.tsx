"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { logEvent } from "@/lib/analytics";
import { readProfiles } from "@/lib/profiles/saved-profiles";
import { BRANCH_ELEMENT, STEM_ELEMENT, type FiveElement } from "@/lib/saju/strength";
import type { ManseResult } from "@/lib/saju/manse";

// 무료 만세력 화면 (2026-11-04). 계산은 /api/manse(lib/saju/manse.ts).

const ELEMENT_STYLE: Record<FiveElement, { ko: string; cls: string }> = {
  wood: { ko: "목", cls: "bg-emerald-600/80 text-white" },
  fire: { ko: "화", cls: "bg-rose-600/80 text-white" },
  earth: { ko: "토", cls: "bg-amber-500/90 text-slate-900" },
  metal: { ko: "금", cls: "bg-slate-200 text-slate-900" },
  water: { ko: "수", cls: "bg-sky-800 text-white" },
};
const ELEMENT_BAR: Record<string, string> = { 목: "bg-emerald-500", 화: "bg-rose-500", 토: "bg-amber-400", 금: "bg-slate-200", 수: "bg-sky-500" };

function formatBirthDate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function Char({ ch, kind }: { ch: string; kind: "stem" | "branch" }) {
  const el = (kind === "stem" ? STEM_ELEMENT : BRANCH_ELEMENT)[ch];
  const style = el ? ELEMENT_STYLE[el] : null;
  return (
    <div className={`mx-auto flex h-14 w-14 flex-col items-center justify-center rounded-xl text-2xl font-black ${style?.cls ?? "bg-white/10"}`}>
      {ch}
      {style ? <span className="text-[9px] font-medium opacity-80">{style.ko}</span> : null}
    </div>
  );
}

export function ManseClient() {
  const [birthDate, setBirthDate] = useState("");
  const [calendarType, setCalendarType] = useState<"solar" | "lunar" | "lunar-leap">("solar");
  const [birthTime, setBirthTime] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ManseResult | null>(null);

  useEffect(() => {
    const me = readProfiles().find((p) => p.relation === "self");
    if (me) {
      setBirthDate(me.birthDate);
      setCalendarType(me.calendar);
      setGender(me.gender);
    }
  }, []);

  const submit = async () => {
    if (loading) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return alert("생년월일 8자리를 넣어 주세요. (예: 19950503)");
    setLoading(true);
    try {
      const res = await fetch("/api/manse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate, calendarType, birthTime: timeUnknown ? null : birthTime || null, gender }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "계산하지 못했어요.");
      setResult(data);
      void logEvent("tool_result", { tool: "manse" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "계산하지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  const maxCount = result ? Math.max(1, ...Object.values(result.elementCount)) : 1;
  const thisYear = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric" }).format(new Date()));

  return (
    <>
      <section className="mt-8 rounded-3xl border border-amber-400/30 bg-black/40 p-5">
        <div className="grid grid-cols-2 gap-2">
          {(["male", "female"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              className={`rounded-xl border py-2.5 text-sm ${gender === g ? "border-amber-400/60 bg-amber-500/15 text-amber-100" : "border-white/15 text-white/50"}`}
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
            className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm tracking-wider outline-none placeholder:text-white/30 focus:border-amber-400/60"
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
        <div className="mt-2 flex items-center gap-3">
          <input
            type="time"
            value={birthTime}
            disabled={timeUnknown}
            onChange={(e) => setBirthTime(e.target.value)}
            className="flex-1 rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm outline-none disabled:opacity-40"
          />
          <label className="flex items-center gap-1.5 text-sm text-white/70">
            <input type="checkbox" checked={timeUnknown} onChange={(e) => setTimeUnknown(e.target.checked)} />
            시간 모름
          </label>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="mt-3 w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-5 py-3.5 text-sm font-bold text-slate-900 disabled:opacity-60"
        >
          {loading ? "계산 중..." : "만세력 보기"}
        </button>
      </section>

      {result ? (
        <>
          <section className="mt-6 rounded-3xl border border-white/10 bg-black/30 p-4">
            <p className="text-center text-xs text-white/50">
              양력 {result.solarDate.year}년 {result.solarDate.month}월 {result.solarDate.day}일 기준 · 일간{" "}
              <b className="text-amber-200">
                {result.dayMaster.stemKorean}({result.dayMaster.stemHanja})
              </b>
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[320px] text-center text-xs">
                <thead>
                  <tr className="text-white/50">
                    {result.pillars.map((p) => (
                      <th key={p.key} className="pb-2 font-normal">{p.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {result.pillars.map((p) => (
                      <td key={p.key} className="pb-1 text-[11px] text-amber-100/80">{p.stemTenGod ?? ""}</td>
                    ))}
                  </tr>
                  <tr>
                    {result.pillars.map((p) => (
                      <td key={p.key} className="py-1">{p.hanja ? <Char ch={p.hanja[0]} kind="stem" /> : <span className="text-white/30">모름</span>}</td>
                    ))}
                  </tr>
                  <tr>
                    {result.pillars.map((p) => (
                      <td key={p.key} className="py-1">{p.hanja ? <Char ch={p.hanja[1]} kind="branch" /> : null}</td>
                    ))}
                  </tr>
                  <tr>
                    {result.pillars.map((p) => (
                      <td key={p.key} className="pt-1 text-[11px] text-amber-100/80">{p.branchTenGods?.[0] ?? ""}</td>
                    ))}
                  </tr>
                  <tr className="text-white/60">
                    {result.pillars.map((p) => (
                      <td key={p.key} className="pt-2 text-[10px] leading-snug">
                        {p.hiddenStems ? (
                          <>
                            지장간 {p.hiddenStems.join("")}
                            <br />
                            12운성 {p.growthStage}
                            <br />
                            {p.naYin}
                          </>
                        ) : null}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-4 rounded-3xl border border-white/10 bg-black/30 p-4">
            <p className="text-sm font-bold text-white/90">오행 분포 <span className="text-xs font-normal text-white/50">(보이는 글자 기준)</span></p>
            <div className="mt-3 space-y-2">
              {Object.entries(result.elementCount).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 text-xs">
                  <span className="w-5 text-white/70">{k}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full rounded-full ${ELEMENT_BAR[k]}`} style={{ width: `${(v / maxCount) * 100}%` }} />
                  </div>
                  <span className="w-5 text-right text-white/80">{v}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 rounded-xl bg-white/5 px-3 py-2.5 text-[13px] leading-relaxed text-white/80 break-keep">
              {result.strength.isStrong ? "신강" : "신약"} — 내 편 기운이 {result.strength.isStrong ? "많은" : "적은"} 편이라{" "}
              <b className="text-amber-200">{result.strength.favorable.join("·")}</b> 기운이 도움이 돼요.
              <span className="block text-[11px] text-white/45">태어난 달의 힘을 크게 보는 간이 판정이에요. 정밀한 용신은 조후·격국까지 함께 봐야 해요.</span>
            </p>
          </section>

          <section className="mt-4 rounded-3xl border border-white/10 bg-black/30 p-4">
            <p className="text-sm font-bold text-white/90">
              대운 <span className="text-xs font-normal text-white/50">({result.daeun.direction} · 10년마다 바뀌는 큰 흐름)</span>
            </p>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {result.daeun.periods.map((p) => {
                const current = p.startYear === result.daeun.currentStartYear;
                return (
                  <div
                    key={p.startYear}
                    className={`w-16 shrink-0 rounded-xl border px-1 py-2 text-center ${current ? "border-amber-400 bg-amber-500/15" : "border-white/10"}`}
                  >
                    <p className="text-[10px] text-white/50">{p.startAge}세</p>
                    <p className="mt-0.5 text-base font-black text-white">{p.ganjiHanja}</p>
                    <p className="text-[10px] text-white/60">{p.ganjiKorean}</p>
                    <p className="mt-0.5 text-[10px] text-amber-100/80">{p.stemTenGod}</p>
                  </div>
                );
              })}
            </div>
            {result.annualFlow.length ? (
              <>
                <p className="mt-4 text-sm font-bold text-white/90">해마다 흐름 (세운)</p>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {result.annualFlow.map((y) => (
                    <div
                      key={y.year}
                      className={`w-16 shrink-0 rounded-xl border px-1 py-2 text-center ${y.year === thisYear ? "border-amber-400 bg-amber-500/15" : "border-white/10"}`}
                    >
                      <p className="text-[10px] text-white/50">{y.year}</p>
                      <p className="mt-0.5 text-base font-black text-white">{y.ganjiHanja}</p>
                      <p className="text-[10px] text-amber-100/80">{y.stemTenGod}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </section>

          <ul className="mt-4 space-y-1 text-[11px] leading-relaxed text-white/40">
            {result.notes.map((n) => (
              <li key={n} className="break-keep">· {n}</li>
            ))}
          </ul>

          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link href="/tools?tab=fortune" className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-center text-sm font-bold text-white/90">
              오늘 내 운세 보기 →
            </Link>
            <Link href="/vip" className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-center text-sm font-bold text-amber-100">
              이 판으로 14장 풀이 받기 →
            </Link>
          </div>
        </>
      ) : null}
    </>
  );
}

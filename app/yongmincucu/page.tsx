"use client";

/**
 * 통합 CS 대시보드 — `/api/yongmincucu/data`에서 VIP(`vip_orders`)·제단(`wishes`)·사주 탭 payload를 한 번에 받습니다.
 * 각 테이블은 `select('*')` 기반이며 status 등으로 서버에서 걸러내지 않습니다(사주 탭은 별도 테이블 미구현 시 안내 문구만).
 */

import { useState } from "react";
import { CsUnifiedDashboardClient } from "@/components/admin/CsUnifiedDashboardClient";
import type { CsDashboardBootstrapPayload } from "@/lib/admin/cs-dashboard-types";

export default function YongmincucuPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [bootstrap, setBootstrap] = useState<CsDashboardBootstrapPayload | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/yongmincucu/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.status === 401) {
        setErrorMessage("비밀번호가 일치하지 않습니다");
        return;
      }

      const data = (await res.json()) as { ok?: boolean } & Partial<CsDashboardBootstrapPayload>;

      if (!res.ok || !data.ok || !data.vip || !data.altar || !data.saju) {
        setErrorMessage("데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      setBootstrap({
        vip: data.vip,
        altar: data.altar,
        saju: data.saju,
      });
      setIsAuthenticated(true);
      setPassword("");
    } catch {
      setErrorMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || !bootstrap) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="w-full max-w-sm rounded-2xl border border-amber-500/25 bg-slate-900/90 p-6 shadow-2xl shadow-black/50 backdrop-blur-md"
        >
          <h1 className="text-center font-serif text-lg font-semibold text-amber-100">
            관리자 비밀번호를 입력하세요
          </h1>
          <label className="mt-6 block">
            <span className="sr-only">비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-slate-600 bg-black/50 px-4 py-3 text-sm text-slate-100 outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
              placeholder="비밀번호"
            />
          </label>
          {errorMessage ? (
            <p className="mt-3 text-center text-sm text-red-300">{errorMessage}</p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 py-3 text-sm font-bold text-stone-950 transition hover:brightness-105 disabled:opacity-60"
          >
            {loading ? "확인 중…" : "확인"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <CsUnifiedDashboardClient vip={bootstrap.vip} altar={bootstrap.altar} saju={bootstrap.saju} />
    </div>
  );
}

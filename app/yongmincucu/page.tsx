"use client";

/**
 * 통합 CS 대시보드 — `/api/yongmincucu/data`에 `tab`·`page`·`perPage`를 넘겨 서버사이드 페이지네이션합니다.
 */

import { useCallback, useRef, useState } from "react";
import { CsUnifiedDashboardClient } from "@/components/admin/CsUnifiedDashboardClient";
import type { CsDashboardRow, CsDashboardTabId } from "@/lib/admin/cs-dashboard-types";

const ITEMS_PER_PAGE = 20;

export default function YongmincucuPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<string | null>(null);

  const [currentTab, setCurrentTab] = useState<CsDashboardTabId>("vip");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [rows, setRows] = useState<CsDashboardRow[]>([]);
  const [sourceNote, setSourceNote] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);

  const loadDashboard = useCallback(
    async (
      tab: CsDashboardTabId,
      page: number,
      opts?: { alreadyLoggedIn?: boolean },
    ): Promise<boolean> => {
      const pw = passwordRef.current;
      if (!pw) return false;
      setListLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetch("/api/yongmincucu/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: pw, tab, page, perPage: ITEMS_PER_PAGE }),
        });

        if (res.status === 401) {
          passwordRef.current = null;
          setIsAuthenticated(false);
          setRows([]);
          setTotalCount(0);
          setSourceNote(null);
          setErrorMessage(
            opts?.alreadyLoggedIn
              ? "세션이 만료되었습니다. 다시 로그인해 주세요."
              : "비밀번호가 올바르지 않습니다.",
          );
          return false;
        }

        const data = (await res.json()) as {
          ok?: boolean;
          tab?: CsDashboardTabId;
          page?: number;
          rows?: CsDashboardRow[];
          totalCount?: number;
          sourceNote?: string | null;
        };

        if (!res.ok || !data.ok) {
          setErrorMessage("데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
          return false;
        }

        setRows(data.rows ?? []);
        setTotalCount(typeof data.totalCount === "number" ? data.totalCount : 0);
        setSourceNote(data.sourceNote ?? null);
        if (data.tab) setCurrentTab(data.tab);
        if (typeof data.page === "number" && data.page >= 1) setCurrentPage(data.page);
        return true;
      } catch {
        setErrorMessage("네트워크 오류가 발생했습니다.");
        return false;
      } finally {
        setListLoading(false);
      }
    },
    [],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);
    try {
      const trimmed = password.trim();
      if (!trimmed) {
        setErrorMessage("비밀번호를 입력해 주세요.");
        return;
      }
      passwordRef.current = trimmed;
      const ok = await loadDashboard("vip", 1, { alreadyLoggedIn: false });
      if (ok) {
        setIsAuthenticated(true);
        setPassword("");
      } else {
        passwordRef.current = null;
      }
    } catch {
      setErrorMessage("네트워크 오류가 발생했습니다.");
      passwordRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = useCallback(
    (tab: CsDashboardTabId) => {
      setCurrentPage(1);
      void loadDashboard(tab, 1, { alreadyLoggedIn: true });
    },
    [loadDashboard],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      void loadDashboard(currentTab, page, { alreadyLoggedIn: true });
    },
    [loadDashboard, currentTab],
  );

  if (!isAuthenticated) {
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
      {errorMessage ? (
        <div className="mx-auto max-w-md px-4 pt-4">
          <p className="rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-center text-sm text-red-200">
            {errorMessage}
          </p>
        </div>
      ) : null}
      <CsUnifiedDashboardClient
        activeTab={currentTab}
        onTabChange={handleTabChange}
        rows={rows}
        totalCount={totalCount}
        currentPage={currentPage}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={handlePageChange}
        sourceNote={sourceNote}
        isLoading={listLoading}
      />
    </div>
  );
}

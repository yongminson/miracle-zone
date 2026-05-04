"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { CsDashboardTabId, CsDashboardBootstrapPayload, CsDashboardRow } from "@/lib/admin/cs-dashboard-types";
import { CsDashboardCard } from "@/components/admin/CsDashboardCard";

type Props = CsDashboardBootstrapPayload;

const TABS: { id: CsDashboardTabId; label: string }[] = [
  { id: "vip", label: "VIP 결제" },
  { id: "saju", label: "사주/관상/이름" },
  { id: "altar", label: "기적의 제단" },
];

export function CsUnifiedDashboardClient({ vip, altar, saju }: Props) {
  const [activeTab, setActiveTab] = useState<CsDashboardTabId>("vip");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const activePayload = activeTab === "vip" ? vip : activeTab === "altar" ? altar : saju;

  const filtered = useMemo(() => {
    const rows = activePayload.rows;
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    if (!q) return rows;
    return rows.filter((r: CsDashboardRow) => {
      const nameHit = r.user_name.toLowerCase().includes(q);
      const notesHit = (r.notes ?? "").toLowerCase().includes(q);
      const refHit = (r.paymentRef ?? "").toLowerCase().includes(q);
      const idHit = r.id.toLowerCase().includes(q);
      const phoneNorm = (r.phone_number ?? "").replace(/\D/g, "");
      const phoneHit =
        (r.phone_number && r.phone_number.includes(query.trim())) ||
        (digits.length > 0 && phoneNorm.includes(digits));
      return nameHit || phoneHit || notesHit || refHit || idHit;
    });
  }, [activePayload.rows, query]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const emptyDefaultMessage =
    activeTab === "vip"
      ? "표시할 VIP 주문이 없습니다."
      : activeTab === "altar"
        ? "표시할 제단 소원이 없습니다."
        : "표시할 사주·관상·이름 결제 내역이 없습니다.";

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-950 px-4 pb-10 pt-6 text-slate-100">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500/80">Admin</p>
          <h1 className="font-serif text-xl font-semibold text-amber-50">통합 CS 대시보드</h1>
        </div>
        <Link
          href="/"
          className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-white/10"
        >
          홈
        </Link>
      </header>

      <nav
        className="mb-5 flex rounded-2xl border border-amber-500/20 bg-slate-900/80 p-1 shadow-inner shadow-black/20"
        aria-label="CS 구역"
      >
        {TABS.map((t) => {
          const selected = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setActiveTab(t.id);
                setQuery("");
              }}
              className={
                selected
                  ? "flex-1 rounded-xl bg-gradient-to-b from-amber-500/25 to-amber-600/15 px-2 py-2.5 text-center text-xs font-bold text-amber-50 shadow-md ring-1 ring-amber-500/40 sm:text-sm"
                  : "flex-1 rounded-xl px-2 py-2.5 text-center text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-200 sm:text-sm"
              }
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      <div className="relative mb-5">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-500/70"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            activeTab === "altar"
              ? "이름·소원·상태 검색"
              : activeTab === "vip"
                ? "이름·전화·imp_uid 검색"
                : "이름·메모 검색"
          }
          autoComplete="off"
          className="w-full rounded-2xl border border-amber-500/25 bg-slate-900/90 py-4 pl-12 pr-4 text-base text-slate-100 shadow-inner shadow-black/20 outline-none ring-0 placeholder:text-slate-500 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
        />
      </div>

      {activePayload.sourceNote ? (
        <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-950/40 px-3 py-2.5 text-xs leading-relaxed text-amber-100/90">
          {activePayload.sourceNote}
        </p>
      ) : null}

      <ul className="space-y-4">
        {filtered.length === 0 ? (
          <li className="rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-10 text-center text-sm text-slate-400">
            {activePayload.rows.length === 0 && !query.trim() ? emptyDefaultMessage : "검색 결과가 없습니다."}
          </li>
        ) : (
          filtered.map((row) => <CsDashboardCard key={`${activeTab}-${row.id}`} row={row} onToast={showToast} />)
        )}
      </ul>

      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 max-w-md -translate-x-1/2 rounded-full border border-amber-500/40 bg-slate-900/95 px-4 py-2 text-center text-sm text-amber-100 shadow-xl backdrop-blur-md"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}

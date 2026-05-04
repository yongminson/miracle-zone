"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardCopy, Search } from "lucide-react";
import type { VipCsOrderRow } from "@/lib/admin/vip-cs-types";

type Props = {
  initialRows: VipCsOrderRow[];
  sourceNote: string | null;
};

function formatCreatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function CsVipDashboardClient({ initialRows, sourceNote }: Props) {
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    if (!q) return initialRows;
    return initialRows.filter((r) => {
      const nameHit = r.user_name.toLowerCase().includes(q);
      const phoneNorm = (r.phone_number ?? "").replace(/\D/g, "");
      const phoneHit =
        (r.phone_number && r.phone_number.includes(query.trim())) ||
        (digits.length > 0 && phoneNorm.includes(digits));
      return nameHit || phoneHit;
    });
  }, [initialRows, query]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} 복사됨`);
    } catch {
      showToast("복사에 실패했습니다.");
    }
  };

  const copyReportUrl = async (row: VipCsOrderRow) => {
    const url = row.report_url?.trim();
    if (!url) {
      showToast("저장된 report_url이 없습니다.");
      return;
    }
    await copyText("report_url", url);
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-950 px-4 pb-10 pt-6 text-slate-100">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500/80">Admin</p>
          <h1 className="font-serif text-xl font-semibold text-amber-50">VIP 고객 CS</h1>
        </div>
        <Link
          href="/"
          className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-white/10"
        >
          홈
        </Link>
      </header>

      <div className="relative mb-5">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-500/70"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름 또는 전화번호 검색"
          autoComplete="off"
          className="w-full rounded-2xl border border-amber-500/25 bg-slate-900/90 py-4 pl-12 pr-4 text-base text-slate-100 shadow-inner shadow-black/20 outline-none ring-0 placeholder:text-slate-500 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
        />
      </div>

      {sourceNote ? (
        <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-950/40 px-3 py-2.5 text-xs leading-relaxed text-amber-100/90">
          {sourceNote}
        </p>
      ) : null}

      <ul className="space-y-4">
        {filtered.length === 0 ? (
          <li className="rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-10 text-center text-sm text-slate-400">
            {initialRows.length === 0 && !query.trim()
              ? "표시할 VIP 주문이 없습니다."
              : "검색 결과가 없습니다."}
          </li>
        ) : (
          filtered.map((row) => (
            <li
              key={row.id}
              className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/95 to-slate-950 p-4 shadow-lg shadow-black/30"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-serif text-lg font-semibold text-amber-50">{row.user_name}</p>
                {row.status ? (
                  <span className="shrink-0 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                    {row.status}
                  </span>
                ) : null}
              </div>
              {row.phone_number ? (
                <p className="mt-0.5 text-sm text-slate-400">{row.phone_number}</p>
              ) : (
                <p className="mt-0.5 text-xs text-slate-500">전화번호 없음</p>
              )}
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">결제 일시</dt>
                  <dd className="text-right text-slate-200">{formatCreatedAt(row.created_at)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">결제 금액</dt>
                  <dd className="font-medium text-amber-200">{row.amount.toLocaleString("ko-KR")}원</dd>
                </div>
                <div className="pt-1">
                  <dt className="text-slate-500">포트원 imp_uid</dt>
                  <dd className="mt-1 break-all font-mono text-[11px] text-slate-300">{row.imp_uid}</dd>
                </div>
                {row.report_url ? (
                  <div className="pt-1">
                    <dt className="text-slate-500">report_url</dt>
                    <dd className="mt-1 break-all text-[11px] text-slate-400">{row.report_url}</dd>
                  </div>
                ) : null}
              </dl>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => void copyReportUrl(row)}
                  disabled={!row.report_url?.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-700 to-amber-600 py-3 text-sm font-semibold text-stone-950 shadow-md shadow-amber-900/30 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <ClipboardCopy className="h-4 w-4 shrink-0" aria-hidden />
                  📝 PDF 링크 복사
                </button>
                <button
                  type="button"
                  onClick={() => void copyText("imp_uid", row.imp_uid)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-medium text-white/95 hover:bg-white/10"
                >
                  <ClipboardCopy className="h-4 w-4 shrink-0" aria-hidden />
                  💳 포트원 결제번호 복사
                </button>
              </div>
            </li>
          ))
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

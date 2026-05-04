"use client";

import { ClipboardCopy } from "lucide-react";
import type { CsDashboardRow } from "@/lib/admin/cs-dashboard-types";

type Props = {
  row: CsDashboardRow;
  onToast: (msg: string) => void;
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

export function CsDashboardCard({ row, onToast }: Props) {
  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onToast(`${label} 복사됨`);
    } catch {
      onToast("복사에 실패했습니다.");
    }
  };

  const copyReportUrl = async () => {
    const url = row.report_url?.trim();
    if (!url) {
      onToast("저장된 report_url이 없습니다.");
      return;
    }
    await copyText("report_url", url);
  };

  const hasPdfLink = Boolean(row.report_url?.trim());
  const copyRefLabel = row.paymentRef ? "결제 식별자" : "행 ID";
  const copyRefValue = row.paymentRef?.trim() || row.id;

  return (
    <li className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/95 to-slate-950 p-4 shadow-lg shadow-black/30">
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
          <dt className="text-slate-500">등록·결제 일시</dt>
          <dd className="text-right text-slate-200">{formatCreatedAt(row.created_at)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">금액</dt>
          <dd className="font-medium text-amber-200">
            {row.amountWon != null && Number.isFinite(row.amountWon)
              ? `${row.amountWon.toLocaleString("ko-KR")}원`
              : "— (미기록)"}
          </dd>
        </div>
        {row.paymentRef ? (
          <div className="pt-1">
            <dt className="text-slate-500">결제 식별자</dt>
            <dd className="mt-1 break-all font-mono text-[11px] text-slate-300">{row.paymentRef}</dd>
          </div>
        ) : (
          <div className="pt-1">
            <dt className="text-slate-500">행 ID</dt>
            <dd className="mt-1 break-all font-mono text-[11px] text-slate-400">{row.id}</dd>
          </div>
        )}
        {row.report_url ? (
          <div className="pt-1">
            <dt className="text-slate-500">report_url</dt>
            <dd className="mt-1 break-all text-[11px] text-slate-400">{row.report_url}</dd>
          </div>
        ) : null}
        {row.notes ? (
          <div className="pt-1">
            <dt className="text-slate-500">메모</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-400">
              {row.notes}
            </dd>
          </div>
        ) : null}
      </dl>
      <div className="mt-4 flex flex-col gap-2">
        {hasPdfLink ? (
          <button
            type="button"
            onClick={() => void copyReportUrl()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-700 to-amber-600 py-3 text-sm font-semibold text-stone-950 shadow-md shadow-amber-900/30 active:brightness-95"
          >
            <ClipboardCopy className="h-4 w-4 shrink-0" aria-hidden />
            📝 PDF 링크 복사
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void copyText(copyRefLabel, copyRefValue)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-medium text-white/95 hover:bg-white/10"
        >
          <ClipboardCopy className="h-4 w-4 shrink-0" aria-hidden />
          {row.paymentRef ? "💳 결제 식별자 복사" : "📋 행 ID 복사"}
        </button>
      </div>
    </li>
  );
}

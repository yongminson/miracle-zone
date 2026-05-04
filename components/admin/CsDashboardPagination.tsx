"use client";

type Props = {
  currentPage: number;
  totalCount: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

function visiblePageNumbers(current: number, totalPages: number, windowSize: number): number[] {
  if (totalPages <= windowSize) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const half = Math.floor(windowSize / 2);
  let start = current - half;
  let end = current + half - (windowSize % 2 === 0 ? 1 : 0);
  if (start < 1) {
    end += 1 - start;
    start = 1;
  }
  if (end > totalPages) {
    start -= end - totalPages;
    end = totalPages;
    if (start < 1) start = 1;
  }
  const out: number[] = [];
  for (let p = start; p <= end; p += 1) out.push(p);
  return out;
}

export function CsDashboardPagination({ currentPage, totalCount, itemsPerPage, onPageChange, disabled }: Props) {
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const pages = visiblePageNumbers(currentPage, totalPages, 5);
  const canPrev = currentPage > 1 && !disabled;
  const canNext = currentPage < totalPages && !disabled;

  const btnBase =
    "min-h-[40px] min-w-[40px] rounded-lg border text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-35";
  const navBtn = `${btnBase} border-white/15 bg-white/5 px-3 text-slate-200 hover:bg-white/10`;
  const pageIdle = `${btnBase} border-white/10 bg-slate-900/60 text-slate-400 hover:border-amber-500/30 hover:text-amber-100`;
  const pageActive = `${btnBase} border-amber-500/60 bg-gradient-to-b from-amber-500/25 to-amber-700/20 font-bold text-amber-50 shadow-md ring-1 ring-amber-500/40`;

  return (
    <nav
      className="mt-8 flex flex-wrap items-center justify-center gap-2 border-t border-white/10 pt-6"
      aria-label="페이지"
    >
      <button
        type="button"
        disabled={!canPrev}
        onClick={() => canPrev && onPageChange(currentPage - 1)}
        className={navBtn}
        aria-label="이전 페이지"
      >
        &lt;
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && p !== currentPage && onPageChange(p)}
          className={p === currentPage ? pageActive : pageIdle}
          aria-current={p === currentPage ? "page" : undefined}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        disabled={!canNext}
        onClick={() => canNext && onPageChange(currentPage + 1)}
        className={navBtn}
        aria-label="다음 페이지"
      >
        &gt;
      </button>
      <p className="ml-2 w-full text-center text-[11px] text-slate-500 sm:ml-3 sm:w-auto sm:text-left">
        전체 {totalCount.toLocaleString("ko-KR")}건 · {totalPages}페이지
      </p>
    </nav>
  );
}

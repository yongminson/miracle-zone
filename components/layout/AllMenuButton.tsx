"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutGrid, X, type LucideIcon } from "lucide-react";
import { logEvent } from "@/lib/analytics";

/**
 * 상단 메뉴 오른쪽 끝에 고정된 "전체" 버튼 — 누르면 모든 메뉴를 한 화면에 칸으로 보여 준다.
 * 메뉴가 15개라 옆으로 밀어야 나머지가 보이는데, 처음 온 손님은 메뉴가 더 있는 줄 모른다(2026-11-03 오너 지적).
 * 도구 화면(app/tools/page.tsx)과 다른 화면 메뉴(MenuTabs)가 같이 쓴다.
 *  - onPick 이 있으면 그 함수로 이동(도구 화면은 기존 탭 버튼을 그대로 눌러 같은 동작을 한다)
 *  - 없으면 item.href 로 이동
 */

export type AllMenuItem = { id: string; label: string; icon: LucideIcon; href?: string };

export function AllMenuButton({
  items,
  activeId,
  from,
  onPick,
}: {
  items: AllMenuItem[];
  activeId: string;
  from: string;
  onPick?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const tileClass = (isActive: boolean) =>
    `flex flex-col items-center justify-center gap-1.5 rounded-xl border px-1 py-3 text-center transition-colors ${
      isActive
        ? "border-yellow-500/60 bg-yellow-500/10 text-yellow-300"
        : "border-slate-700/60 bg-slate-800/60 text-slate-200 hover:border-yellow-500/40 hover:text-yellow-200"
    }`;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          void logEvent("all_menu_open", { from });
        }}
        aria-label="전체 메뉴 열기"
        className="relative z-20 flex shrink-0 flex-col items-center justify-center gap-1.5 border-l border-slate-700/60 bg-slate-900 px-3 py-2 text-yellow-300 transition-colors hover:text-yellow-200 sm:px-4"
      >
        <LayoutGrid className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} />
        <span className="whitespace-nowrap text-[10px] font-bold sm:text-xs">전체</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-label="전체 메뉴"
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 top-0 mx-auto max-h-[85vh] max-w-screen-sm overflow-y-auto rounded-b-2xl border-b border-yellow-700/30 bg-slate-900 px-4 pb-5 pt-4 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-base font-bold text-yellow-300">전체 메뉴</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {items.map((item) => {
                const isActive = item.id === activeId;
                const inner = (
                  <>
                    <item.icon className="h-6 w-6" strokeWidth={2} />
                    <span className="text-xs font-medium leading-tight break-keep">{item.label}</span>
                  </>
                );
                const pick = () => {
                  setOpen(false);
                  if (!isActive) void logEvent("all_menu_pick", { to: item.id, from });
                };
                if (onPick) {
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={tileClass(isActive)}
                      onClick={() => {
                        pick();
                        onPick(item.id);
                      }}
                    >
                      {inner}
                    </button>
                  );
                }
                return (
                  <Link key={item.id} href={item.href ?? "/"} className={tileClass(isActive)} onClick={pick}>
                    {inner}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

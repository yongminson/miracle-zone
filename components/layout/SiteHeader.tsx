"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export type SiteHeaderVariant = "marketing" | "vip" | "app";

export type SiteHeaderProps = {
  variant?: SiteHeaderVariant;
  /** `app` 변형에서 우측 액션(알림 등) */
  right?: ReactNode;
};

const vipNavClass =
  "font-bold text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.35)] transition hover:text-amber-300";

/** 로고 + 명운(命運) 브랜드 — 전체 클릭 시 홈(`/`) 이동 */
export function SiteHeader({ variant = "marketing", right }: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (variant === "app") {
    return (
      <header className="sticky top-0 z-[60] flex w-full items-center justify-between border-b border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
          <Image
            src="/logo.png"
            alt="명운"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
            priority
          />
          <span className="text-sm font-bold tracking-widest text-yellow-400">명운(命運)</span>
        </Link>
        {right ?? null}
      </header>
    );
  }

  if (variant === "vip") {
    return (
      <header className="relative border-b border-amber-500/15 bg-black/20 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-90"
          >
            <Image
              src="/logo.png"
              alt="명운"
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
              priority
            />
            <span className="font-serif text-sm tracking-[0.2em] text-amber-500/90">명운(命運)</span>
          </Link>
          <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-200/80">
            VIP
          </span>
        </div>
      </header>
    );
  }

  return (
    <header className="relative z-10 border-b border-amber-500/10 bg-black/25 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 flex-1 items-center gap-2 transition-opacity hover:opacity-90"
        >
          <Image
            src="/logo.png"
            alt="명운"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 object-contain"
            priority
          />
          <span className="font-serif text-sm font-semibold tracking-[0.25em] text-amber-400/95">
            명운<span className="text-amber-500/70">命運</span>
          </span>
        </Link>

        <nav aria-label="주요 메뉴" className="hidden items-center gap-5 text-xs md:flex">
          <Link href="/tools" className="text-slate-400 transition hover:text-amber-300">
            에센셜 분석
          </Link>
          <Link href="/vip" className={vipNavClass}>
            🌟 VIP 대운 분석
          </Link>
        </nav>

        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-amber-200 md:hidden"
          aria-expanded={mobileMenuOpen}
          aria-controls="site-header-mobile-nav"
          onClick={() => setMobileMenuOpen((o) => !o)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          <span className="sr-only">{mobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}</span>
        </button>
      </div>

      {mobileMenuOpen ? (
        <nav
          id="site-header-mobile-nav"
          className="border-t border-white/10 bg-black/40 px-4 py-3 md:hidden"
          aria-label="모바일 메뉴"
        >
          <ul className="flex flex-col gap-1">
            <li>
              <Link
                href="/tools"
                className="block rounded-xl px-3 py-3 text-sm text-slate-200 hover:bg-white/5"
                onClick={() => setMobileMenuOpen(false)}
              >
                에센셜 분석
              </Link>
            </li>
            <li>
              <Link
                href="/vip"
                className={`block rounded-xl px-3 py-3 text-sm ${vipNavClass} hover:bg-amber-500/10`}
                onClick={() => setMobileMenuOpen(false)}
              >
                🌟 VIP 대운 분석
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  Activity,
  BookOpen,
  CalendarHeart,
  Crown,
  FileText,
  Flame,
  Hand,
  Heart,
  KeyRound,
  Sparkles,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { logEvent } from "@/lib/analytics";

/**
 * 별도 페이지(신년운세·사주 인사이트·소원 자물쇠)에서도 도구 화면과 같은 메뉴를 보여준다.
 * 들어온 뒤 다른 메뉴로 가는 길이 없어서 막다른 길이 되던 문제를 막는다.
 *
 * ⚠ 메뉴 목록은 app/tools/page.tsx 의 TABS 와 같게 유지한다(순서·이름·아이콘).
 */

type MenuId =
  | "fortune" | "newyear" | "vip" | "zodiac" | "saju" | "palmistry"
  | "match" | "mbti" | "dream" | "lotto" | "altar" | "lock";

const MENU: { id: MenuId; label: string; icon: LucideIcon; href: string }[] = [
  { id: "fortune", label: "오늘의 운세", icon: Sparkles, href: "/tools?tab=fortune" },
  { id: "newyear", label: "2027 신년운세", icon: CalendarHeart, href: "/newyear" },
  { id: "vip", label: "사주 인사이트", icon: Crown, href: "/vip" },
  { id: "zodiac", label: "띠별 운세", icon: Star, href: "/tools?tab=zodiac" },
  { id: "saju", label: "관상/이름 풀이", icon: FileText, href: "/tools?tab=saju" },
  { id: "palmistry", label: "손금 분석", icon: Hand, href: "/tools?tab=palmistry" },
  { id: "match", label: "소름돋는 궁합", icon: Heart, href: "/tools?tab=match" },
  { id: "mbti", label: "MBTI 검사", icon: Activity, href: "/tools?tab=mbti" },
  { id: "dream", label: "꿈 해몽", icon: BookOpen, href: "/tools?tab=dream" },
  { id: "lotto", label: "행운의 로또", icon: Trophy, href: "/tools?tab=lotto" },
  { id: "altar", label: "기적의 제단", icon: Flame, href: "/tools?tab=altar" },
  { id: "lock", label: "소원 자물쇠", icon: KeyRound, href: "/lock" },
];

export function MenuTabs({ active }: { active: MenuId }) {
  const navRef = useRef<HTMLDivElement>(null);

  // 지금 메뉴가 화면 가운데에 오도록 (모바일에서 오른쪽 끝 메뉴가 안 보이는 문제)
  useEffect(() => {
    const container = navRef.current;
    const target = container?.querySelector<HTMLElement>(`[data-menu-id="${active}"]`);
    if (!container || !target) return;
    container.scrollLeft = target.offsetLeft - container.offsetWidth / 2 + target.offsetWidth / 2;
  }, [active]);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-700/50 bg-slate-900/95 shadow-md backdrop-blur-sm">
      <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-10 bg-gradient-to-l from-slate-900 via-slate-900/80 to-transparent sm:hidden" />
      <div
        ref={navRef}
        className="no-scrollbar relative z-0 mx-auto flex max-w-screen-lg items-center justify-start gap-6 overflow-x-auto px-4 py-2 sm:justify-between sm:gap-0 sm:px-6"
      >
        {MENU.map((item) => {
          const isActive = item.id === active;
          return (
            <Link
              key={item.id}
              href={item.href}
              data-menu-id={item.id}
              onClick={() => {
                if (!isActive) void logEvent("menu_click", { to: item.id, from: active });
              }}
              className={`relative flex min-w-[64px] shrink-0 flex-col items-center gap-1.5 p-2 transition-all duration-300 ease-out focus:outline-none sm:min-w-[80px] ${
                isActive ? "text-yellow-400" : "text-slate-400 hover:text-yellow-300"
              }`}
            >
              {isActive ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.6)]" aria-hidden />
              ) : null}
              <item.icon
                className={`h-5 w-5 sm:h-6 sm:w-6 ${isActive ? "drop-shadow-[0_0_6px_rgba(234,179,8,0.8)]" : ""}`}
                strokeWidth={2}
              />
              <span className="whitespace-nowrap text-[10px] font-medium sm:text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

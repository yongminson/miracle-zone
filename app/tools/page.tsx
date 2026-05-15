/* eslint-disable */
// @ts-nocheck
"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import { toPng } from "html-to-image";
import {
  Sparkles,
  BookOpen,
  Flame,
  Trophy,
  Volume2,
  VolumeX,
  Heart,
  DollarSign,
  Briefcase,
  GraduationCap,
  Activity,
  Camera,
  FileText,
  Bell, // 🚀 종 아이콘 추가
  Star,  // 🚀 띠별 운세 아이콘
  Hand,  // 🚀 손금 분석 아이콘
  type LucideIcon,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { isLikelyPortOneReturnSuccess } from "@/lib/payments/imp-uid";
import { clearPendingPaymentData, readPendingPaymentData, savePendingPaymentData } from "@/lib/payments/pending-payment-data";
import {
  clearPendingPaymentState,
  readPendingPaymentState,
  savePendingPaymentState,
} from "@/lib/payments/pending-payment-state";
import { extractPaymentReturnId } from "@/lib/payments/return-params";
import { getPortOnePaymentFailureReason } from "@/lib/payments/portone-response-guards";
import { PAYMENT_VERIFY_URL } from "@/lib/payments/verify-endpoint";
import { PaymentMethodSelector, type PayMethodPg } from "@/components/payments/PaymentMethodSelector";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** 애드센스 심사용 SEO 아코디언 — 사용자 눈에 거의 안 띄는 최하단 설명 텍스트 */
function SeoAccordion({ title, items }: { title: string; items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-auto w-full max-w-md mt-4 mb-2 px-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-[11px] text-white/25 hover:text-white/40 transition-colors py-2"
      >
        <span>{title}</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="space-y-3 pb-4">
          {items.map((item) => (
            <div key={item.q}>
              <p className="text-[11px] font-semibold text-white/35 mb-1">{item.q}</p>
              <p className="text-[10px] leading-relaxed text-white/25">{item.a}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 🚀 [추가] 관리자 전용 통계 대시보드 컴포넌트
function AdminDashboard() {
  const [stats, setStats] = useState({ daily: 0, total: 0, tabs: [] });
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("MASTER_ADMIN") === "true") {
      setIsAdmin(true);
      const fetchStats = async () => {
        const { data: vData } = await supabase.from("visitors").select("*");
        const { data: tData } = await supabase.from("tab_stats").select("*").order('click_count', { ascending: false });
        
        if (vData && tData) {
          const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
          let total = 0; let daily = 0;
          vData.forEach(row => {
            total += row.visit_count;
            if (row.visit_date === todayStr) daily = row.visit_count;
          });
          setStats({ daily, total, tabs: tData as any });
        }
      };
      fetchStats();
      const id = setInterval(fetchStats, 5000); // 5초마다 자동 갱신
      return () => clearInterval(id);
    }
  }, []);

  if (!isAdmin) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[100] bg-slate-900/95 border-2 border-yellow-500 p-5 rounded-2xl backdrop-blur-xl shadow-2xl max-w-[240px]">
      <h3 className="text-yellow-400 font-bold text-sm mb-3 flex items-center gap-2 border-b border-white/10 pb-2">👑 실시간 운영 현황</h3>
      <div className="space-y-1 mb-4 text-[11px]">
        <p className="flex justify-between"><span>오늘 방문:</span> <span className="text-yellow-300 font-bold">{stats.daily}명</span></p>
        <p className="flex justify-between"><span>누적 방문:</span> <span className="text-white/60">{stats.total}명</span></p>
      </div>
      <div className="space-y-1 text-[10px]">
        <p className="text-white/40 mb-2 mt-3 font-bold border-t border-white/5 pt-2">📊 탭별 인기 순위</p>
        {stats.tabs.map((t: any) => (
          <p key={t.tab_id} className="flex justify-between">
            <span className="text-white/70">{t.tab_id === 'fortune' ? '운세' : t.tab_id === 'saju' ? '관상' : t.tab_id === 'match' ? '궁합' : t.tab_id}</span>
            <span className="text-teal-400 font-mono">{t.click_count}회</span>
          </p>
        ))}
      </div>
      {/* 🚀 잃어버렸던 종료 버튼 완벽 복구! */}
      <div className="mt-4 pt-3 border-t border-white/10 text-center">
        <button onClick={() => { localStorage.removeItem("MASTER_ADMIN"); window.location.reload(); }} className="text-[10px] font-bold text-red-400/80 hover:text-red-400 transition-colors">
          ❌ 관리자 모드 종료
        </button>
      </div>
    </div>
  );
}

// 🚀 mbti와 match(궁합) 탭 추가
type TabId = "fortune" | "dream" | "lotto" | "altar" | "saju" | "mbti" | "match" | "zodiac" | "palmistry";

async function captureAndShareElement(
  target: HTMLElement | null,
  options?: {
    fileName?: string;
    title?: string;
    text?: string;
  }
) {
  if (!target) {
    alert("공유할 화면을 찾을 수 없습니다.");
    return;
  }

  try {
    const shareUrl = window.location.origin;

    // 원본을 복제
    const clonedTarget = target.cloneNode(true) as HTMLElement;
    clonedTarget.style.margin = "0";
    clonedTarget.style.width = `${target.offsetWidth}px`;

    // 바깥 래퍼 생성
    const wrapper = document.createElement("div");
    wrapper.style.background = "#020817";
    wrapper.style.padding = "24px";
    wrapper.style.width = `${target.offsetWidth + 48}px`;
    wrapper.style.boxSizing = "border-box";
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.gap = "16px";

    // 하단 링크 박스 생성
    const footer = document.createElement("div");
    footer.style.background = "#0f172a";
    footer.style.border = "1px solid rgba(234,179,8,0.35)";
    footer.style.borderRadius = "16px";
    footer.style.padding = "14px 16px";
    footer.style.textAlign = "center";
    footer.style.color = "#f8fafc";
    footer.style.fontSize = "14px";
    footer.style.lineHeight = "1.6";
    footer.innerHTML = `
      <div style="font-weight:700; color:#facc15; margin-bottom:6px;">
        결과가 궁금하다면 여기서 확인
      </div>
      <div style="font-size:13px; color:#cbd5e1; word-break:break-all;">
        ${shareUrl}
      </div>
    `;

    wrapper.appendChild(clonedTarget);
    wrapper.appendChild(footer);

    // 화면 밖 임시 영역에 붙이기
    const tempContainer = document.createElement("div");
    tempContainer.style.position = "fixed";
    tempContainer.style.left = "-99999px";
    tempContainer.style.top = "0";
    tempContainer.style.zIndex = "-1";
    tempContainer.appendChild(wrapper);
    document.body.appendChild(tempContainer);

    const dataUrl = await toPng(wrapper, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#020817",
    });

    document.body.removeChild(tempContainer);

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile && navigator.share) {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File(
        [blob],
        options?.fileName ?? "result-share.png",
        { type: "image/png" }
      );

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: options?.title ?? "결과 공유",
          files: [file],
        });
        return;
      }
    }

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = options?.fileName ?? "result-share.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (error) {
    console.error("captureAndShareElement error:", error);
    const message =
      error instanceof Error ? error.message : String(error);
    alert(`이미지 생성 오류: ${message}`);
  }
}

// 🚀 [비밀 관리자 모드 로직] 전역 패턴 감지기
let secretPattern = "";
const pushSecret = (char: string, callback?: () => void) => {
  secretPattern += char;
  if (secretPattern.length > 20) secretPattern = secretPattern.slice(-20);
  // LLLLL (로또5번) + S (사주1번) + LLLLL (로또5번)
  if (secretPattern.includes("LLLLLSLLLLL")) {
    secretPattern = ""; // 트리거 성공 시 초기화
    if (callback) callback();
  }
};

// 🚀 사람들을 홀리는 마법의 네이밍 & 완벽한 탭 순서 배치
const TABS: { id: TabId; label: string; icon: LucideIcon; isReady: boolean }[] = [
  { id: "fortune", label: "오늘의 운세", icon: Sparkles, isReady: true },
  { id: "zodiac",     label: "띠별 운세",    icon: Star,     isReady: true },
  { id: "saju",       label: "관상/이름 풀이", icon: FileText, isReady: true },
  { id: "palmistry",  label: "손금 분석",    icon: Hand,     isReady: true },
  { id: "match",      label: "소름돋는 궁합", icon: Heart,    isReady: true },
  { id: "mbti",    label: "MBTI - 심층 성격 검사", icon: Activity, isReady: true },
  { id: "dream",   label: "꿈 해몽",      icon: BookOpen, isReady: true },
  { id: "lotto",   label: "행운의 로또",  icon: Trophy,   isReady: true },
  { id: "altar",   label: "기적의 제단",  icon: Flame,    isReady: true },
];

const BIRTH_TIME_OPTIONS = [
  { value: "unknown", label: "모름" },
  { value: "ja", label: "자시(23~01)" },
  { value: "chuk", label: "축시(01~03)" },
  { value: "in", label: "인시(03~05)" },
  { value: "myo", label: "묘시(05~07)" },
  { value: "jin", label: "진시(07~09)" },
  { value: "sa", label: "사시(09~11)" },
  { value: "o", label: "오시(11~13)" },
  { value: "mi", label: "미시(13~15)" },
  { value: "sin", label: "신시(15~17)" },
  { value: "yu", label: "유시(17~19)" },
  { value: "sul", label: "술시(19~21)" },
  { value: "hae", label: "해시(21~23)" },
];

const FORTUNE_CATEGORIES = [
  { id: "total", title: "총운", icon: Sparkles, color: "text-purple-400" },
  { id: "love", title: "애정운", icon: Heart, color: "text-pink-400" },
  { id: "money", title: "금전운", icon: DollarSign, color: "text-yellow-400" },
  { id: "work", title: "직장운", icon: Briefcase, color: "text-blue-400" },
  { id: "study", title: "학업운", icon: GraduationCap, color: "text-green-400" },
  { id: "health", title: "건강운", icon: Activity, color: "text-teal-400" },
] as const;

const FLOATING_WISHES_POOL = [
  "우리가족 올해 꼭 건강하길",
  "이번 프로젝트 대박나게 해주세요",
  "로또 1등 당첨 제발요!!",
  "우리아들 이번 시험 합격 기원",
  "좋은 인연 만나게 해주세요",
  "올해는 꼭 내집마련 성공하자",
  "우울한 마음 다 사라지게 해주세요",
  "취업 합격 꼭 되게 해주세요",
  "사랑하는 사람과 평생 함께",
  "빚 갚고 새출발 하고 싶어요",
  "건강하게 오래오래 살게 해주세요",
  "행복한 일만 가득하길",
  "소원이 모두 이루어지길",
  "좋은 소식 빨리 오길",
  "건강과 행운이 함께하길",
  "사랑받고 사랑하며 살기",
  "평화로운 나날 되길",
  "희망찬 미래를 향해",
  "감사한 마음 가득히",
  "용기 내서 도전하기",
];

type LuckyItems = { color: string; number: string; direction: string; person: string };
type BaziCell = { stem: string; branch: string };
type BaziChart = {
  year: BaziCell;
  month: BaziCell;
  day: BaziCell;
  time: BaziCell;
};

type FortuneResultData = {
  scores: number[];
  texts: string[];
  luckyItems?: LuckyItems;
  baziChart?: BaziChart;
  dailyGuide?: { point: string; strategy: string; action: string; };
  luckyColor?: string;
  luckyDirection?: string;
  caution?: string;
} | null;

type PremiumReport = {
  daeun: string;
  monthlyAdvice: string;
  wealth: string;
  love: string;
  career: string;
  health: string;
  luckyColor?: string;
  luckyDirection?: string;
  caution?: string;
};

type DaeunInfo = {
  startAge: number;
  currentCycle: string;
  currentDescription: string;
};

const FORTUNE_CACHE_PREFIX = "fortune-cache-";
const PREMIUM_CACHE_PREFIX = "fortune-premium-cache-";
const NAME_CACHE_PREFIX = "name-cache-";

function getKstDateKey() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

function FortuneTab({ isVisible }: { isVisible: boolean }) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [birthDate, setBirthDate] = useState("");
  const [calendarType, setCalendarType] = useState<"solar" | "lunar" | "lunar-leap">("solar");
  const [birthTime, setBirthTime] = useState("unknown");
  const [isLoading, setIsLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [fortuneData, setFortuneData] = useState<FortuneResultData>(null);
  const [premiumResult, setPremiumResult] = useState<PremiumReport | null>(null);
  const [premiumBaziChart, setPremiumBaziChart] = useState<BaziChart | null>(null);
  const [premiumDaeunInfo, setPremiumDaeunInfo] = useState<DaeunInfo | null>(null);
  const shareResultRef = useRef<HTMLDivElement | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const [activeSubTab, setActiveSubTab] = useState(0);
  const [isPremiumLoading, setIsPremiumLoading] = useState(false);
  const [premiumLoadingStep, setPremiumLoadingStep] = useState(0);

  const getCacheKey = () => {
    const today = new Date().toDateString();
    return `${FORTUNE_CACHE_PREFIX}${today}-${name}-${gender}-${birthDate}-${calendarType}-${birthTime}`;
  };

  const getPremiumCacheKey = () => {
    const today = getKstDateKey();
    return `${PREMIUM_CACHE_PREFIX}${today}-${gender}-${birthDate}-${calendarType}-${birthTime}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        supabase.rpc('increment_tab_click', { target_tab_id: 'fortune' }).then(({ error }) => { if(error) console.error('운세 에러:', error) });
        setIsLoading(true);
    setIsPremiumLoading(false);
    setPremiumLoadingStep(0);
    setShowResult(false);
    setFortuneData(null);

    const cacheKey = getCacheKey();
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          const hasValidStructure =
            data.scores &&
            Array.isArray(data.scores) &&
            data.texts &&
            Array.isArray(data.texts) &&
            data.scores.length === 6 &&
            data.texts.length === 6;
          if (!hasValidStructure) {
            localStorage.removeItem(cacheKey);
          } else {
            setFortuneData(data);
            setActiveSubTab(0);
            setShowResult(true);
            setIsLoading(false);
            return;
          }
        } catch {
          localStorage.removeItem(cacheKey);
        }
      }
    }

    try {
      const res = await fetch("/api/fortune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender,
          birthDate,
          calendarType,
          birthTime,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "운세 분석 중 오류가 발생했습니다.");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      }

      setFortuneData(data);
      setActiveSubTab(0);
      setShowResult(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "운세 분석 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setShowResult(false);
    setFortuneData(null);
    setPremiumResult(null);
    setPremiumBaziChart(null);
    setPremiumDaeunInfo(null);
    setIsPremiumLoading(false);
    setPremiumLoadingStep(0);
    setActiveSubTab(0);
    setName("");
    setGender("male");
    setBirthDate("");
    setCalendarType("solar");
    setBirthTime("unknown");
  };

  const handlePremium = () => {
    if (typeof window !== "undefined" && localStorage.getItem("MASTER_ADMIN") === "true") {
      handlePremiumConfirm();
    } else {
      setShowPremiumModal(true);
    }
  };

  const handlePremiumConfirm = async () => {
    setShowPremiumModal(false);

    setIsLoading(true);
    setIsPremiumLoading(true);
    setPremiumLoadingStep(0);
    const premiumCacheKey = getPremiumCacheKey();
  
    const loadingTimer = window.setInterval(() => {
      setPremiumLoadingStep((prev) => {
        if (prev >= 3) return 3;
        return prev + 1;
      });
    }, 1200);

    try {
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(premiumCacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          const hasValidStructure =
            parsed &&
            parsed.premiumReport &&
            parsed.baziChart;
          if (hasValidStructure) {
            setPremiumResult(parsed.premiumReport ?? null);
            setPremiumBaziChart(parsed.baziChart ?? null);
            setPremiumDaeunInfo(parsed.daeunInfo ?? null);
            clearInterval(loadingTimer);
            setIsPremiumLoading(false);
            setIsLoading(false);
            return;
          }
  
          localStorage.removeItem(premiumCacheKey);
        }
      }
  
      const res = await fetch("/api/fortune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender,
          birthDate,
          calendarType,
          birthTime,
          isPremium: true,
        }),
      });
  
      const data = await res.json();
  
      if (!res.ok) {
        throw new Error(data.error || "운세 분석 중 오류가 발생했습니다.");
      }
  
      if (typeof window !== "undefined") {
        localStorage.setItem(premiumCacheKey, JSON.stringify(data));
      }
  
      setPremiumResult(data.premiumReport ?? null);
      setPremiumBaziChart(data.baziChart ?? null);
      setPremiumDaeunInfo(data.daeunInfo ?? null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "프리미엄 리포트 생성 중 오류가 발생했습니다.");
    } finally {
      clearInterval(loadingTimer);
      setIsPremiumLoading(false);
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    await captureAndShareElement(shareResultRef.current, {
      fileName: "fortune-result.png",
      title: "오늘의 운세",
      text: `오늘의 운세 결과 이미지입니다.\n자세히 보기: ${window.location.origin}`,
    });
  };

  const handleFortuneLinkShare = async () => {
    const shareUrl = window.location.href;
    const text = `오늘의 운세 결과 보러가기\n${shareUrl}`;
  
    if (navigator.share) {
      try {
        await navigator.share({
          title: "오늘의 운세",
          text,
          url: shareUrl,
        });
        return;
      } catch {}
    }
  
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("링크가 복사되었습니다.");
    } catch {
      alert("링크 공유를 지원하지 않는 환경입니다.");
    }
  };

  const displayBaziChartPremium = (bazi: BaziChart | null | undefined) => {
    const cols = [
      { key: "year", label: "년주", cell: bazi?.year },
      { key: "month", label: "월주", cell: bazi?.month },
      { key: "day", label: "일주", cell: bazi?.day },
      { key: "time", label: "시주", cell: bazi?.time },
    ];
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-center text-sm font-semibold text-black">사주팔자 (만세력)</h3>
        <div className="grid grid-cols-3 gap-3">
          {cols.map(({ key, label, cell }) => (
            <div
              key={key}
              className="flex flex-col items-center justify-center rounded border border-slate-200 bg-slate-50 py-3"
            >
              <span className="mb-1 text-xs font-medium text-slate-600">{label}</span>
              <span className="font-serif text-3xl font-bold text-black">
                {cell?.stem || "－"}
              </span>
              <span className="font-serif text-3xl font-semibold text-slate-800">
                {cell?.branch || "－"}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const displayLuckyItems = (lucky: LuckyItems | null | undefined) => {
    if (!lucky) return null;
    const items = [
      { icon: "🎨", label: "행운의 색상", value: lucky.color },
      { icon: "🔢", label: "행운의 번호", value: lucky.number },
      { icon: "🧭", label: "향할 방향", value: lucky.direction },
      { icon: "🤝", label: "귀인 띠", value: lucky.person },
    ];
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-yellow-500/30 bg-yellow-900/10 px-4 py-3 backdrop-blur-sm"
          >
            <span className="text-lg">{item.icon}</span>
            <p className="mt-1 text-xs text-yellow-400/80">{item.label}</p>
            <p className="text-sm font-medium text-yellow-300">{item.value}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      role="tabpanel"
      aria-hidden={!isVisible}
      className={isVisible ? "relative w-full" : "hidden"}
    >
      <div className="relative isolate min-h-[100svh] w-full">
        <div className="pointer-events-none absolute inset-0 z-0 bg-slate-950">
        <div className="absolute inset-0 bg-cover bg-center opacity-80" style={{ backgroundImage: "url('/bg_fortune.png')" }} />
        {isVisible && (
          <div className="absolute inset-0 overflow-hidden">
            <style>{`
              @keyframes twinkle { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; transform: scale(1.2); } }
              @keyframes shooting { 0% { transform: translate(0, 0) rotate(-45deg); opacity: 1; } 20% { opacity: 0; } 100% { transform: translate(-800px, 800px) rotate(-45deg); opacity: 0; } }
            `}</style>
            {Array.from({length: 30}).map((_, i) => (
              <div key={i} className="absolute bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" style={{
                top: `${Math.random() * 50}%`, left: `${Math.random() * 100}%`,
                width: `${Math.random() * 2 + 1}px`, height: `${Math.random() * 2 + 1}px`,
                animation: `twinkle ${Math.random() * 3 + 2}s infinite ease-in-out ${Math.random() * 2}s`
              }} />
            ))}
            <div className="absolute w-[120px] h-[1px] bg-gradient-to-r from-transparent to-white" style={{ top: '10%', left: '80%', animation: 'shooting 6s linear infinite 1s' }} />
            <div className="absolute w-[180px] h-[2px] bg-gradient-to-r from-transparent to-white/80" style={{ top: '0%', left: '60%', animation: 'shooting 8s linear infinite 4s' }} />
            <div className="absolute w-[90px] h-[2px] bg-gradient-to-r from-transparent to-yellow-100/60" style={{ top: '15%', left: '90%', animation: 'shooting 11s linear infinite 7s' }} />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 py-6">
        {!isLoading && !showResult && (
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md"
          >
            <h2 className="text-center text-lg font-medium text-yellow-400 mb-6">
              오늘의 운세
            </h2>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm text-yellow-400/80">이름</label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="이름을 입력하세요"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-slate-800/80 shadow-inner px-4 py-3 text-white placeholder-white/30 focus:border-yellow-500/50 focus:outline-none focus:ring-2 focus:ring-yellow-500/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-yellow-400/80">성별</label>
                <div className="flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      checked={gender === "male"}
                      onChange={() => setGender("male")}
                      className="accent-yellow-500"
                    />
                    <span className="text-white/90">남</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      checked={gender === "female"}
                      onChange={() => setGender("female")}
                      className="accent-yellow-500"
                    />
                    <span className="text-white/90">여</span>
                  </label>
                </div>
              </div>

              <div>
              <label className="mb-2 block text-sm text-yellow-400/80">생년월일</label>
              <input type="tel" maxLength={10} placeholder="예: 19801013" value={birthDate} onChange={(e) => {
                  let val = e.target.value.replace(/[^0-9]/g, '');
                  if (val.length > 6) val = val.slice(0,4) + '-' + val.slice(4,6) + '-' + val.slice(6,8);
                  else if (val.length > 4) val = val.slice(0,4) + '-' + val.slice(4);
                  setBirthDate(val);
                }} className="w-full rounded-xl border border-white/20 bg-slate-800/80 shadow-inner px-4 py-3 text-white placeholder-white/30 focus:border-yellow-500/50 focus:outline-none focus:ring-2 focus:ring-yellow-500/30" />
              </div>

              <div>
                <label className="mb-2 block text-sm text-yellow-400/80">음/양력</label>
                <select
                  value={calendarType}
                  onChange={(e) => setCalendarType(e.target.value as "solar" | "lunar" | "lunar-leap")}
                  className="w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-white focus:border-yellow-500/50 focus:outline-none focus:ring-2 focus:ring-yellow-500/30"
                >
                  <option value="solar" className="bg-slate-800 text-white">양력</option>
                  <option value="lunar" className="bg-slate-800 text-white">음력 평달</option>
                  <option value="lunar-leap" className="bg-slate-800 text-white">음력 윤달</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-yellow-400/80">태어난 시간</label>
                <select
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-white focus:border-yellow-500/50 focus:outline-none focus:ring-2 focus:ring-yellow-500/30"
                >
                  {BIRTH_TIME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-800 text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 px-6 py-3 text-sm font-medium text-slate-900 shadow-lg shadow-yellow-500/25 transition-all hover:from-yellow-400 hover:to-amber-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
              >
                우주의 기운으로 운세 보기
              </button>
            </div>
          </form>
        )}

        {isLoading && (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-6">
            <div className="relative">
               <div className="h-14 w-14 animate-[fortune-spin_1.2s_linear_infinite] rounded-full border-2 border-yellow-500/30 border-t-yellow-400" />
              <div className="absolute inset-2 rounded-full border border-yellow-500/20" />
            </div>

            {!isPremiumLoading ? (
              <p className="text-center text-yellow-400/90 animate-[fortune-twinkle_1.5s_ease-in-out_infinite]">
                명리학 기반 운세 데이터를 스캔 중입니다...
              </p>
            ) : (
              <div className="w-full max-w-md space-y-4 text-center">
                <p className="text-lg font-semibold text-yellow-400">
                  전문가 심층 명리학 리포트 생성 중
                </p>

                <div className="space-y-2 rounded-2xl border border-yellow-500/20 bg-white/5 p-4 backdrop-blur-md">
                  {[
                    "원국 만세력 계산 정리",
                    "오행 분포와 일간 기운 분석",
                    "오늘 기준 해석 포인트 추출",
                    "심층 리포트 문장 정리",
                  ].map((label, index) => {
                    const done = premiumLoadingStep > index;
                    const active = premiumLoadingStep === index;

                    return (
                      <div
                        key={label}
                        className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                          done
                            ? "bg-yellow-500/15 text-yellow-300"
                            : active
                            ? "bg-white/10 text-white"
                            : "bg-transparent text-white/50"
                        }`}
                      >
                         <span>{label}</span>
                        <span>
                          {done ? "완료" : active ? "진행중" : "대기"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <p className="text-sm text-yellow-300/80">
                  사주 원국과 오늘 기준 흐름을 함께 정리하고 있습니다...
                </p>
              </div>
             )}
          </div>
        )}

        {showResult && !isLoading && fortuneData && (
          <div ref={shareResultRef} className="w-full max-w-2xl space-y-6 pt-4 pb-4">
            {displayLuckyItems(fortuneData.luckyItems)}

            {!premiumResult ? (
              <>
                {fortuneData.dailyGuide && (
                  <div className="rounded-xl border border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 to-amber-600/10 p-5 backdrop-blur-md mb-6">
                    <h3 className="mb-3 text-sm font-bold text-yellow-400">💡 오늘의 핵심 가이드</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-white/80">
                      <div className="bg-black/20 p-3 rounded-lg">
                        <span className="block text-yellow-500/80 text-xs mb-1">핵심 포인트</span>
                        {fortuneData.dailyGuide.point}
                      </div>
                      <div className="bg-black/20 p-3 rounded-lg">
                        <span className="block text-red-400/80 text-xs mb-1">오늘의 한 줄 전략</span>
                        {fortuneData.dailyGuide.strategy}
                      </div>
                      <div className="sm:col-span-2 bg-black/20 p-3 rounded-lg">
                        <span className="block text-green-400/80 text-xs mb-1">행동 지침</span>
                        {fortuneData.dailyGuide.action}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
                  {FORTUNE_CATEGORIES.map((cat, i) => {
                    const Icon = cat.icon;
                    const isActive = activeSubTab === i;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveSubTab(i)}
                        className={`
                          flex shrink-0 flex-col items-center gap-1 rounded-xl px-4 py-3 min-w-[80px]
                          transition-all duration-200
                          ${isActive
                            ? "bg-yellow-500/20 ring-2 ring-yellow-500/50 shadow-[0_0_12px_rgba(234,179,8,0.3)]"
                            : "bg-slate-800/60 border border-slate-600/50 hover:bg-slate-700/60"}
                        `}
                      >
                        <Icon className={`h-6 w-6 ${cat.color}`} strokeWidth={2} />
                        <span className={`text-xs font-medium ${isActive ? "text-yellow-400" : "text-white/80"}`}>
                          {cat.title}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md transition-all duration-300">
                  <h3 className="mb-3 text-base font-medium text-yellow-400">
                    {FORTUNE_CATEGORIES[activeSubTab].title}
                  </h3>
                  <p className="text-sm leading-relaxed text-white/80">
                    {fortuneData.texts[activeSubTab]}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
                  <h3 className="mb-4 text-sm font-medium text-yellow-400/90">
                    한눈에 보는 운세
                  </h3>
                  <div className="space-y-3">
                    {FORTUNE_CATEGORIES.map((cat, i) => (
                      <div key={cat.id} className="flex items-center gap-3">
                        <span className="w-16 shrink-0 text-xs text-white/80">{cat.title}</span>
                        <div className="flex-1 h-2 overflow-hidden rounded-full bg-slate-700">
                          <div
                            className="h-full rounded-full bg-yellow-400 transition-all duration-500"
                            style={{ width: `${fortuneData.scores[i]}%` }}
                          />
                        </div>
                        <span className="w-10 shrink-0 text-right text-xs text-yellow-400/90">
                           {fortuneData.scores[i]}점
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 행운 색깔 / 방향 / 조심할 점 카드 */}
                {(fortuneData.luckyColor || fortuneData.luckyDirection || fortuneData.caution) && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md space-y-3">
                    <h3 className="text-sm font-medium text-yellow-400/90">오늘의 행운 & 주의</h3>
                    {fortuneData.luckyColor && (
                      <div className="flex items-start gap-3">
                        <span className="text-lg shrink-0">🎨</span>
                        <div>
                          <p className="text-xs font-semibold text-white/60 mb-0.5">행운 색깔</p>
                          <p className="text-sm text-white/90">{fortuneData.luckyColor}</p>
                        </div>
                      </div>
                    )}
                    {fortuneData.luckyDirection && (
                      <div className="flex items-start gap-3">
                        <span className="text-lg shrink-0">🧭</span>
                        <div>
                          <p className="text-xs font-semibold text-white/60 mb-0.5">행운 방향</p>
                          <p className="text-sm text-white/90">{fortuneData.luckyDirection}</p>
                        </div>
                      </div>
                    )}
                    {fortuneData.caution && (
                      <div className="flex items-start gap-3">
                        <span className="text-lg shrink-0">⚠️</span>
                        <div>
                          <p className="text-xs font-semibold text-white/60 mb-0.5">오늘 조심할 점</p>
                          <p className="text-sm text-white/90">{fortuneData.caution}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                <div className="grid grid-cols-3 gap-3">
  <button
    type="button"
    onClick={handleFortuneLinkShare}
    className="h-[88px] w-full rounded-2xl border border-sky-500/40 bg-sky-500/10 px-2 text-sm font-bold text-sky-300 transition-all hover:bg-sky-500/20 active:scale-95 flex items-center justify-center text-center leading-tight"
  >
    🔗 링크 공유
  </button>

  <button
    type="button"
    onClick={handleShare}
    className="h-[88px] w-full rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-2 text-sm font-bold text-yellow-400 transition-all hover:bg-yellow-500/20 active:scale-95 flex items-center justify-center text-center leading-tight"
  >
    🖼️ 이미지 공유
  </button>

  <button
    type="button"
    onClick={handleReset}
    className="h-[88px] w-full rounded-2xl border border-white/20 bg-white/5 px-2 text-sm font-bold text-white/80 transition-all hover:bg-white/10 active:scale-95 flex items-center justify-center text-center leading-tight"
  >
    ↺ 다시 하기 (처음으로)
  </button>
</div>
                </div>

                <button
                  type="button"
                  onClick={handlePremium}
                  className="w-full rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 px-6 py-4 text-base font-bold text-slate-900 shadow-lg shadow-yellow-500/25 transition-all hover:from-yellow-400 hover:to-amber-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 flex items-center justify-center gap-2"
                >
                  <span>✨</span> 상세 운세 리포트 보기
                </button>
              </>
            ) : (
              <>
                {displayBaziChartPremium(premiumBaziChart)}

                {premiumDaeunInfo && (
                  <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-4 text-center text-base font-semibold text-black">
                      당신의 대운 (10년 주기 운세 변화)
                    </h3>
                    <p className="mb-4 text-sm text-slate-700">
                      귀하는 {premiumDaeunInfo.startAge}살을 기준으로 운세의 큰 변화가 일어납니다.
                    </p>
                    <div className="space-y-3 rounded border border-slate-200 bg-slate-50 p-4">
                      <div>
                        <span className="text-xs font-medium text-slate-500">현재 대운</span>
                        <p className="mt-1 font-serif text-lg font-bold text-black">
                          {premiumDaeunInfo.currentCycle}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-slate-500">현재 대운 특징</span>
                        <p className="mt-1 text-sm leading-relaxed text-slate-800">
                          {premiumDaeunInfo.currentDescription}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border-2 border-yellow-500/50 bg-yellow-900/10 p-6 backdrop-blur-md shadow-2xl shadow-yellow-500/10">
                  <h2 className="mb-6 text-center text-xl font-bold text-yellow-400">
                    ✨ 전문가 심층 명리학 리포트
                  </h2>

                  <div className="space-y-10">
                  {[
                    { key: "daeun", title: "[원국 흐름 해석]", content: premiumResult.daeun },
                    { key: "monthlyAdvice", title: "[오늘의 핵심 조언]", content: premiumResult.monthlyAdvice },
                    { key: "wealth", title: "[재물운]", content: premiumResult.wealth },
                    { key: "love", title: "[연애운]", content: premiumResult.love },
                    { key: "career", title: "[직장·진로운]", content: premiumResult.career },
                    { key: "health", title: "[건강운]", content: premiumResult.health },
                  ].map(({ key, title, content }) => (
                      <section key={key} className="space-y-4">
                        <h3 className="text-base font-semibold text-yellow-400">
                          {title}
                        </h3>
                        <p className="leading-loose text-white/90 text-slate-200 whitespace-pre-wrap">
                          {content}
                        </p>
                      </section>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
  <div className="grid grid-cols-2 gap-3">
    <button
      type="button"
      onClick={handleFortuneLinkShare}
      className="min-h-[88px] w-full rounded-2xl border border-sky-500/40 bg-sky-500/10 px-3 py-4 text-sm font-bold text-sky-300 transition-all hover:bg-sky-500/20 active:scale-95 flex flex-col items-center justify-center text-center"
    >
      <span className="text-xl leading-none">🔗</span>
      <span className="mt-2">링크 공유</span>
    </button>

    <button
      type="button"
      onClick={handleShare}
      className="min-h-[88px] w-full rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-3 py-4 text-sm font-bold text-yellow-400 transition-all hover:bg-yellow-500/20 active:scale-95 flex flex-col items-center justify-center text-center"
    >
      <span className="text-xl leading-none">🖼️</span>
      <span className="mt-2">이미지 공유</span>
    </button>
  </div>

  <button
    type="button"
    onClick={handleReset}
    className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-4 text-sm font-bold text-white/80 transition-all hover:bg-white/10 active:scale-95"
  >
    ↺ 다시 하기 (처음으로)
  </button>
</div>
              </>
            )}
          </div>
        )}

        {showPremiumModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setShowPremiumModal(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl border-2 border-yellow-500/50 bg-slate-900/90 p-6 shadow-2xl shadow-yellow-500/10 backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-4 text-center text-lg font-semibold text-yellow-400">
                ✨ 전문가 심층 명리학 리포트
              </h3>
              <p className="mb-6 text-center text-sm text-white/70">
                대운과 재물·연애·직장·건강운 심층 분석 리포트를 바로 불러옵니다.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPremiumModal(false)}
                  className="flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handlePremiumConfirm}
                  className="flex-1 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 px-4 py-3 text-sm font-bold text-slate-900 shadow-lg shadow-yellow-500/25 transition-all hover:from-yellow-400 hover:to-amber-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                >
                  ▶ 리포트 불러오기
                </button>
              </div>
            </div>
          </div>
        )}
        {/* 🚀 구글 애드센스 심사 통과를 위한 SEO 전문 텍스트 블록 (봇 먹이용) */}
        <SeoAccordion title="명운(命運) - 정통 명리학과 현대 AI 기술의 만남 ▾" items={[
          { q: "명운(命運) 서비스란?", a: "명운(命運)은 수천 년간 전해져 내려온 동양 철학의 정수인 사주명리학(四柱命理學)을 바탕으로, 현대인의 삶에 필요한 지혜와 통찰을 제공하는 전문 운세 분석 플랫폼입니다. 인간이 태어난 연, 월, 일, 시의 네 기둥(四柱)과 여덟 글자(八字)를 분석하여 선천적인 기운과 후천적인 운의 흐름을 과학적이고 통계적인 접근으로 해석합니다." },
          { q: "오늘의 운세는 어떻게 분석되나요?", a: "당사의 서비스는 단순한 흥미 위주의 운세가 아닌, 음양오행(陰陽五行)의 상생상극(相生相剋) 원리를 정밀하게 스캐닝하는 고도화된 알고리즘을 채택하고 있습니다. 매일 업데이트되는 오늘의 운세부터, 심층적인 성격 분석, 재물운, 애정운, 그리고 대인관계의 궁합에 이르기까지 다각적인 인생의 길잡이를 제시합니다." },
          { q: "명운이 제공하는 서비스 범위", a: "관상학과 성명학 데이터를 융합한 이름 풀이 서비스를 통해 개인의 고유한 특성을 파악하고, 다가올 미래의 불확실성을 긍정적인 방향으로 개척할 수 있도록 돕습니다. 사용자가 스스로의 운명을 이해하고 더 나은 선택을 할 수 있도록, 신뢰할 수 있는 데이터 기반의 라이프 카운슬링을 제공하는 것을 목표로 합니다." },
        ]} />

      </div>
      </div>
    </div>
  );
}

type WishRow = { id: string | number; content: string; created_at?: string };
type PremiumPeriod = "24h" | "10d";
type PremiumNameDisplay = "anonymous" | "real" | "partial";

type PremiumWish = {
  id: string | number;
  content: string;
  badge: string;
  period: PremiumPeriod;
  createdAt: number;
};

function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type WishDbRow = {
  id: string | number;
  content: string;
  created_at?: string;
  duration?: string;
  display_mode?: "anonymous" | "real" | "partial" | string;
  display_name?: string;
};

function DreamTab({ isVisible, onNavigate }: { isVisible: boolean, onNavigate: (id: TabId) => void }) {
  const [dreamInput, setDreamInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resultData, setResultData] = useState<any>(null);

  const handleDreamAnalyze = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dreamInput.trim()) return alert("꿈 내용을 입력해 주세요.");
    
        supabase.rpc('increment_tab_click', { target_tab_id: 'dream' }).then(({ error }) => { if(error) console.error('꿈 에러:', error) });
        setIsLoading(true);
    setResultData(null);

    try {
      const res = await fetch("/api/dream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dreamText: dreamInput }),
      });
      if (!res.ok) throw new Error("해몽 서버 접속에 실패했습니다. 잠시 후 다시 시도해주세요.");
      
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } 
      catch (e) { throw new Error("꿈 해몽 AI 서버가 혼잡합니다. 1분 뒤 다시 시도해주세요!"); }
      
      if (data.error) throw new Error(data.error);
      setResultData(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "해몽 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div role="tabpanel" aria-hidden={!isVisible} className={isVisible ? "relative w-full" : "hidden"}>
      <div className="relative isolate min-h-[100svh] w-full">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-slate-900">
        <style>{`
          @keyframes floatDream {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
          }
          @keyframes pulseGlow {
            0%, 100% { box-shadow: 0 0 30px rgba(255,255,255,0.2); }
            50% { box-shadow: 0 0 60px rgba(255,255,255,0.7); }
          }
        `}</style>
        <div 
          className="absolute inset-0 bg-cover bg-center" 
          style={{ backgroundImage: "url('/bg_dream.png')" }} 
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 pt-4 pb-6">
        {!isLoading && !resultData && (
          <form onSubmit={handleDreamAnalyze} className="w-full max-w-md rounded-3xl border border-white/20 bg-slate-900/80 p-8 backdrop-blur-xl shadow-[0_0_40px_rgba(0,0,0,0.5)]">
            <div className="text-center mb-6">
                <span className="inline-block px-3 py-1 mb-3 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold tracking-widest drop-shadow-md">DREAM ANALYSIS</span>
                <h2 className="text-2xl font-extrabold text-blue-200 drop-shadow-lg">무의식의 세계, 꿈 해몽</h2>
            </div>
            
            <p className="text-center text-sm text-white mb-6 leading-relaxed font-medium drop-shadow-md">
              어젯밤 어떤 꿈을 꾸셨나요?<br/>최대한 자세히 적어주시면 정확도가 올라갑니다.
            </p>
            
            <textarea
              value={dreamInput}
              onChange={(e) => setDreamInput(e.target.value)}
              placeholder="예: 호랑이가 집 안으로 들어와서 나를 쳐다보는 꿈을 꿨어요..."
              rows={4}
              className="w-full resize-none rounded-xl border border-white/20 bg-black/60 px-5 py-4 text-white placeholder-white/40 focus:border-blue-400 focus:bg-black/80 focus:outline-none focus:ring-2 focus:ring-blue-500/50 mb-6 transition-all shadow-inner"
            />
            <button type="submit" disabled={!dreamInput.trim()} className="w-full rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100">
              🌙 꿈의 의미 분석하기
            </button>
          </form>
        )}

        {isLoading && (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-8 mt-4">
            
            <div 
              className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full border-[6px] border-white/30 overflow-hidden" 
              style={{ animation: "floatDream 3s ease-in-out infinite, pulseGlow 2s ease-in-out infinite" }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="/loading_dream.jpg" 
                  onError={(e) => { e.currentTarget.src = '/loading_dream.png'; }}
                  alt="꿈 꾸는 로딩" 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-white/20 mix-blend-overlay" />
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-3 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 px-6 py-3 shadow-xl">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-400/30 border-t-blue-300" />
                  <p className="text-blue-200 font-bold text-sm tracking-wide">무의식의 세계를 스캐닝 중입니다...</p>
              </div>
              <p className="text-xs text-white/50 animate-pulse">잠시만 기다려주세요</p>
            </div>

          </div>
        )}

        {resultData && !isLoading && (
          <div className="w-full max-w-md space-y-5 animate-fade-in-up mt-4">
            <div className="rounded-3xl border border-white/20 bg-slate-900/85 p-6 backdrop-blur-xl shadow-[0_0_40px_rgba(0,0,0,0.5)]">
              <div className="flex justify-between items-center mb-5 border-b border-white/10 pb-4">
                <span className={`px-4 py-1.5 text-sm font-bold rounded-full ${resultData.type.includes("길몽") ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50" : resultData.type.includes("흉몽") ? "bg-red-500/20 text-red-400 border border-red-500/50" : "bg-blue-500/20 text-blue-400 border border-blue-500/50"}`}>
                  {resultData.type}
                </span>
                <span className="text-sm font-bold text-white/90">길흉 점수: <span className={`text-lg ${resultData.score >= 70 ? "text-yellow-400" : "text-red-400"}`}>{resultData.score}점</span></span>
              </div>
              
              <h3 className="text-xl font-bold text-blue-300 mb-4 leading-relaxed break-keep">{resultData.summary}</h3>
              <p className="text-sm text-white/90 leading-loose break-keep mb-6 p-5 rounded-2xl bg-black/40 border border-white/10 shadow-inner">{resultData.details}</p>
              
              <div className="rounded-2xl bg-indigo-900/40 border border-indigo-500/40 p-5 mb-6">
                <p className="text-xs font-bold text-indigo-300 mb-2 flex items-center gap-2"><span>💡</span> 오늘의 행동 지침</p>
                <p className="text-sm text-white font-medium leading-relaxed">{resultData.actionGuide}</p>
              </div>

              {resultData.type.includes("길몽") && resultData.score >= 70 && (
                <button onClick={() => onNavigate('lotto')} className="w-full mb-3 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 px-4 py-4 text-base font-bold text-slate-900 shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:scale-[1.02] transition-transform animate-bounce">
                  ✨ 엄청난 길몽입니다! 행운의 로또 번호 뽑으러 가기 ➔
                </button>
              )}
              {resultData.type.includes("흉몽") && resultData.score <= 40 && (
                <button onClick={() => onNavigate('altar')} className="w-full mb-3 rounded-2xl bg-gradient-to-r from-red-900 to-slate-800 px-4 py-4 text-base font-bold text-white shadow-[0_0_20px_rgba(153,27,27,0.4)] border border-red-500/50 hover:scale-[1.02] transition-transform">
                  🔥 찝찝한 기운 날리기! 제단에서 향 피우고 액땜하기 ➔
                </button>
              )}

              {/* 🚀 스마트폰 자체 공유창 띄우기 (카카오톡 다이렉트 전송) */}
              {resultData.db_id && (
                <button 
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/dream/${resultData.db_id}`;
                    const shareData = { 
                      title: "소름돋는 꿈 해몽 결과", 
                      text: "나의 무의식이 보내는 메시지를 확인해보세요!", 
                      url: url 
                    };
                    // 스마트폰이면 공유창 띄우고, PC면 링크 복사
                    if (navigator.share) { 
                      navigator.share(shareData).catch(() => {}); 
                    } else { 
                      navigator.clipboard.writeText(url); 
                      alert("✨ 링크가 복사되었습니다!\n블로그, 카톡, 카페 등에 공유해보세요."); 
                    }
                  }} 
                  className="w-full mb-3 rounded-2xl border border-blue-500/40 bg-blue-500/10 px-4 py-4 text-sm font-bold text-blue-300 hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-2"
                >
                  🔗 이 해몽 결과 공유하기
                </button>
              )}

<button onClick={() => setResultData(null)} className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-4 text-sm font-medium text-white/80 hover:bg-white/10 transition-colors">
                다른 꿈 해몽하기
              </button>
            </div>
          </div>
        )}

        <SeoAccordion title="꿈 해몽이란 무엇인가요? ▾" items={[
          { q: "꿈 해몽(解夢)의 원리", a: "동양 철학에서 꿈은 우주의 기운과 무의식이 만나는 신비로운 공간으로 여겨져 왔습니다. 꿈은 정몽(正夢·예지몽), 반몽(反夢·반대로 실현), 잡몽(雜夢·심리 반영)으로 나뉩니다." },
          { q: "대표적인 길몽(吉夢)의 종류", a: "용이 하늘로 올라가는 꿈은 큰 성공과 출세를, 살찐 돼지가 집으로 들어오는 꿈은 재물운을, 밝게 빛나는 태양이나 보름달은 명예와 성공을, 맑은 물이 흐르는 꿈은 재물운과 건강운 상승을 나타냅니다." },
          { q: "꿈 해몽을 현명하게 활용하는 방법", a: "좋은 꿈은 긍정적인 에너지로, 불안한 꿈은 주변을 점검하는 계기로 삼는 것이 지혜로운 활용법입니다. 꿈은 현재 나의 심리 상태와 잠재의식을 반영합니다." },
        ]} />

      </div>
      </div>
    </div>
  );
}

/** 제단 탭 하단 푸터 — GlobalSiteFooter와 동일 약관/사업자 문구 */
const ALTAR_FOOTER_TERMS =
  "제1조 (목적)\n본 약관은 서비스의 이용조건 및 절차, 이용자와 회사의 권리, 의무, 책임사항을 규정함을 목적으로 합니다.\n\n제2조 (서비스의 성격)\n본 서비스에서 제공하는 모든 결과는 통계적, 학술적 해석에 기반하며 절대적인 사실이나 미래를 보장하지 않습니다.\n\n제3조 (서비스 제공 시기)\n본 서비스에서 제공하는 모든 유료 서비스(디지털 콘텐츠)는 결제 완료 후 즉시 이용 가능합니다.";
const ALTAR_FOOTER_PRIVACY =
  "1. 수집하는 개인정보 항목\n회사는 회원가입 없이 서비스를 제공하며, 사주 분석을 위해 입력하신 생년월일, 성별, 이름 등은 서버에 영구 저장되지 않고 분석 즉시 폐기됩니다.\n\n2. 쿠키의 사용\n서비스 편의를 위해 기기 내부에 일부 설정(예: 프리미엄 해제 상태)이 임시 저장될 수 있습니다.";
const ALTAR_FOOTER_REFUND =
  "[디지털 콘텐츠 환불 규정 안내]\n\n본 서비스에서 제공되는 모든 유료 서비스는 '디지털 콘텐츠'에 해당하며, 관련 법령에 의거하여 다음과 같이 환불 정책을 운영합니다.\n\n1. 환불 기준 (청약철회)\n- 이용권을 결제하였으나 실제 서비스를 전혀 이용하지 않은 경우(결과 열람 전), 결제일로부터 7일 이내에 고객센터를 통해 100% 환불을 요청하실 수 있습니다.\n\n2. 시스템 오류 및 서비스 장애\n- 결제는 정상적으로 완료되었으나 시스템 오류로 인해 결과 화면을 전혀 열람하지 못한 경우, 고객센터 확인을 거쳐 즉시 100% 환불 또는 서비스 재제공 처리를 해드립니다.\n\n3. 환불 제한 사항\n- 전자상거래법 제17조 제2항 제5호에 따라, 소비자의 사용 또는 일부 소비로 재화 등의 가치가 현저히 감소한 경우(예: 운세/관상/번호 추출 결과를 이미 열람한 경우)에는 청약철회가 제한됩니다.";

function AltarTab({ isVisible }: { isVisible: boolean }) {
  // 🚀 [추가] 촛불 애니메이션 및 사운드 상태 (기존 432Hz BGM과 충돌하지 않음)
  const [isCandleOn, setIsCandleOn] = useState(false);
  const bellAudioRef = useRef<HTMLAudioElement | null>(null);
  const fireAudioRef = useRef<HTMLAudioElement | null>(null);
  const talismanRef = useRef<HTMLDivElement | null>(null); // 🚀 부적 카드 캡처용
  const [isPremiumGlow, setIsPremiumGlow] = useState(false); // 🚀 프리미엄 황금빛 공양 효과
  const [lastWish, setLastWish] = useState(""); // 🚀 방금 등록한 소원 기억하기 (부적용)
  const [needsInteraction, setNeedsInteraction] = useState(false); // 🚀 모바일 오디오 강제 재생용 터치 대기 상태

  // 🚀 부적 카드 공유 기능
  const handleAltarShare = async () => {
    if (!wishText.trim() && wishes.length === 0) return alert("먼저 간절한 소원을 작성해주세요!");
    await captureAndShareElement(talismanRef.current, {
      fileName: "miracle-talisman.png",
      title: "기적의 제단 소원 부적",
      text: `간절한 소원이 담긴 부적입니다.\n${window.location.origin}`
    });
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      bellAudioRef.current = new Audio("/bell.mp3");
      fireAudioRef.current = new Audio("/fire.mp3");
      if (fireAudioRef.current) {
        fireAudioRef.current.loop = true;
        fireAudioRef.current.volume = 0.5;
      }
    }
    return () => {
      if (fireAudioRef.current) {
        fireAudioRef.current.pause();
        fireAudioRef.current.currentTime = 0;
      }
    };
  }, []);
  const [wishText, setWishText] = useState("");
  const [wishes, setWishes] = useState<WishRow[]>([]);
  const [premiumWishes, setPremiumWishes] = useState<PremiumWish[]>([]);
  const [floatingWishes, setFloatingWishes] = useState<string[]>([]);
  const [mockWishes, setMockWishes] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return shuffleArray(FLOATING_WISHES_POOL).slice(0, 11);
    }
  
    const saved = localStorage.getItem("altar-mock-wishes");
    const savedAt = localStorage.getItem("altar-mock-wishes-time");
  
    if (saved && savedAt) {
      const age = Date.now() - Number(savedAt);
      const twelveHours = 12 * 60 * 60 * 1000;
  
      if (age < twelveHours) {
        try {
          return JSON.parse(saved);
        } catch {
          // 무시하고 새로 생성
        }
      }
    }
  
    const next = shuffleArray(FLOATING_WISHES_POOL).slice(0, 11);
    localStorage.setItem("altar-mock-wishes", JSON.stringify(next));
    localStorage.setItem("altar-mock-wishes-time", String(Date.now()));
    return next;
  });
  const [isCooldown, setIsCooldown] = useState(false);
  const [isSubmittingFreeWish, setIsSubmittingFreeWish] = useState(false);
  const [showWishToast, setShowWishToast] = useState(false);
  const [wishToastMessage, setWishToastMessage] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedPayMethod, setSelectedPayMethod] = useState<PayMethodPg>("kpn");
  const [premiumPeriod, setPremiumPeriod] = useState<PremiumPeriod>("24h");
  const [premiumNameDisplay, setPremiumNameDisplay] = useState<PremiumNameDisplay>("anonymous");
  const [premiumNameInput, setPremiumNameInput] = useState("");
  const [premiumWishText, setPremiumWishText] = useState("");
  const [altarFooterPolicy, setAltarFooterPolicy] = useState<"terms" | "privacy" | "refund" | null>(null);
  const [altarFooterCompany, setAltarFooterCompany] = useState(false);
  const [countdownNow, setCountdownNow] = useState(Date.now());
  const audioRef = useRef<HTMLAudioElement>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined" || !isVisible) return;
    const p = new URLSearchParams(window.location.search);
    if (!extractPaymentReturnId(p) && p.get("imp_success") !== "true" && p.get("success") !== "true") return;
    const st = readPendingPaymentState();
    if (st?.flow !== "altar" || !st.wish) return;
    setPremiumWishText(st.wish.wishText);
    setPremiumPeriod((st.wish.period === "10d" ? "10d" : "24h") as PremiumPeriod);
    setPremiumNameDisplay(st.wish.nameDisplay as PremiumNameDisplay);
    setPremiumNameInput(st.wish.nameInput || "");
  }, [isVisible]);
  
  useEffect(() => {
    const refreshMockWishes = () => {
      const next = shuffleArray(FLOATING_WISHES_POOL).slice(0, 11);
      setMockWishes(next);
      localStorage.setItem("altar-mock-wishes", JSON.stringify(next));
      localStorage.setItem("altar-mock-wishes-time", String(Date.now()));
    };
  
    const id = setInterval(refreshMockWishes, 12 * 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  
  useEffect(() => {
    if (!isVisible) {
      audioRef.current?.pause();
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : 0.25;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // 🚀 스마트폰이 자동재생을 막았다면? 화면 터치 시 즉시 재생되도록 우회!
        const playOnInteract = () => {
          audio.play().catch(()=>{});
          document.removeEventListener("click", playOnInteract);
          document.removeEventListener("touchstart", playOnInteract);
        };
        document.addEventListener("click", playOnInteract);
        document.addEventListener("touchstart", playOnInteract);
      });
    }
    return () => {
      audio.pause();
    };
  }, [isVisible, isMuted]);
  
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const filterFreeWishes = (list: WishRow[]) => {
    const cutoff = Date.now() - ONE_HOUR_MS;
    return list.filter((w) => {
      const at = w.created_at ? new Date(w.created_at).getTime() : 0;
      return at >= cutoff;
    });
  };

  const filterPremiumWishes = (list: PremiumWish[]) => {
    return list.filter((pw) => {
      const hours = pw.period === "24h" ? 24 : 240;
      const cutoff = pw.createdAt + hours * 60 * 60 * 1000;
      return Date.now() < cutoff;
    });
  };

  const getPremiumRemainingMs = (pw: PremiumWish) => {
    const hours = pw.period === "24h" ? 24 : 240;
    const end = pw.createdAt + hours * 60 * 60 * 1000;
    return Math.max(0, end - Date.now());
  };

  const formatCountdown = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const id = setInterval(() => setCountdownNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  
  useEffect(() => {
    setPremiumWishes((prev) => filterPremiumWishes(prev));
  }, [countdownNow]);
  
  const fetchWishes = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("wishes").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) {
        console.error("데이터 불러오기 실패:", error);
        return;
      }
      const rows = (data || []) as WishDbRow[];
      const now = Date.now();
      const filtered = rows.filter((wish) => {
        const wishTime = new Date(wish.created_at || 0).getTime();
        if (wish.duration === "10d" && now - wishTime < 10 * 24 * 60 * 60 * 1000) return true;
        if (wish.duration === "24h" && now - wishTime < 24 * 60 * 60 * 1000) return true;
        if ((!wish.duration || wish.duration === "1h") && now - wishTime < 60 * 60 * 1000) return true;
        return false;
      });
      const free: WishRow[] = [];
      const premium: PremiumWish[] = [];
      for (const row of filtered) {
        const at = row.created_at ? new Date(row.created_at).getTime() : 0;
        if (row.duration === "10d" || row.duration === "24h") {
          const period: PremiumPeriod = row.duration === "10d" ? "10d" : "24h";
          const periodLabel = period === "24h" ? "24시간" : "특별기원";
        
          let nameText = "익명";
          if (row.display_mode === "real" && row.display_name?.trim()) {
            nameText = row.display_name.trim();
          } else if (row.display_mode === "partial" && row.display_name?.trim()) {
            const raw = row.display_name.trim();
            if (raw.length >= 2) {
              nameText =
                raw[0] +
                "*".repeat(Math.max(1, raw.length - 2)) +
                raw[raw.length - 1];
            } else {
              nameText = raw;
            }
          }
        
          const badge = `[✨ ${nameText} 님의 ${periodLabel} 기원]`;
          premium.push({
            id: row.id,
            content: row.content,
            badge,
            period,
            createdAt: at,
          });
        } else {
          free.push({
            id: row.id,
            content: row.content,
            created_at: row.created_at,
          });
        }
      }
      setWishes(free);
      setPremiumWishes((prev) => {
        const localOnly = prev.filter((p) => String(p.id).startsWith("prem-"));
        // 🚀 DB에서 가져온 진짜 소원과, 화면에 먼저 띄운 가짜 소원이 겹치면 가짜를 지워버립니다 (모바일 중복 버그 완벽 해결!)
        const realContents = premium.map(p => p.content);
        const filteredLocal = localOnly.filter(l => !realContents.includes(l.content));
        return [...premium, ...filteredLocal];
      });
    } catch (err) {
      console.error("데이터 불러오기 실패:", err);
    }
  }, []);
  
  useEffect(() => {
    fetchWishes();
  }, [fetchWishes]);

  // 🚀 모바일 프리미엄 결제 성공 시 즉시 애니메이션 팡! & 리스트 강제 새로고침
  useEffect(() => {
    const handlePremiumSuccess = (e: Event) => {
      const customEvent = e as CustomEvent;
      const wishData = customEvent.detail;
      
      if (wishData) {
        setLastWish(wishData.wishText);
        // 🚀 DB 기다리지 않고 화면에 즉시 띄움 (버그 완벽 해결)
        const newPremiumWish: PremiumWish = {
          id: `prem-opt-${Date.now()}`,
          content: wishData.wishText,
          badge: `[✨ ${wishData.nameDisplay === "anonymous" ? "익명" : wishData.nameInput || "익명"} 님의 ${wishData.period === "24h" ? "24시간" : "특별기원"}]`,
          period: wishData.period,
          createdAt: Date.now()
        };
        setPremiumWishes(prev => [newPremiumWish, ...prev]);
      }
      
      fetchWishes(); // DB 동기화
      setIsCandleOn(true);
      setIsPremiumGlow(true);
      
      // 🚀 모바일 오디오 강제 재생 돌파 (실패 시 터치 유도 화면 띄움)
      try {
        const p1 = bellAudioRef.current?.play();
        const p2 = fireAudioRef.current?.play();
        const p3 = audioRef.current?.play();
        Promise.all([p1, p2, p3]).catch(() => setNeedsInteraction(true));
      } catch (err) {
        setNeedsInteraction(true);
      }
      setTimeout(() => { setIsCandleOn(false); setIsPremiumGlow(false); if(fireAudioRef.current) fireAudioRef.current.pause(); }, 6000);
    };

    window.addEventListener("premiumAltarSuccess", handlePremiumSuccess as EventListener);
    return () => window.removeEventListener("premiumAltarSuccess", handlePremiumSuccess as EventListener);
  }, [fetchWishes]);
  
  useEffect(() => {
    const freeFiltered = filterFreeWishes(wishes);
    setFloatingWishes([...freeFiltered.map((w) => w.content), ...mockWishes].slice(-25));
  }, [wishes, mockWishes]);
  
  useEffect(() => {
    if (!isVisible) return;

    const channel = supabase
      .channel("wishes-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wishes" },
        (payload) => {
          const row = payload.new as { id: string; content: string; created_at?: string };
          if (!row?.content) return;
      
          const opt = lastOptimisticRef.current;
          if (opt && opt.text === row.content && Date.now() - opt.at < 5000) {
            lastOptimisticRef.current = null;
            return;
          }
          setWishes((prev) => filterFreeWishes([row as WishRow, ...prev]));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isVisible]);
  
  const activeWishCount = floatingWishes.length + filterPremiumWishes(premiumWishes).length;
  const activePremiumCount = filterPremiumWishes(premiumWishes).length;
  
  const handleMuteToggle = () => {
        const audio = audioRef.current;
        if (!audio) return;
        const nextMuted = !isMuted;
        audio.volume = nextMuted ? 0 : 0.25;
        if (bellAudioRef.current) bellAudioRef.current.muted = nextMuted;
        if (fireAudioRef.current) fireAudioRef.current.muted = nextMuted;
        setIsMuted(nextMuted);
      };

  const lastOptimisticRef = useRef<{ text: string; at: number } | null>(null);
  
  const handleSubmitFree = async () => {
    const text = wishText.trim();
    if (!text || isCooldown || isSubmittingFreeWish) return;
  
    supabase.rpc('increment_tab_click', { target_tab_id: 'altar' }).then(({ error }) => { if(error) console.error('제단 에러:', error) });
    setIsSubmittingFreeWish(true);
  
    try {
      await new Promise((r) => setTimeout(r, 1000));
      const optId = `opt-${Date.now()}`;
      const nowIso = new Date().toISOString();
  
      setWishes((prev) =>
        filterFreeWishes([{ id: optId, content: text, created_at: nowIso }, ...prev])
      );
      setLastWish(text); // 🚀 부적 카드를 위해 방금 적은 소원 기억
      setWishText("");
      lastOptimisticRef.current = { text, at: Date.now() };
  
      const { error } = await supabase.from("wishes").insert({ content: text });
      if (error) {
        console.error("Supabase Insert Error:", error);
        setWishes((prev) => prev.filter((w) => w.id !== optId));
        alert("소원 등록에 실패했습니다. 다시 시도해 주세요.");
        return;
      }
  
      setIsCooldown(true);
      setTimeout(() => setIsCooldown(false), 5000);

      // 🚀 [수정완료] 무료 소원 시각/청각 효과 트리거
      setIsCandleOn(true);
      if (bellAudioRef.current) { bellAudioRef.current.currentTime = 0; bellAudioRef.current.play().catch(e => console.log(e)); }
      if (fireAudioRef.current) { fireAudioRef.current.play().catch(e => console.log(e)); }
      setTimeout(() => { 
      setIsCandleOn(false); 
      if (fireAudioRef.current) fireAudioRef.current.pause(); // 🔥 모닥불 끄기
      }, 5000);

      alert("소원이 기적의 제단에 올려졌습니다. (1시간 유지)");
      } finally {
      setIsSubmittingFreeWish(false);
    }
  };
  
  const handleOpenPremiumModal = () => {
    setPremiumWishText(wishText.trim());
    setShowPremiumModal(true);
  };
  
  const getPremiumBadge = (): string => {
    const periodLabel = premiumPeriod === "24h" ? "24시간" : "특별기원";
    if (premiumNameDisplay === "anonymous") {
      return `[✨ 익명 님의 ${periodLabel} 기원]`;
    }
    const name = premiumNameInput.trim();
    if (premiumNameDisplay === "real") {
      return name ? `[✨ ${name} 님의 ${periodLabel} 기원]` : `[✨ 익명 님의 ${periodLabel} 기원]`;
    }
    if (premiumNameDisplay === "partial" && name.length >= 2) {
      const masked = name[0] + "*".repeat(Math.max(1, name.length - 2)) + name[name.length - 1];
      return `[✨ ${masked} 님의 ${periodLabel} 기원]`;
    }
    return `[✨ 익명 님의 ${periodLabel} 기원]`;
  };
  
  // 🚀 프리미엄 결제창 — 포트원 응답 가드 → PC만 즉시 서버 검증 → 성공 시에만 UI 반영
  const handlePremiumConfirm = async () => {
    if (!premiumWishText.trim()) return;

    if (typeof window !== "undefined") {
      const amount = premiumPeriod === "24h" ? 1900 : 6900;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      // 🚀 1. 운영자 절대 프리패스 (가짜 결제 ID 안 쓰고, 바로 DB에 직행!)
      if (localStorage.getItem("MASTER_ADMIN") === "true") {
        alert("✨ [운영자 프리패스] 결제 없이 즉시 프리미엄 소원을 제단에 올립니다!");
        
        setLastWish(premiumWishText); // 🚀 부적 카드를 위해 기억
        const newPremiumWish: PremiumWish = {
          id: `prem-opt-${Date.now()}`,
          content: premiumWishText,
          badge: `[✨ ${premiumNameDisplay === "anonymous" ? "익명" : premiumNameInput || "익명"} 님의 ${premiumPeriod === "24h" ? "24시간" : "특별기원"}]`,
          period: premiumPeriod,
          createdAt: Date.now()
        };
        setPremiumWishes(prev => [newPremiumWish, ...prev]);

        // 💡 백엔드 결제 검증 API를 건너뛰고 프론트에서 즉시 DB 저장
        supabase.from("wishes").insert({
          content: premiumWishText,
          duration: premiumPeriod,
          display_mode: premiumNameDisplay,
          display_name: premiumNameInput
        }).then(({ error }) => {
          if (error) {
             alert("🚨 제단 등록 실패: " + error.message);
             } else {
               // 🚀 [수정완료] 프리미엄 전용 시각/청각 효과 트리거
              setIsCandleOn(true);
              setIsPremiumGlow(true);
              if (bellAudioRef.current) { bellAudioRef.current.currentTime = 0; bellAudioRef.current.play().catch(e => console.log(e)); }
              if (fireAudioRef.current) { fireAudioRef.current.play().catch(e => console.log(e)); }
              setTimeout(() => { 
                setIsCandleOn(false); 
                setIsPremiumGlow(false); 
                if (fireAudioRef.current) fireAudioRef.current.pause(); // 🔥 모닥불 끄기
              }, 5000);
            
             alert("✨ 제단에 소원이 성공적으로 올라갔습니다!");
             setShowPremiumModal(false);
            setPremiumWishText("");
            setPremiumNameInput("");
            if (typeof fetchWishes === 'function') fetchWishes(); 
          }
        });
        
        return; // 일반 결제 로직으로 넘어가지 않게 완벽 차단!
      }

      // 2. 일반 유저 결제 로직 시작
      const name = premiumPeriod === "24h" ? "명운 제단 (24시간)" : "명운 제단 (10일)";
      
      const payData: any = {
        storeId: "store-dfe94d23-cfea-4a4d-a36a-0b1864b0903d",
        channelKey: selectedPayMethod === "kpn" ? "channel-key-47b05312-c2e5-4e20-8b76-afb3915eb765" : selectedPayMethod === "tosspay" ? "channel-key-ec9a613e-4407-413c-9ad1-921edb7b694e" : "channel-key-314bb395-3a71-48e6-a2a1-fed1d4ccb8c1",
        paymentId: `mid${Date.now()}${Math.random().toString(36).substring(2, 8)}`,
        orderName: name,
        totalAmount: amount,
        currency: "KRW",
        payMethod: selectedPayMethod === "kakaopay" ? "EASY_PAY" : selectedPayMethod === "tosspay" ? "EASY_PAY" : "CARD",
        customer: { email: "test@ymstudio.co.kr", fullName: "명운 사용자" },
      };

      let PortOne = (window as any).PortOne;
      if (!PortOne) {
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 500));
          PortOne = (window as any).PortOne;
          if (PortOne) break;
        }
      }
      if (!PortOne) { alert("🚨 결제 시스템 로딩 실패. 새로고침[F5] 해주세요!"); return; }
      if (isMobile) {
        const toolsOrigin = `${window.location.origin}/tools`;
        payData.redirectUrl = `${toolsOrigin}?tab=altar`;
        localStorage.setItem("pendingPaymentType", "altar");
        localStorage.setItem("pendingPremiumWish", JSON.stringify({
          wishText: premiumWishText,
          period: premiumPeriod,
          nameDisplay: premiumNameDisplay,
          nameInput: premiumNameInput,
          amount: amount
        }));
        savePendingPaymentData({ v: 1, tab: "altar", flow: "altar" });
        savePendingPaymentState({
          tab: "altar",
          flow: "altar",
          wish: {
            wishText: premiumWishText,
            period: premiumPeriod,
            nameDisplay: premiumNameDisplay,
            nameInput: premiumNameInput,
            amount,
          },
        });
      }
      const response = await PortOne.requestPayment(payData);
      const portOneFail = getPortOnePaymentFailureReason(response, { isMobile });
      if (portOneFail) {
        alert("결제가 취소되었습니다.");
        localStorage.removeItem("pendingPaymentType");
        localStorage.removeItem("pendingPremiumWish");
        clearPendingPaymentData();
        clearPendingPaymentState();
        return;
      }
      if (isMobile) {
        return;
      }
      try {
            const verifyRes = await fetch(PAYMENT_VERIFY_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imp_uid: (response as { paymentId: string }).paymentId,
                paymentId: (response as { paymentId: string }).paymentId,
                merchant_uid: (response as { paymentId: string }).paymentId,
                amount: amount,
                wishText: premiumWishText,
                period: premiumPeriod,
                nameDisplay: premiumNameDisplay,
                nameInput: premiumNameInput,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
                            // 🚀 [추가] PC 환경에서도 결제 즉시 제단에 소원이 짠! 하고 나타나도록 강제 업데이트
                            setLastWish(premiumWishText);
                            const newPremiumWish: PremiumWish = {
                              id: `prem-opt-${Date.now()}`,
                              content: premiumWishText,
                              badge: `[✨ ${premiumNameDisplay === "anonymous" ? "익명" : premiumNameInput || "익명"} 님의 ${premiumPeriod === "24h" ? "24시간" : "특별기원"}]`,
                              period: premiumPeriod,
                              createdAt: Date.now()
                            };
                            setPremiumWishes(prev => [newPremiumWish, ...prev]);

                            // 🚀 [수정완료] 프리미엄 전용 시각/청각 효과 트리거
                            setIsCandleOn(true);
                            setIsPremiumGlow(true);
                            if (bellAudioRef.current) { bellAudioRef.current.currentTime = 0; bellAudioRef.current.play().catch(e => console.log(e)); }
                            if (fireAudioRef.current) { fireAudioRef.current.play().catch(e => console.log(e)); }
                            setTimeout(() => { 
                              setIsCandleOn(false); 
                              setIsPremiumGlow(false); 
                              if (fireAudioRef.current) fireAudioRef.current.pause(); // 🔥 모닥불 끄기
                            }, 5000);

 alert("✨ 결제가 성공적으로 완료되었으며 제단에 소원이 올라갔습니다!");
 setShowPremiumModal(false);
              setPremiumWishText("");
              setPremiumNameInput("");
              if (typeof fetchWishes === 'function') fetchWishes(); 
            } else {
              alert(
                `결제 검증 오류: ${(verifyData.message && String(verifyData.message).trim()) || "서버 키·IAMPORT 설정을 확인해 주세요."}`,
              );
            }
      } catch (error) {
        console.error("제단 결제 검증:", error);
        alert("결제 검증 오류: 네트워크 또는 서버 응답을 확인해 주세요.");
        setShowPremiumModal(false);
      }
    }
  };

  const handlePremiumCancel = () => {
    setShowPremiumModal(false);
    setPremiumWishText("");
    setPremiumNameInput("");
  };

  const handleAltarFooterCopyrightDoubleClick = () => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("MASTER_ADMIN") === "true") {
      if (confirm("현재 운영자 모드입니다. 종료할까요?")) {
        localStorage.removeItem("MASTER_ADMIN");
        alert("운영자 모드가 종료되었습니다.");
        window.location.reload();
      }
      return;
    }
    const pwd = prompt("운영자 비밀번호를 입력하세요.");
    if (pwd === "s1223534") {
      localStorage.setItem("MASTER_ADMIN", "true");
      alert("✨ 운영자 모드 활성화! 모든 유료 서비스가 프리패스됩니다.");
      window.location.reload();
    } else if (pwd !== null) {
      alert("비밀번호가 일치하지 않습니다.");
    }
  };
  
  return (
    <div
      role="tabpanel"
      aria-hidden={!isVisible}
      className={isVisible ? "relative w-full bg-transparent min-h-[100dvh]" : "hidden"}
    >
      <div className="fixed inset-0 z-0 pointer-events-none">
        <video src="/초.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover" />
        {/* 🚀 촛불이 켜졌을 때 배경이 밝아지는 시각 효과 */}
        <div className="absolute inset-0 transition-colors duration-1000" style={{ backgroundColor: isCandleOn ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.5)' }} />
        <div className={`absolute inset-0 bg-gradient-to-t from-amber-500/30 to-transparent transition-opacity duration-1000 ${isCandleOn ? "opacity-100" : "opacity-0"}`} />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] w-full flex-col">
        <audio ref={audioRef} src="/432Hz_Candle_BGM.wav" loop />

        {showWishToast && (
          <div className="fixed left-1/2 top-24 z-[70] -translate-x-1/2 rounded-xl border border-yellow-500/40 bg-slate-900/90 px-5 py-3 text-sm font-medium text-yellow-300 shadow-lg shadow-yellow-500/20 backdrop-blur-md">
            {wishToastMessage}
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          {/* 🚀 프리미엄 소원: 화면 아래에서 위로 올라가는 애니메이션 */}
          <style>{`
            @keyframes float-up-premium {
              0% { top: 110%; opacity: 0; transform: translateX(-50%) scale(0.9); }
              10% { opacity: 1; transform: translateX(-50%) scale(1); }
              90% { opacity: 1; transform: translateX(-50%) scale(1); }
              100% { top: -20%; opacity: 0; transform: translateX(-50%) scale(0.9); }
            }
          `}</style>
          
          {(() => {
            const premiumFiltered = filterPremiumWishes(premiumWishes);
            return (
              <>
                {floatingWishes.map((wish, i) => (
                  <div
                    key={`wish-${i}`}
                    className="absolute"
                    style={{
                      left: `${15 + ((i * 17 + 5) % 70)}%`,
                      top: `${30 + (i * 11 % 41)}%`,
                      transform: "translateX(-50%)",
                      animation: `float-wish-center ${10 + (i % 9)}s ease-out infinite`,
                      animationDelay: `${(i * 0.7) % 8}s`,
                    }}
                  >
                    <p className="mx-auto break-words whitespace-normal max-w-[40vw] text-xs leading-snug text-center font-medium text-white/60 px-1">
                      {wish}
                    </p>
                  </div>
                ))}
                
                {/* 🚀 프리미엄 소원 렌더링 (제한 영구 해제: 결제한 모든 소원 노출) */}
                {premiumFiltered.map((pw, i) => {
                  const idLength = String(pw.id).length;
                  const isTenDays = pw.period === "10d";
                  
                  const leftPct = 15 + ((i * 25 + idLength * 7) % 70); // 양끝 짤림 방지
                  const duration = isTenDays ? 25 + (i % 10) : 20 + (i % 8); // 속도 다양화
                  // 🚀 새로 올라온 소원은 즉시 등장, 나머지는 겹치지 않게 화면 전체에 넓게 퍼뜨림
                  const delay = i === 0 ? "0s" : `-${(i * 7.3) % 30}s`; 
                  const remaining = getPremiumRemainingMs(pw);

                  return (
                    <div
                      key={pw.id}
                      className="absolute"
                      style={{
                        left: `${leftPct}%`,
                        animation: `float-up-premium ${duration}s linear infinite`,
                        animationDelay: delay,
                      }}
                    >
                      <div className="mx-auto flex max-w-[40vw] flex-col items-center justify-center bg-black/30 px-4 py-3 rounded-2xl border border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.15)] backdrop-blur-sm">
                        <p
                          className={`w-full break-words whitespace-normal max-w-[40vw] text-xs leading-snug text-center ${
                            isTenDays
                              ? "font-extrabold text-yellow-200 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]"
                              : "font-bold text-yellow-300 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]"
                          }`}
                        >
                          {pw.badge}
                        </p>
                        <p
                          className={`mt-1 w-full break-words whitespace-normal max-w-[40vw] text-xs leading-snug text-center ${
                            isTenDays
                              ? "font-extrabold text-yellow-200 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]"
                              : "font-bold text-yellow-300 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]"
                          }`}
                        >
                          {pw.content}
                        </p>
                        <p
                          className={`mt-1.5 w-full break-words whitespace-normal max-w-[40vw] text-xs leading-snug text-center font-medium ${isTenDays ? "text-amber-200/90" : "text-yellow-400/80"}`}
                        >
                          남은 시간: {formatCountdown(remaining)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </>
            );
          })()}
        </div>

        {/* 🚀 초소형 압축 입력창 영역 (화면 하단 밀착 & 가로 배치 강제) */}
        <div className="relative z-10 flex w-full max-w-md mx-auto flex-col items-center justify-end px-4 pb-1 mt-auto shrink-0">
          <div className="w-full rounded-xl border border-white/20 bg-black/60 p-3 backdrop-blur-md shadow-xl">
            <textarea
              value={wishText}
              onChange={(e) => setWishText(e.target.value)}
              placeholder="소원을 적어주세요..."
              rows={1}
              className="w-full resize-none rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-amber-50 placeholder-amber-200/60 focus:border-yellow-500/60 focus:outline-none focus:ring-1 focus:ring-yellow-500/40"
            />
            <div className="mt-1 flex items-center justify-between text-[10px] px-1">
              <span className="text-amber-100/70">전체 소원 {activeWishCount}개</span>
              <span className="text-yellow-300/80">프리미엄 {activePremiumCount}개</span>
            </div>
            
            {/* 🚀 무조건 가로 2칸으로 고정하는 grid 적용 */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={handleSubmitFree} disabled={isCooldown || isSubmittingFreeWish} className="w-full rounded-lg bg-gradient-to-r from-yellow-500 to-amber-600 px-1 py-2 text-xs font-bold text-slate-900 shadow-md shadow-yellow-500/25 transition-all hover:active:scale-95 disabled:opacity-50 break-keep">
                {isSubmittingFreeWish ? "진행중.." : isCooldown ? "5초 대기" : "일반 소원 띄우기"}
              </button>
              <button type="button" onClick={handleOpenPremiumModal} className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-rose-600 px-1 py-2 text-xs font-bold text-white shadow-md shadow-rose-500/25 transition-all hover:active:scale-95 break-keep">
                ✨ 프리미엄 소원 띄우기
              </button>
            </div>
            
            <button type="button" onClick={handleAltarShare} className="mt-2 w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-all active:scale-95 shadow-inner flex items-center justify-center gap-1.5">
              🔗 내 소원 부적 카드로 공유하기
            </button>
          </div>
        </div>

        <footer className="relative z-10 mt-4 w-full shrink-0 border-t border-white/10 bg-slate-950 pb-[env(safe-area-inset-bottom,0px)] text-slate-300 pointer-events-auto">
          <div className="mx-auto max-w-5xl px-4 pb-10 pt-6 sm:px-6">
            <p className="text-center text-[10px] leading-relaxed text-white/45">
              본 서비스는 희망과 위로를 나누는 공간으로 특정 종교와 무관하며 법적 효력을 갖지 않습니다.
            </p>
            <p className="mt-3 text-center text-[10px] leading-relaxed text-red-400/80 animate-pulse break-keep">
              ※ 욕설, 혐오, 정치, 비방 등 부적절한 내용은 통보 없이 즉시 삭제될 수 있습니다.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-x-3 gap-y-2 text-[11px] font-medium text-white/55">
              <button type="button" onClick={() => setAltarFooterPolicy("terms")} className="transition-colors hover:text-white">
                이용약관
              </button>
              <span aria-hidden>|</span>
              <button type="button" onClick={() => setAltarFooterPolicy("privacy")} className="transition-colors hover:text-white">
                개인정보처리방침
              </button>
              <span aria-hidden>|</span>
              <button type="button" onClick={() => setAltarFooterPolicy("refund")} className="transition-colors hover:text-white">
                환불정책
              </button>
              <span aria-hidden>|</span>
              <button
                type="button"
                onClick={() => setAltarFooterCompany((v) => !v)}
                className="flex items-center gap-1 transition-colors hover:text-white"
              >
                사업자 정보 {altarFooterCompany ? "▲" : "▼"}
              </button>
            </div>

            {altarFooterCompany ? (
              <div className="mx-auto mt-6 max-w-lg space-y-1.5 border-t border-white/10 pt-6 text-[10px] leading-relaxed text-white/40">
                <p className="font-bold text-white/55">와이엠 스튜디오 (YM Studio)</p>
                <p>대표자: 손용민 | 사업자등록번호: 510-21-21827</p>
                <p>주소: 충청남도 아산시 둔포면 운교길 129번길 14-71</p>
                <p>고객센터: 0507-1385-9994 | 이메일: support@ymsudio.co.kr</p>
                <p>통신판매업신고번호: 제 2026-충남아산-0479 호</p>
              </div>
            ) : null}

            <p
              onDoubleClick={handleAltarFooterCopyrightDoubleClick}
              className="mt-8 cursor-default select-none text-center text-[10px] text-white/25"
            >
              © {new Date().getFullYear()} 명운(命運). All rights reserved.
            </p>
          </div>
        </footer>

        {altarFooterPolicy ? (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setAltarFooterPolicy(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="altar-policy-title"
          >
            <div
              className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-white/20 bg-slate-900 p-6 text-left shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                id="altar-policy-title"
                className="mb-4 flex shrink-0 items-center justify-between border-b border-white/10 pb-3 text-lg font-bold text-yellow-400"
              >
                <span>
                  {altarFooterPolicy === "terms"
                    ? "이용약관"
                    : altarFooterPolicy === "privacy"
                      ? "개인정보처리방침"
                      : "환불정책"}
                </span>
                <button
                  type="button"
                  onClick={() => setAltarFooterPolicy(null)}
                  className="text-2xl font-light text-white/50 hover:text-white"
                  aria-label="닫기"
                >
                  ×
                </button>
              </h3>
              <div className="flex-1 overflow-y-auto pr-2 text-xs leading-relaxed text-white/80 whitespace-pre-wrap">
                {altarFooterPolicy === "terms" && ALTAR_FOOTER_TERMS}
                {altarFooterPolicy === "privacy" && ALTAR_FOOTER_PRIVACY}
                {altarFooterPolicy === "refund" && ALTAR_FOOTER_REFUND}
              </div>
              <button
                type="button"
                className="mt-6 w-full rounded-xl bg-white/10 py-3 font-medium text-white transition-colors hover:bg-white/20"
                onClick={() => setAltarFooterPolicy(null)}
              >
                확인하고 닫기
              </button>
            </div>
          </div>
        ) : null}

        {showPremiumModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => handlePremiumCancel()}>
            <div className="w-full max-w-md rounded-2xl border-2 border-yellow-500/50 bg-slate-900/90 p-5 shadow-2xl shadow-yellow-500/10 backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="mb-4 text-center text-base font-semibold text-yellow-400">✨ 프리미엄 소원</h3>
              <div className="mb-3">
                <textarea value={premiumWishText} onChange={(e) => setPremiumWishText(e.target.value)} placeholder="소원을 적어주세요..." rows={2} className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-amber-50 focus:border-yellow-500/50 focus:outline-none" />
              </div>
              <div className="mb-3">
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <input type="radio" checked={premiumPeriod === "24h"} onChange={() => setPremiumPeriod("24h")} className="accent-yellow-500" />
                    <span className="text-sm text-white/90">24시간 고정 (1,900원)</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <input type="radio" checked={premiumPeriod === "10d"} onChange={() => setPremiumPeriod("10d")} className="accent-yellow-500" />
                    <span className="text-sm text-white/90">10일 고정 (6,900원)</span>
                  </label>
                </div>
              </div>
              <div className="mb-4">
                <div className="flex gap-2 mb-2">
                  <button type="button" onClick={() => setPremiumNameDisplay("anonymous")} className={`flex-1 rounded-lg py-1.5 text-xs ${premiumNameDisplay === "anonymous" ? "bg-yellow-500/30 text-yellow-400" : "bg-white/5 text-white/80"}`}>익명</button>
                  <button type="button" onClick={() => setPremiumNameDisplay("real")} className={`flex-1 rounded-lg py-1.5 text-xs ${premiumNameDisplay === "real" ? "bg-yellow-500/30 text-yellow-400" : "bg-white/5 text-white/80"}`}>실명</button>
                  <button type="button" onClick={() => setPremiumNameDisplay("partial")} className={`flex-1 rounded-lg py-1.5 text-xs ${premiumNameDisplay === "partial" ? "bg-yellow-500/30 text-yellow-400" : "bg-white/5 text-white/80"}`}>부분노출</button>
                </div>
                {(premiumNameDisplay === "real" || premiumNameDisplay === "partial") && (
                  <input type="text" value={premiumNameInput} onChange={(e) => setPremiumNameInput(e.target.value)} placeholder={premiumNameDisplay === "partial" ? "예: 홍길동 → 홍*동" : "이름 입력"} className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-amber-50 focus:border-yellow-500/50 focus:outline-none" />
                )}
              </div>
              <PaymentMethodSelector selectedPayMethod={selectedPayMethod} setSelectedPayMethod={setSelectedPayMethod} />
              <div className="flex gap-2">
                <button type="button" onClick={handlePremiumCancel} className="flex-1 rounded-xl border border-white/20 bg-white/5 py-3 text-sm font-medium text-white/90">취소</button>
                <button type="button" onClick={handlePremiumConfirm} disabled={!premiumWishText.trim()} className="flex-1 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 py-3 text-sm font-semibold text-slate-900 disabled:opacity-50">결제하고 띄우기</button>
              </div>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={handleMuteToggle}
          className="fixed bottom-24 right-4 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-yellow-500/20 text-yellow-400 transition-colors hover:bg-yellow-500/30 focus:outline-none"
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        {/* 🚀 대표님 오더: 깔끔하고 파워풀한 소원 집중형 부적 UI */}
<div className="absolute left-[-9999px] top-[-9999px]">
  <div ref={talismanRef} className="relative w-[400px] h-[700px] flex flex-col items-center justify-center bg-black p-10 text-center shadow-2xl" style={{ backgroundImage: "url('/talisman-bg.png')", backgroundSize: "cover", backgroundPosition: "center" }}>
    
    {/* 중앙 소원 글귀 영역 (테두리와 기존 한자 싹 빼고 텍스트만 강렬하게) */}
    <div className="relative z-10 flex-grow flex items-center justify-center w-full">
      <p className="text-[36px] font-black text-[#5e1919] leading-loose break-keep whitespace-pre-wrap font-serif" style={{ textShadow: "1px 1px 4px rgba(255,255,255,0.8)" }}>
        {lastWish || wishText || "간절한 소원이\n반드시 이루어집니다"}
      </p>
    </div>

    {/* 하단 명운 로고 영역 (그대로 유지하되 톤 앤 매너 조절) */}
    <div className="relative z-10 mb-4 w-full text-[#5e1919] font-black tracking-widest flex justify-between items-center px-2 opacity-90">
      <span className="text-sm">명운(命運)</span>
      <span className="text-sm">기적의 제단</span>
    </div>
  </div>
</div>

</div>

{/* 🚀 모바일 오디오 재생 우회용 터치 오버레이 (결제 직후 스마트폰이 소리를 막았을 때 등장) */}
{needsInteraction && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer" onClick={() => {
    setNeedsInteraction(false);
    bellAudioRef.current?.play().catch(()=>{});
    fireAudioRef.current?.play().catch(()=>{});
    audioRef.current?.play().catch(()=>{});
  }}>
    <div className="text-center animate-bounce px-6">
      <div className="text-7xl mb-4">✨</div>
      <p className="text-2xl font-extrabold text-yellow-400">결제가 완료되었습니다!</p>
      <p className="text-sm font-medium text-white/80 mt-4 bg-white/10 py-3 px-5 rounded-full border border-white/20 shadow-lg inline-block">
        화면을 가볍게 터치하여 기적의 제단에 입장하세요 👇
      </p>
    </div>
  </div>
)}

{/* 🚀 프리미엄 전용 압도적 황금빛 기적 효과 (최상위 레이어) */}
<div className={`fixed inset-0 z-40 flex items-center justify-center pointer-events-none transition-opacity duration-1000 ${isPremiumGlow ? "opacity-100" : "opacity-0"}`}>
  <div className="absolute inset-0 bg-yellow-500/40 mix-blend-color-dodge animate-pulse" />
  <div className="absolute w-[150vw] h-[150vw] sm:w-[800px] sm:h-[800px] bg-[radial-gradient(circle,rgba(253,224,71,0.8)_0%,transparent_60%)] animate-[spin_10s_linear_infinite]" />
  <div className="relative z-50 text-center animate-[fortune-twinkle_1.5s_ease-in-out_infinite]">
    <p className="text-2xl sm:text-4xl font-extrabold text-white drop-shadow-[0_0_20px_rgba(250,204,21,1)] tracking-widest mb-2">
      ✨ 기적의 문이 열립니다 ✨
    </p>
    <p className="text-yellow-200 text-sm sm:text-base font-bold drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
      우주의 가장 강력한 기운이 소원과 함께합니다
    </p>
  </div>
</div>

</div>
  );
}

const HANJA_OPTIONS: Record<string, string[]> = {
  용: ["龍", "容", "用", "勇", "庸", "溶", "熔", "龍", "容", "用", "勇", "庸", "溶", "熔", "龍", "容", "用", "勇", "庸"],
  민: ["民", "敏", "旻", "泯", "珉", "憫", "閔", "民", "敏", "旻", "泯", "珉", "憫", "閔", "民", "敏", "旻", "泯", "珉", "憫"],
  수: ["秀", "洙", "守", "水", "壽", "修", "受", "首", "秀", "洙", "守", "水", "壽", "修", "受", "首", "秀", "洙", "守", "水"],
  진: ["珍", "眞", "振", "辰", "進", "鎭", "陣", "珍", "眞", "振", "辰", "進", "鎭", "陣", "珍", "眞", "振", "辰", "進", "鎭"],
  지: ["智", "志", "地", "知", "之", "芝", "枝", "智", "志", "地", "知", "之", "芝", "枝", "智", "志", "地", "知", "之", "芝"],
  현: ["賢", "玄", "炫", "顯", "絢", "懸", "縣", "賢", "玄", "炫", "顯", "絢", "懸", "縣", "賢", "玄", "炫", "顯", "絢", "懸"],
  준: ["俊", "埈", "準", "遵", "駿", "浚", "俊", "埈", "準", "遵", "駿", "浚", "俊", "埈", "準", "遵", "駿", "浚", "俊", "埈"],
  서: ["瑞", "序", "舒", "書", "緖", "徐", "庶", "瑞", "序", "舒", "書", "緖", "徐", "庶", "瑞", "序", "舒", "書", "緖", "徐"],
  영: ["英", "永", "榮", "泳", "映", "迎", "英", "永", "榮", "泳", "映", "迎", "英", "永", "榮", "泳", "映", "迎", "英", "永"],
  금: ["金", "錦", "今", "琴", "禁", "禽", "金", "錦", "今", "琴", "禁", "禽", "金", "錦", "今", "琴", "禁", "禽", "金", "錦"],
  하: ["河", "夏", "荷", "何", "贺", "河", "夏", "荷", "何", "贺", "河", "夏", "荷", "何", "贺", "河", "夏", "荷", "何", "贺"],
  성: ["成", "星", "聖", "誠", "城", "成", "星", "聖", "誠", "城", "成", "星", "聖", "誠", "城", "成", "星", "聖", "誠", "城"],
  연: ["姸", "延", "燕", "緣", "淵", "姸", "延", "燕", "緣", "淵", "姸", "延", "燕", "緣", "淵", "姸", "延", "燕", "緣", "淵"],
};

const FACE_SUMMARIES = [
  "재물운이 깃든 코와 인덕이 있는 눈매입니다.",
  "넓은 이마에 지혜가 넘치는 눈빛이 인상적입니다.",
  "균형 잡힌五官에 복이 깃든 상입니다.",
  "부드러운 인상에 내면의 강인함이 느껴집니다.",
];

const NAME_SUMMARIES = [
  "초년운이 좋고 말년이 평안한 이름입니다.",
  "인덕과 재물운이 함께하는 이름입니다.",
  "지혜롭고 원만한 성품을 암시하는 이름입니다.",
  "귀인을 만나 성공할 수 있는 이름입니다.",
];

function sajuHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function getSajuResult(seed: string): { face: string; name: string } {
  const today = new Date().toISOString().slice(0, 10);
  const h = sajuHash(seed + today);
  return {
    face: FACE_SUMMARIES[h % FACE_SUMMARIES.length],
    name: NAME_SUMMARIES[h % NAME_SUMMARIES.length],
  };
}

const HANJA_FALLBACK = ["吉", "福", "壽", "祿", "禧", "吉", "福", "壽", "祿", "禧", "吉", "福", "壽", "祿", "禧", "吉", "福", "壽", "祿", "禧"];

function getHanjaOptionsByChar(name: string): { char: string; options: string[] }[] {
  return name.split("").map((c) => ({
    char: c,
    options: (HANJA_OPTIONS[c] ?? HANJA_FALLBACK).slice(0, 20),
  }));
}

type NameResultData = {
  freeSummary: string;
  freeWeakness?: string;
  nameGrade?: string;
  nameScore?: number;
  gradeReason?: string;
  yinYangBalance?: string;
  strokes?: { won: string; hyeong: string; i: string; jeong: string };
  careers?: string[];
  renameNeeded?: string;
  renameReason?: string;
  premiumReport: {
    basisBox?: { pronunciation: string; resource: string; sajuRelation: string };
    coreEnergy: string;
    nameFlow: string;
    sajuFit: string;
    lifeCycle: string;
  };
};

function SajuTab({ isVisible }: { isVisible: boolean }) {
  const [activeSajuMode, setActiveSajuMode] = useState<"face" | "name">("face");
  
  const [faceName, setFaceName] = useState("");
  const [faceBirthDate, setFaceBirthDate] = useState("");
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [faceImageFile, setFaceImageFile] = useState<File | null>(null);
  const [faceFileName, setFaceFileName] = useState("");
  const [isFaceScanning, setIsFaceScanning] = useState(false);
  const [showFaceResult, setShowFaceResult] = useState(false);
  const [faceResultData, setFaceResultData] = useState<any>(null);
  const [showPhysiognomyPaymentModal, setShowPhysiognomyPaymentModal] = useState(false);
  const [isPhysiognomyPremiumUnlocked, setIsPhysiognomyPremiumUnlocked] = useState(false);
  const faceShareResultRef = useRef<HTMLDivElement | null>(null);
  const nameShareResultRef = useRef<HTMLDivElement | null>(null);

  const [nameGender, setNameGender] = useState<"male" | "female">("male");
  const [nameBirthDate, setNameBirthDate] = useState("");
  const [nameBirthTime, setNameBirthTime] = useState("unknown");
  const [nameInput, setNameInput] = useState("");
  const [nameHanja, setNameHanja] = useState("");
  const [showHanjaModal, setShowHanjaModal] = useState(false);
  const [hanjaModalData, setHanjaModalData] = useState<{ char: string; options: string[] }[]>([]);
  const [hanjaModalTargetChar, setHanjaModalTargetChar] = useState<string | null>(null);
  const [hanjaModalTargetIndex, setHanjaModalTargetIndex] = useState(0);
  const [hanjaModalResults, setHanjaModalResults] = useState<{ hanja: string; meaning: string }[]>([]);
  const [hanjaModalLoading, setHanjaModalLoading] = useState(false);
  const [hanjaSelections, setHanjaSelections] = useState<string[]>([]);
  const [showNameResult, setShowNameResult] = useState(false);
  const [isNameLoading, setIsNameLoading] = useState(false);
  const [nameLoadingStep, setNameLoadingStep] = useState(0);
  const [nameResultData, setNameResultData] = useState<NameResultData | null>(null);
  const [showNamePaymentModal, setShowNamePaymentModal] = useState(false);
  const [isNamePremiumUnlocked, setIsNamePremiumUnlocked] = useState(false);
  const [selectedPayMethod, setSelectedPayMethod] = useState<PayMethodPg>("kpn");

  useLayoutEffect(() => {
    if (typeof window === "undefined" || !isVisible) return;
    const p = new URLSearchParams(window.location.search);
    if (!extractPaymentReturnId(p) && p.get("imp_success") !== "true" && p.get("success") !== "true") return;
    const st = readPendingPaymentState();
    if (st?.flow === "physiognomy" && st.face?.faceImage) {
      setFaceImage(st.face.faceImage);
      if (st.face.faceResultData) {
        setFaceResultData(st.face.faceResultData);
        setShowFaceResult(true);
      }
      setActiveSajuMode("face");
    }
    if (st?.flow === "name" && st.name) {
      const n = st.name;
      if (n.nameInput) setNameInput(n.nameInput);
      if (n.nameHanja) setNameHanja(n.nameHanja);
      if (n.nameBirthDate) setNameBirthDate(n.nameBirthDate);
      if (n.nameBirthTime) setNameBirthTime(n.nameBirthTime);
      if (n.nameGender) setNameGender(n.nameGender);
      if (n.hanjaSelections) setHanjaSelections(n.hanjaSelections);
      if (n.nameResultData) {
        setNameResultData(n.nameResultData as NameResultData);
        setShowNameResult(true);
      }
      setActiveSajuMode("name");
    }
  }, [isVisible]);

  // 🚀 모바일 결제 복귀 시 1:1 데이터 매칭 복구 및 무한 결제 방지 (버그 수정 완료)
  useEffect(() => {
    if (typeof window !== "undefined" && isVisible) {
      const lastImpUid = localStorage.getItem("last_authorized_imp_uid");
      const pendingType = localStorage.getItem("pendingPaymentType");

      // 1️⃣ 관상 데이터 복구 — 결제 성공 imp_uid 있을 때만 잠금 해제 (다른 결제 플로우의 pendingPaymentType 오염 방지)
      const faceSaved = localStorage.getItem("pendingFaceData");
      if (faceSaved) {
        if (pendingType === "physiognomy" && lastImpUid) {
          try {
            const parsed = JSON.parse(faceSaved);
            if (parsed.faceImage) setFaceImage(parsed.faceImage);
            if (parsed.faceResultData) {
              setFaceResultData(parsed.faceResultData);
              setShowFaceResult(true);
              setIsPhysiognomyPremiumUnlocked(true);
            }
          } catch(e) {}
          setActiveSajuMode("face");
          localStorage.removeItem("last_authorized_imp_uid");
          localStorage.removeItem("pendingFaceData");
          localStorage.removeItem("pendingPaymentType");
          localStorage.removeItem("pendingPaymentAmount");
        } else if (!(pendingType === "physiognomy" && !lastImpUid)) {
          localStorage.removeItem("pendingFaceData");
        }
      }

      // 2️⃣ 이름풀이 데이터 복구 — 결제 성공 imp_uid 있을 때만 잠금 해제
      const nameSaved = localStorage.getItem("pendingNameData");
      if (nameSaved) {
        if (pendingType === "name" && lastImpUid) {
          try {
            const parsed = JSON.parse(nameSaved);
            if (parsed.nameInput) setNameInput(parsed.nameInput);
            if (parsed.nameHanja) setNameHanja(parsed.nameHanja);
            if (parsed.nameBirthDate) setNameBirthDate(parsed.nameBirthDate);
            if (parsed.nameBirthTime) setNameBirthTime(parsed.nameBirthTime);
            if (parsed.nameGender) setNameGender(parsed.nameGender);
            if (parsed.hanjaSelections) setHanjaSelections(parsed.hanjaSelections);
            if (parsed.nameResultData) {
              setNameResultData(parsed.nameResultData as NameResultData);
              setShowNameResult(true);
              setIsNamePremiumUnlocked(true);
            }
          } catch(e) {}
          setActiveSajuMode("name");
          localStorage.removeItem("last_authorized_imp_uid");
          localStorage.removeItem("pendingNameData");
          localStorage.removeItem("pendingPaymentType");
          localStorage.removeItem("pendingPaymentAmount");
        } else if (!(pendingType === "name" && !lastImpUid)) {
          localStorage.removeItem("pendingNameData");
        }
      }
    }
  }, [isVisible]);
  // 💡 기존에 혼자서 자물쇠를 잠가버리던 오작동 감시자(useEffect 2개)는 완전히 삭제했습니다!

  const handleFaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type.startsWith("image/")) {
      setIsPhysiognomyPremiumUnlocked(false); // 💡 사진을 새로 올릴 때만 잠금!
      setFaceImageFile(file);
      setFaceFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => setFaceImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFaceDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) {
      setIsPhysiognomyPremiumUnlocked(false); // 💡 사진을 새로 올릴 때만 잠금!
      setFaceImageFile(file);
      setFaceFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => setFaceImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFaceAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faceImage) {
      alert("사진을 업로드해 주세요.");
      return;
    }

    supabase.rpc('increment_tab_click', { target_tab_id: 'saju' }).then(({ error }) => { if(error) console.error('사주 에러:', error) });
    setIsFaceScanning(true);
    setShowFaceResult(false);
    setFaceResultData(null);
    const minScanMs = 3500;
    const startTime = Date.now();

    try {
      const generateHash = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = ((hash << 5) - hash) + str.charCodeAt(i);
          hash = hash & hash;
        }
        return hash.toString();
      };

      const imageHash = generateHash(faceImage);
      const cachedData = localStorage.getItem(`faceCache_v3_${imageHash}`);

      let data;

      if (cachedData) {
        data = JSON.parse(cachedData);
      } else {
        const response = await fetch("/api/physiognomy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: faceImage }),
        });
        data = await response.json();

        if (!data.error) {
          localStorage.setItem(`faceCache_v3_${imageHash}`, JSON.stringify(data));
        }
      }

      if (data.error) {
        setIsFaceScanning(false);
        alert("분석 중 오류가 발생했습니다. 얼굴이 잘 보이게 사진을 다시 찍어주세요.");
        setFaceImage(null);
        setFaceImageFile(null);
        setFaceFileName("");
        setShowFaceResult(false);
        setFaceResultData(null);
        return;
      }

      const elapsed = Date.now() - startTime;
      if (elapsed < minScanMs) {
        await new Promise((resolve) => setTimeout(resolve, minScanMs - elapsed));
      }

      setFaceResultData(data);
      setShowFaceResult(true);
    } catch (error) {
      console.error(error);
      alert("분석 중 오류가 발생했습니다. 얼굴이 잘 보이게 사진을 다시 찍어주세요.");
    } finally {
      setIsFaceScanning(false);
    }
  };

  const handleFacePremium = () => {
    if (typeof window !== "undefined" && localStorage.getItem("MASTER_ADMIN") === "true") {
      alert("✨ [운영자 프리패스] 결제 없이 즉시 심층 관상 리포트를 확인합니다!");
      setIsPhysiognomyPremiumUnlocked(true);
    } else {
      setShowPhysiognomyPaymentModal(true);
    }
  };

  // 🚀 관상 심층 리포트 프리미엄 결제 연동 (4,900원)
  const handlePhysiognomyPaymentConfirm = async () => {
    let PortOne = (window as any).PortOne;
    if (!PortOne) {
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 500));
        PortOne = (window as any).PortOne;
        if (PortOne) break;
      }
    }
    if (!PortOne) { alert("🚨 결제 시스템 로딩 실패. 새로고침[F5] 해주세요!"); return; }
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const amount = 4900;

    localStorage.setItem("pendingPaymentType", "physiognomy");
    localStorage.setItem("pendingPaymentAmount", String(amount));
    localStorage.setItem("pendingFaceData", JSON.stringify({ faceImage, faceResultData }));
    savePendingPaymentData({ v: 1, tab: "saju", flow: "physiognomy" });
    savePendingPaymentState({
      tab: "saju",
      flow: "physiognomy",
      face: { faceImage: faceImage ?? undefined, faceResultData },
    });

    try {
      const toolsOrigin = `${window.location.origin}/tools`;
      const response = await PortOne.requestPayment({
        storeId: "store-dfe94d23-cfea-4a4d-a36a-0b1864b0903d",
        channelKey: selectedPayMethod === "kpn" ? "channel-key-47b05312-c2e5-4e20-8b76-afb3915eb765" : selectedPayMethod === "tosspay" ? "channel-key-ec9a613e-4407-413c-9ad1-921edb7b694e" : "channel-key-314bb395-3a71-48e6-a2a1-fed1d4ccb8c1",
        paymentId: `face${Date.now()}`,
        orderName: "심층 관상 분석",
        totalAmount: amount,
        currency: "KRW",
        payMethod: selectedPayMethod === "kakaopay" ? "EASY_PAY" : selectedPayMethod === "tosspay" ? "EASY_PAY" : "CARD",
        customer: { email: "test@ymstudio.co.kr", fullName: "명운 사용자" },
        redirectUrl: isMobile ? `${toolsOrigin}?tab=saju` : undefined,
      });
      const portOneFail = getPortOnePaymentFailureReason(response, { isMobile });
      if (portOneFail) {
        alert("결제가 취소되었습니다.");
        localStorage.removeItem("pendingFaceData");
        localStorage.removeItem("pendingPaymentType");
        localStorage.removeItem("pendingPaymentAmount");
        clearPendingPaymentData();
        clearPendingPaymentState();
        return;
      }
      if (isMobile) {
        return;
      }
      try {
        const verifyRes = await fetch(PAYMENT_VERIFY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentType: "saju",
            imp_uid: (response as { paymentId: string }).paymentId,
            paymentId: (response as { paymentId: string }).paymentId,
            merchant_uid: (response as { paymentId: string }).paymentId,
            amount,
          }),
        });
        const verifyData = (await verifyRes.json()) as { success?: boolean; message?: string };
        if (verifyRes.ok && verifyData.success) {
          setIsPhysiognomyPremiumUnlocked(true);
          setShowPhysiognomyPaymentModal(false);
        } else {
          alert(
            `결제 검증 오류: ${(verifyData.message && String(verifyData.message).trim()) || "서버 키·IAMPORT 설정을 확인해 주세요."}`,
          );
        }
      } catch {
        alert("결제 검증 오류: 네트워크 또는 서버 응답을 확인해 주세요.");
      }
    } catch(e) {
      localStorage.removeItem("pendingFaceData");
      localStorage.removeItem("pendingPaymentType");
      localStorage.removeItem("pendingPaymentAmount");
    }
  };

  const handleFaceShare = async () => {
    await captureAndShareElement(faceShareResultRef.current, {
      fileName: "physiognomy-result.png",
      title: "관상 분석 결과",
      text: `관상 분석 결과 이미지입니다.\n자세히 보기: ${window.location.origin}`,
    });
  };

  const handleNameShare = async () => {
    await captureAndShareElement(nameShareResultRef.current, {
      fileName: "name-result.png",
      title: "이름 풀이 결과",
      text: `이름 풀이 결과 이미지입니다.\n자세히 보기: ${window.location.origin}`,
    });
  };

  const handleFaceLinkShare = async () => {
    const shareUrl = window.location.href;
    const text = `관상 분석 결과 보러가기\n${shareUrl}`;
  
    if (navigator.share) {
      try {
        await navigator.share({
          title: "관상 분석 결과",
          text,
          url: shareUrl,
        });
        return;
      } catch {}
    }
  
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("링크가 복사되었습니다.");
    } catch {
      alert("링크 공유를 지원하지 않는 환경입니다.");
    }
  };
  
  const handleNameLinkShare = async () => {
    const shareUrl = window.location.href;
    const hanjaText = nameHanja ? ` (${nameHanja})` : "";
    const text = `이름 풀이 결과 보러가기\n${nameInput}${hanjaText}\n${shareUrl}`;
  
    if (navigator.share) {
      try {
        await navigator.share({
          title: "이름 풀이 결과",
          text,
          url: shareUrl,
        });
        return;
      } catch {}
    }
  
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("링크가 복사되었습니다.");
    } catch {
      alert("링크 공유를 지원하지 않는 환경입니다.");
    }
  };

  const handleFaceReset = () => {
    setFaceName("");
    setFaceBirthDate("");
    setFaceImage(null);
    setFaceImageFile(null);
    setFaceFileName("");
    setIsFaceScanning(false);
    setShowFaceResult(false);
    setFaceResultData(null);
    setShowPhysiognomyPaymentModal(false);
    setIsPhysiognomyPremiumUnlocked(false);
  };

  const handleHanjaForChar = async (charIndex: number) => {
    const char = nameInput[charIndex];
    if (!char) return;
    setHanjaModalTargetChar(char);
    setHanjaModalTargetIndex(charIndex);
    setHanjaModalResults([]);
    setHanjaModalLoading(true);
    setShowHanjaModal(true);

    try {
      const res = await fetch("/api/hanja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ char }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "한자 검색 중 오류가 발생했습니다.");
      setHanjaModalResults(data.results ?? []);
    } catch (err) {
      alert(err instanceof Error ? err.message : "한자 검색 중 오류가 발생했습니다.");
      setShowHanjaModal(false);
    } finally {
      setHanjaModalLoading(false);
    }
  };

  const handleHanjaSelect = (charIndex: number, hanja: string) => {
    const newSelections = [...hanjaSelections];
    while (newSelections.length <= charIndex) newSelections.push("");
    newSelections[charIndex] = hanja;
    setHanjaSelections(newSelections);
    setNameHanja(newSelections.join(""));
    setShowHanjaModal(false);
  };

  const handleHanjaSelectFromModal = (hanja: string) => {
    handleHanjaSelect(hanjaModalTargetIndex, hanja);
  };

  const handleHanjaModalConfirm = () => {
    const full = hanjaSelections.every((s) => s);
    if (full) {
      setNameHanja(hanjaSelections.join(""));
      setShowHanjaModal(false);
    }
  };

  const getNameCacheKey = () => {
    const today = new Date().toDateString();
    return `${NAME_CACHE_PREFIX}v5-${today}-${nameInput}-${nameBirthDate}-${nameBirthTime}-${nameGender}`;
  };

  const handleNameAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      alert("이름을 입력해 주세요.");
      return;
    }

    if (!nameBirthDate) {
      alert("정확한 사주 매칭을 위해 생년월일을 입력해 주세요.");
      return;
    }

    supabase.rpc('increment_tab_click', { target_tab_id: 'saju' }).then(({ error }) => { if(error) console.error('사주 에러:', error) });
    setIsNameLoading(true);
    setShowNameResult(false);
    setNameResultData(null);
    setNameLoadingStep(0);
    const loadingTimer = window.setInterval(() => {
      setNameLoadingStep((prev) => (prev >= 3 ? 3 : prev + 1));
    }, 1200);
    const cacheKey = getNameCacheKey();
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          if (data.freeSummary && data.premiumReport) {
            const minLoadingMs = 1500;
            await new Promise((r) => setTimeout(r, minLoadingMs));
            setNameResultData(data);
            setShowNameResult(true);
            setIsNameLoading(false);
            return;
          }
        } catch {
          localStorage.removeItem(cacheKey);
        }
      }
    }

    try {
      const res = await fetch("/api/name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameInput,
          hanja: nameHanja || undefined,
          birthDate: nameBirthDate,
          birthTime: nameBirthTime,
          gender: nameGender,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "이름 풀이 중 오류가 발생했습니다.");
      if (typeof window !== "undefined") {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      }
      setNameResultData(data);
      setShowNameResult(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "이름 풀이 중 오류가 발생했습니다.");
    } finally {
      window.clearInterval(loadingTimer);
      setIsNameLoading(false);
    }
  };

  const handleNamePremium = () => {
    if (typeof window !== "undefined" && localStorage.getItem("MASTER_ADMIN") === "true") {
      alert("✨ [운영자 프리패스] 결제 없이 즉시 심층 이름 풀이 리포트를 확인합니다!");
      setIsNamePremiumUnlocked(true);
    } else {
      setShowNamePaymentModal(true);
    }
  };

  // 🚀 이름 풀이 프리미엄 결제 연동 (4,900원)
  const handleNamePaymentConfirm = async () => {
    if (typeof window !== "undefined") {
      let PortOne = (window as any).PortOne;
      if (!PortOne) {
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 500));
          PortOne = (window as any).PortOne;
          if (PortOne) break;
        }
      }
      if (!PortOne) return alert("🚨 결제 시스템 로딩 실패.");

      const amount = 4900;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      localStorage.setItem("pendingPaymentType", "name");
      localStorage.setItem("pendingPaymentAmount", String(amount));
      localStorage.setItem("pendingNameData", JSON.stringify({
        nameInput, nameHanja, nameBirthDate, nameBirthTime, nameGender, hanjaSelections, nameResultData
      }));
      savePendingPaymentData({ v: 1, tab: "saju", flow: "name" });
      savePendingPaymentState({
        tab: "saju",
        flow: "name",
        name: {
          nameInput,
          nameHanja,
          nameBirthDate,
          nameBirthTime,
          nameGender,
          hanjaSelections,
          nameResultData,
        },
      });

      try {
        const toolsOrigin = `${window.location.origin}/tools`;
        const response = await PortOne.requestPayment({
          storeId: "store-dfe94d23-cfea-4a4d-a36a-0b1864b0903d",
          channelKey: selectedPayMethod === "kpn" ? "channel-key-47b05312-c2e5-4e20-8b76-afb3915eb765" : selectedPayMethod === "tosspay" ? "channel-key-ec9a613e-4407-413c-9ad1-921edb7b694e" : "channel-key-314bb395-3a71-48e6-a2a1-fed1d4ccb8c1",
          paymentId: `mid${Date.now()}${Math.random().toString(36).substring(2, 8)}`,
          orderName: "심층 이름 풀이 리포트",
          totalAmount: amount,
          currency: "KRW",
          payMethod: selectedPayMethod === "kakaopay" ? "EASY_PAY" : selectedPayMethod === "tosspay" ? "EASY_PAY" : "CARD",
          customer: { email: "test@ymstudio.co.kr", fullName: "명운 사용자" },
          redirectUrl: isMobile ? `${toolsOrigin}?tab=saju` : undefined,
        });
        const portOneFailName = getPortOnePaymentFailureReason(response, { isMobile });
        if (portOneFailName) {
          alert("결제가 취소되었습니다.");
          localStorage.removeItem("pendingNameData");
          localStorage.removeItem("pendingPaymentType");
          localStorage.removeItem("pendingPaymentAmount");
          clearPendingPaymentData();
          clearPendingPaymentState();
          return;
        }
        if (isMobile) {
          return;
        }
        try {
          const verifyRes = await fetch(PAYMENT_VERIFY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentType: "saju",
              imp_uid: (response as { paymentId: string }).paymentId,
              paymentId: (response as { paymentId: string }).paymentId,
              merchant_uid: (response as { paymentId: string }).paymentId,
              amount: amount,
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyRes.ok && verifyData.success) {
            setShowNamePaymentModal(false);
            setIsNamePremiumUnlocked(true);
          } else {
            alert(
              `결제 검증 오류: ${(verifyData.message && String(verifyData.message).trim()) || "서버 키·IAMPORT 설정을 확인해 주세요."}`,
            );
          }
        } catch {
          alert("결제 검증 오류: 네트워크 또는 서버 응답을 확인해 주세요.");
        }
      } catch(e) {
        localStorage.removeItem("pendingNameData");
        localStorage.removeItem("pendingPaymentType");
        localStorage.removeItem("pendingPaymentAmount");
      }
    }
  };

  const formatHighlight = (text?: string) => {
    if (!text) return null;
    const parts = text.split(/(【.*?】)/g);
    return parts.map((part, i) => {
      if (part.startsWith('【') && part.endsWith('】')) {
        return (
          <strong key={i} className="text-yellow-200 bg-yellow-500/20 border-b border-yellow-500/40 px-1 py-0.5 mx-0.5 font-semibold">
            {part.slice(1, -1)}
          </strong>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const handleNameReset = () => {
    setNameGender("male");
    setNameBirthDate("");
    setNameBirthTime("unknown");
    setNameInput("");
    setNameHanja("");
    setShowHanjaModal(false);
    setHanjaModalData([]);
    setHanjaSelections([]);
    setShowNameResult(false);
    setNameResultData(null);
    setShowNamePaymentModal(false);
    setIsNamePremiumUnlocked(false);
  };

  return (
    <div
      role="tabpanel"
      aria-hidden={!isVisible}
      className={isVisible ? "relative w-full" : "hidden"}
    >
      <div className="relative isolate min-h-[100svh] w-full">
        <div className="pointer-events-none absolute inset-0 z-0 bg-slate-950">
          <div className="absolute inset-0 bg-cover bg-center opacity-60 mix-blend-screen" style={{ backgroundImage: "url('/bg_face_name.png')" }} />
          <div className="absolute inset-0 bg-black/50" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6 px-6 py-6">
        
        <div className="flex gap-2 rounded-xl bg-slate-800/60 p-1">
          {/* 🚀 [비밀 버튼] 사주 탭 진입을 "S"로 인식 */}
          <button
            type="button"
            onClick={() => { setActiveSajuMode("face"); pushSecret("S"); }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeSajuMode === "face"
                ? "bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/50"
                : "text-white/70 hover:text-white/90"
            }`}
          >
            <Camera className="h-4 w-4" />
            관상 분석
          </button>
          {/* 🚀 [비밀 버튼] 이름 탭 진입을 "S"로 인식 */}
          <button
            type="button"
            onClick={() => { setActiveSajuMode("name"); pushSecret("S"); }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeSajuMode === "name"
                ? "bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/50"
                : "text-white/70 hover:text-white/90"
            }`}
          >
            <FileText className="h-4 w-4" />
            이름 풀이
          </button>
        </div>

        {activeSajuMode === "face" && (
          <div ref={faceShareResultRef} className="w-full max-w-md space-y-6">
            {!showFaceResult ? (
              <>
                <div className="mb-4 text-center border-b border-white/10 pb-4">
                  <h2 className="text-xl font-bold text-yellow-400">당신의 타고난 천운(天運)을 얼굴에서 읽어냅니다.</h2>
                  <p className="text-xs text-white/70 mt-1">마의상법(麻衣相法)에 기초한 정밀 관상 스캐닝</p>
                </div>

                <div className="mb-5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 py-2.5 px-2 text-center shadow-inner">
                  <p className="text-xs sm:text-sm text-yellow-300 font-medium tracking-tight break-keep">
                    💡 정확도 UP : <strong className="text-yellow-400">밝은 곳에서 이마가 보이는 정면 무표정 사진</strong> 권장
                  </p>
                </div>

                <form onSubmit={handleFaceAnalyze} className="space-y-5">
                  <div className="relative">
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleFaceDrop}
                      className={`
                        flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed
                        border-yellow-500/30 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:border-yellow-500/50
                        ${isFaceScanning ? "pointer-events-none" : "cursor-pointer"}
                      `}
                    >
                      {faceImage ? (
                        <img src={faceImage} alt="업로드된 사진" className="max-h-[250px] max-w-full rounded-lg object-contain" />
                      ) : (
                        <>
                          <Camera className="h-12 w-12 text-yellow-400/60" />
                          <p className="text-sm text-white/70">클릭하거나 사진을 드래그하세요</p>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFaceUpload}
                        className="absolute inset-0 cursor-pointer opacity-0"
                        disabled={isFaceScanning}
                      />
                    </div>
                    {isFaceScanning && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl bg-black/80 overflow-hidden">
                        <style>{`
                          @keyframes scanMove { 0% { top: 10%; } 50% { top: 90%; } 100% { top: 10%; } }
                        `}</style>
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(234,179,8,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(234,179,8,0.2)_1px,transparent_1px)] bg-[size:20px_20px] mix-blend-overlay"></div>
                        <div className="absolute top-0 left-0 w-full h-full border-[4px] border-yellow-500/50 rounded-xl animate-pulse"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border border-yellow-400/80 rounded-full flex items-center justify-center">
                          <div className="w-1 h-1 bg-yellow-400 rounded-full animate-ping"></div>
                        </div>
                        <div className="absolute left-0 w-full h-[3px] bg-yellow-400 shadow-[0_0_20px_5px_rgba(234,179,8,0.9)] opacity-90" 
                             style={{ animation: 'scanMove 2s ease-in-out infinite' }}></div>
                        
                        <p className="relative z-10 mt-20 px-4 py-1.5 rounded-full bg-black/80 text-xs font-bold text-yellow-400 tracking-widest border border-yellow-500/30 shadow-lg">
                          정밀 안면 골격 스캐닝 중...
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 px-6 py-3 text-sm font-medium text-slate-900 shadow-lg shadow-yellow-500/25 transition-all hover:from-yellow-400 hover:to-amber-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!faceImage || isFaceScanning}
                  >
                    전문가 심층 관상 분석하기
                  </button>
                </form>
              </>
            ) : (
              <div className="space-y-6">
                <h3 className="mb-2 text-center text-lg font-semibold text-yellow-400">
                  당신의 타고난 관상 분석 리포트
                </h3>

                {isPhysiognomyPremiumUnlocked ? (
                  <div className="space-y-6 animate-fade-in-up">
                    <div className="flex justify-center mb-4">
                      <div className="relative p-1 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                        <img src={faceImage || ""} alt="분석 사진" className="w-28 h-28 rounded-full object-cover border-4 border-black" />
                      </div>
                    </div>

                    {/* 관상 유형명 카드 */}
                    {faceResultData?.faceType && (
                      <div className="rounded-2xl border-2 border-yellow-400/60 bg-gradient-to-br from-yellow-500/10 to-amber-600/10 p-5 text-center shadow-lg">
                        <p className="text-xs text-yellow-400/70 mb-1">관상 유형</p>
                        <h4 className="text-2xl font-bold text-yellow-300 mb-1">「{faceResultData.faceType}」</h4>
                        <p className="text-sm text-white/70">{faceResultData.faceTypeDesc}</p>
                      </div>
                    )}

                    {/* 운별 점수 */}
                    {faceResultData?.scores && (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <h4 className="text-sm font-bold text-white/70 mb-3 text-center">📊 운별 점수</h4>
                        <div className="space-y-2">
                          {[
                            { label: "재물운", key: "wealth", color: "bg-yellow-400" },
                            { label: "애정운", key: "love", color: "bg-pink-400" },
                            { label: "건강운", key: "health", color: "bg-green-400" },
                            { label: "사회운", key: "social", color: "bg-blue-400" },
                          ].map(({ label, key, color }) => {
                            const score = faceResultData.scores[key] ?? 0;
                            return (
                              <div key={key} className="flex items-center gap-3">
                                <span className="w-14 text-xs text-white/60 shrink-0">{label}</span>
                                <div className="flex-1 h-2 rounded-full bg-white/10">
                                  <div
                                    className={`h-2 rounded-full ${color}`}
                                    style={{ width: `${score}%` }}
                                  />
                                </div>
                                <span className="w-10 text-xs text-right text-white/80 font-mono">{score}점</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 성격 키워드 */}
                    {faceResultData?.keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-center">
                        {faceResultData.keywords.map((kw: string, i: number) => (
                          <span key={i} className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs text-yellow-300">
                            #{kw}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 천직 직업 */}
                    {faceResultData?.careers?.length > 0 && (
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <h4 className="text-sm font-bold text-white/70 mb-2">💼 천직 (적성 직업)</h4>
                        <div className="space-y-1">
                          {faceResultData.careers.map((career: string, i: number) => (
                            <p key={i} className="text-sm text-white/80">{i + 1}. {career}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-2xl border-2 border-yellow-500/50 bg-[#16120d]/90 p-5 shadow-lg">
                      <h4 className="mb-4 text-center text-base font-bold text-yellow-300 border-b border-yellow-500/30 pb-2">
                        📜 마의상법 정통 관상 풀이
                      </h4>
                      <div className="space-y-4">
                        {[
                          { id: "forehead", title: "이마 (초년운·지적 능력)", icon: "🧠" },
                          { id: "eyes", title: "눈 (애정운·정신력)", icon: "👁️" },
                          { id: "nose", title: "코 (재물운·의지력)", icon: "👃" },
                          { id: "mouth", title: "입 (말년운·언변)", icon: "👄" },
                          { id: "overall", title: "전체적 균형", icon: "⚖️" },
                        ].map((item) => (
                          <div key={item.id} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                            <span className="text-sm font-bold text-yellow-400 flex items-center gap-1 mb-1">{item.icon} {item.title}</span>
                            <p className="text-sm text-white/90 leading-relaxed">{(faceResultData?.premiumReport as any)?.[item.id] || "분석 결과를 불러올 수 없습니다."}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-yellow-500/30 bg-[#16120d]/90 p-5 shadow-lg">
                      <h4 className="mb-3 text-center text-base font-bold text-yellow-300 border-b border-yellow-500/20 pb-2">
                        ✦ 심층 작명 분석 리포트
                      </h4>
                      <div className="space-y-4">
                        {[
                          { id: "firstImpression", title: "첫인상 강점", icon: "✨" },
                          { id: "interpersonal", title: "인간관계 성향", icon: "🤝" },
                          { id: "charisma", title: "신뢰감 및 카리스마", icon: "👔" },
                          { id: "romance", title: "이성에게 비치는 매력", icon: "💘" },
                          { id: "warningPoint", title: "관상학적 주의점 및 팩트폭력", icon: "⚠️" },
                        ].map((item) => (
                          <div key={item.id} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                            <span className="text-sm font-bold text-amber-400 flex items-center gap-1 mb-1">{item.icon} {item.title}</span>
                            <p className="text-sm text-white/90 leading-relaxed">{(faceResultData?.premiumReport as any)?.[item.id] || "분석 결과를 불러올 수 없습니다."}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5 mt-4">
                    <div className="flex justify-center mb-2">
                      <img src={faceImage || ""} alt="분석된 사진" className="max-h-32 rounded-lg border border-yellow-500/30 object-contain shadow-lg" />
                    </div>
                    
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-md text-center">
                      <p className="text-sm leading-relaxed text-white/90 font-medium">
                        {faceResultData?.freeSummary}
                      </p>
                    </div>

                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                      <h4 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
                        <span>👁️</span> AI 스캐닝 관찰 결과
                      </h4>
                      <div className="space-y-2 text-xs">
                        <p className="text-white/80">
                          <strong className="text-white/60 mr-2">확실한 특징:</strong> 
                          {faceResultData?.observation?.visible?.join(", ") || "특징을 추출했습니다."}
                        </p>
                        {faceResultData?.observation?.uncertain?.length > 0 && (
                          <p className="text-rose-400/80">
                            <strong className="text-white/60 mr-2">불확실한 특징:</strong> 
                            {faceResultData?.observation?.uncertain?.join(", ")}
                          </p>
                        )}
                        <p className="mt-2 text-emerald-300 pt-2 border-t border-emerald-500/10">
                          💡 <strong>품질 체크:</strong> {faceResultData?.retakeGuide}
                        </p>
                      </div>
                    </div>

                    <div className="mt-8 space-y-3 relative">
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent rounded-xl">
                        <p className="text-white font-bold mb-4 drop-shadow-md">전문가 수준의 10가지 심층 풀이가 준비되었습니다.</p>
                        <button 
                          onClick={(e) => { e.preventDefault(); handleFacePremium(); }}
                          className="animate-bounce px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-extrabold rounded-full shadow-[0_0_20px_rgba(234,179,8,0.5)]"
                        >
                          🔒 프리미엄 심층 분석 열기
                        </button>
                      </div>

                      {[
                        { id: "forehead", title: "이마 (초년운·지적 능력)" },
                        { id: "eyes", title: "눈 (애정운·정신력)" },
                        { id: "nose", title: "코 (재물운·의지력)" }
                      ].map((item) => (
                        <div key={item.id} className="rounded-xl border border-white/5 bg-slate-800/40 px-4 py-3 opacity-60">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-yellow-400/90">{item.title}</span>
                            <span className="text-xs text-amber-500">🔒 잠금</span>
                          </div>
                          <p className="text-sm text-white/30 blur-sm select-none">
                            이마가 넓고 반듯하여 초년 운이 매우 강하게 들어오는 상입니다. 학업과 명예가 따릅니다.
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 mb-4 rounded-lg bg-white/5 p-4 text-center border border-white/10 shadow-inner opacity-80">
                  <p className="text-[11px] leading-relaxed text-white/50 break-keep">
                    ※ 본 분석은 사진의 조명, 각도, 표정에 따라 결과가 일부 달라질 수 있습니다.<br/>
                    정통 상학 데이터를 기반으로 한 <strong>엔터테인먼트 콘텐츠</strong>이므로 참고용으로만 활용해 주시기 바랍니다.
                  </p>
                </div>

                <div className="mt-8 space-y-3">
                  {isPhysiognomyPremiumUnlocked ? (
  <div className="grid grid-cols-2 gap-3">
    <button
      type="button"
      onClick={handleFaceLinkShare}
      className="w-full rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-sm font-bold text-sky-300 transition-all hover:bg-sky-500/20 active:scale-95"
    >
      🔗 링크 공유
    </button>
    <button
      type="button"
      onClick={handleFaceShare}
      className="w-full rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm font-bold text-yellow-400 transition-all hover:bg-yellow-500/20 active:scale-95"
    >
      🖼️ 이미지 공유
    </button>
  </div>
) : null}
                  <button
                    type="button"
                    onClick={handleFaceReset}
                    className="w-full rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-medium text-white/80 transition-all hover:bg-white/10 active:scale-95"
                  >
                    ↺ 다시 하기 (처음으로)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {showPhysiognomyPaymentModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setShowPhysiognomyPaymentModal(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl border-2 border-yellow-500/50 bg-slate-900/90 p-6 shadow-2xl shadow-yellow-500/10 backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-4 text-center text-lg font-semibold text-yellow-400">
                ✨ 당신의 타고난 운명을 밝히는 심층 관상 리포트 잠금 해제 (4,900원)
              </h3>
              <p className="mb-6 text-center text-sm text-white/70">
                이마·눈·코·입·전체 균형에 대한 전문가 관상학자의 심층 분석을 확인하세요.
              </p>
              <PaymentMethodSelector selectedPayMethod={selectedPayMethod} setSelectedPayMethod={setSelectedPayMethod} />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPhysiognomyPaymentModal(false)}
                  className="flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handlePhysiognomyPaymentConfirm}
                  className="flex-1 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-yellow-500/25 transition-all hover:from-yellow-400 hover:to-amber-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                >
                  결제하고 리포트 열기
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSajuMode === "name" && (
          <div ref={nameShareResultRef} className="w-full max-w-md space-y-6">
            {!showNameResult ? (
              isNameLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-6">
                  <div className="relative">
                    <div className="h-16 w-16 animate-[fortune-spin_1.2s_linear_infinite] rounded-full border-2 border-yellow-500/30 border-t-yellow-400" />
                    <div className="absolute inset-2 rounded-full border border-yellow-500/20" />
                  </div>
                  <div className="w-full max-w-sm space-y-4 text-center">
                    <p className="text-lg font-semibold text-yellow-400">
                      전문가 심층 성명학 리포트 생성 중
                    </p>
                    <div className="space-y-2 rounded-2xl border border-yellow-500/20 bg-white/5 p-4 backdrop-blur-md">
                      {[
                        "음령 및 자원오행 데이터 추출 중...",
                        "사주 원국(명식) 대조 분석 중...",
                        "이름의 파동과 기운 흐름 계산 중...",
                        "심층 리포트 및 핵심 포인트 요약 중...",
                      ].map((label, index) => {
                        const done = nameLoadingStep > index;
                        const active = nameLoadingStep === index;
                        return (
                          <div
                            key={label}
                            className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                              done ? "bg-yellow-500/15 text-yellow-300" : active ? "bg-white/10 text-white" : "bg-transparent text-white/50"
                            }`}
                          >
                            <span>{label}</span>
                            <span>{done ? "완료" : active ? "진행중" : "대기"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
              <form onSubmit={handleNameAnalyze} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm text-yellow-400/80">성별</label>
                  <div className="flex gap-4">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="nameGender"
                        checked={nameGender === "male"}
                        onChange={() => setNameGender("male")}
                        className="accent-yellow-500"
                      />
                      <span className="text-white/90">남</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="nameGender"
                        checked={nameGender === "female"}
                        onChange={() => setNameGender("female")}
                        className="accent-yellow-500"
                      />
                      <span className="text-white/90">여</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm text-yellow-400/80">생년월일</label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="예: 19801013"
                    value={nameBirthDate}
                    onChange={(e) => {
                      setIsNamePremiumUnlocked(false); // 💡 숫자를 수정할 때만 잠금!
                      let val = e.target.value.replace(/[^0-9]/g, '');
                      if (val.length > 6) val = val.slice(0,4) + '-' + val.slice(4,6) + '-' + val.slice(6,8);
                      else if (val.length > 4) val = val.slice(0,4) + '-' + val.slice(4);
                      setNameBirthDate(val);
                    }}
                    className="w-full rounded-xl border border-white/20 bg-slate-800/80 shadow-inner px-4 py-3 text-white placeholder-white/30 focus:border-yellow-500/50 focus:outline-none focus:ring-2 focus:ring-yellow-500/30"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-yellow-400/80">태어난 시간</label>
                  <select
                    value={nameBirthTime}
                    onChange={(e) => setNameBirthTime(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-white focus:border-yellow-500/50 focus:outline-none focus:ring-2 focus:ring-yellow-500/30"
                  >
                    {BIRTH_TIME_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-slate-800 text-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm text-yellow-400/80">이름 (한글 또는 한자 직접 입력)</label>
                  <input
                    type="text"
                    placeholder="한글 또는 한자 입력"
                    value={nameInput}
                    onChange={(e) => {
                      setIsNamePremiumUnlocked(false); // 💡 이름을 수정할 때만 잠금!
                      setNameInput(e.target.value);
                      setHanjaSelections([]);
                      setNameHanja("");
                    }}
                    className="w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-white placeholder-white/40 focus:border-yellow-500/50 focus:outline-none focus:ring-2 focus:ring-yellow-500/30"
                  />
                  <p className="mt-1.5 text-xs text-gray-400">
                    ※ 한자 변환이 번거로우신 경우, 키보드를 이용해 한자를 직접 입력하셔도 됩니다.
                  </p>
                  {nameInput.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {nameInput.split("").map((c, i) => (
                        <div key={`${i}-${c}`} className="flex flex-col items-center gap-1">
                          <span className="text-base font-medium text-yellow-400/90">{c}</span>
                          <button
                            type="button"
                            onClick={() => handleHanjaForChar(i)}
                            className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-1.5 text-xs font-medium text-yellow-400 transition-all hover:bg-yellow-500/20 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                          >
                            한자
                          </button>
                          {hanjaSelections[i] && (
                            <span className="text-sm text-amber-300/90">{hanjaSelections[i]}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {nameHanja && (
                    <p className="mt-2 text-sm text-yellow-400/90">
                      표시: {nameInput}({nameHanja})
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isNameLoading}
                  className="w-full rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 px-6 py-3 text-sm font-medium text-slate-900 shadow-lg shadow-yellow-500/25 transition-all hover:from-yellow-400 hover:to-amber-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  이름 풀이 보기
                </button>
              </form>
              )
            ) : (
              <div className="space-y-6 animate-fade-in-up mt-4">
                <div className="space-y-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md text-center">
                    <p className="mb-2 text-sm font-bold text-yellow-400/90">
                      {nameInput} {nameHanja && `(${nameHanja})`}
                    </p>
                    <p className="text-sm leading-relaxed text-white/90">
                      {nameResultData?.freeSummary ?? "분석 결과를 불러올 수 없습니다."}
                    </p>
                  </div>
                  
                  {nameResultData?.freeWeakness && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 shadow-inner">
                      <p className="text-xs font-bold text-red-400 mb-1 flex items-center gap-1">
                        <span>⚠️</span> 이름의 치명적 약점 / 주의점
                      </p>
                      <p className="text-sm text-red-200/80 break-keep">
                        {nameResultData.freeWeakness}
                      </p>
                    </div>
                  )}
                </div>

                {isNamePremiumUnlocked && (
                  <div className="space-y-4">
                    {(nameResultData?.nameGrade ||
                      nameResultData?.nameScore != null ||
                      nameResultData?.gradeReason) && (
                      <div className="rounded-2xl border-2 border-yellow-400/60 bg-gradient-to-br from-yellow-500/10 to-amber-600/10 p-5 text-center shadow-lg">
                        <p className="text-xs text-yellow-400/70 mb-1">이름 등급</p>
                        <div className="flex items-center justify-center gap-3 mb-1 flex-wrap">
                          {nameResultData?.nameGrade ? (
                            <span className="text-4xl font-bold text-yellow-300">{nameResultData.nameGrade}</span>
                          ) : null}
                          {nameResultData?.nameScore != null ? (
                            <span className="text-2xl font-bold text-white/60">{nameResultData.nameScore}점</span>
                          ) : null}
                        </div>
                        {nameResultData?.nameGrade ? (
                          <div className="flex justify-center gap-1 mb-2 flex-wrap">
                            {(["A+", "A", "B+", "B", "C", "D"] as const).map((g) => (
                              <span
                                key={g}
                                className={`text-xs px-1.5 py-0.5 rounded ${
                                  nameResultData.nameGrade === g ? "bg-yellow-500 text-black font-bold" : "text-white/20"
                                }`}
                              >
                                {g}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {nameResultData?.gradeReason ? (
                          <p className="text-xs text-white/60">{nameResultData.gradeReason}</p>
                        ) : null}
                      </div>
                    )}

                    {(nameResultData?.yinYangBalance || nameResultData?.strokes) && (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <h4 className="text-sm font-bold text-white/70 mb-3">☯️ 음양 배열</h4>
                        {nameResultData?.yinYangBalance ? (
                          <p className="text-sm text-yellow-300 mb-4 whitespace-pre-wrap">{nameResultData.yinYangBalance}</p>
                        ) : (
                          <p className="text-sm text-white/40 mb-4">음양 배열 데이터가 없습니다.</p>
                        )}
                        <h4 className="text-sm font-bold text-white/70 mb-3">📐 획수 분석</h4>
                        <div className="space-y-2">
                          {(
                            [
                              { label: "원격(元格)", key: "won" as const },
                              { label: "형격(亨格)", key: "hyeong" as const },
                              { label: "이격(利格)", key: "i" as const },
                              { label: "정격(貞格)", key: "jeong" as const },
                            ] as const
                          ).map(({ label, key }) => (
                            <div key={label} className="flex gap-3 text-sm">
                              <span className="w-28 shrink-0 text-white/50">{label}</span>
                              <span className="text-white/80">
                                {nameResultData?.strokes?.[key] ?? "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {nameResultData?.careers && nameResultData.careers.length > 0 && (
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <h4 className="text-sm font-bold text-white/70 mb-2">💼 직업 적성</h4>
                        <div className="space-y-1">
                          {nameResultData.careers.map((career, i) => (
                            <p key={i} className="text-sm text-white/80">
                              {i + 1}. {career}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div
                  className={`rounded-2xl border-2 p-5 backdrop-blur-md transition-all duration-1000 ${
                    isNamePremiumUnlocked
                      ? "border-yellow-500/50 bg-[#16120d]/90 shadow-[0_0_24px_rgba(234,179,8,0.15)]"
                      : "border-yellow-500/20 bg-black/40"
                  }`}
                >
                  <h4 className="mb-5 text-center text-base font-bold text-yellow-400 border-b border-yellow-500/20 pb-3">
                    ✨ 심층 작명 분석 리포트
                  </h4>

                  {isNamePremiumUnlocked && nameResultData?.premiumReport?.basisBox && (
                    <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                      <h5 className="mb-3 text-sm font-bold text-emerald-400 flex items-center gap-2">
                        <span>📊</span> 작명 근거 Data 요약
                      </h5>
                      <ul className="space-y-2 text-sm text-white/80">
                        <li className="flex gap-2"><strong className="text-emerald-500/80 min-w-[60px]">음령오행:</strong> <span>{nameResultData.premiumReport.basisBox.pronunciation}</span></li>
                        <li className="flex gap-2"><strong className="text-emerald-500/80 min-w-[60px]">자원/의미:</strong> <span>{nameResultData.premiumReport.basisBox.resource}</span></li>
                        <li className="flex gap-2"><strong className="text-emerald-500/80 min-w-[60px]">사주매칭:</strong> <span>{nameResultData.premiumReport.basisBox.sajuRelation}</span></li>
                      </ul>
                    </div>
                  )}

                  <div className="space-y-4">
                    {[
                      { key: "coreEnergy", label: "핵심 기운 및 파동 분석", icon: "🌊", content: nameResultData?.premiumReport?.coreEnergy },
                      { key: "nameFlow", label: "음양오행 심층 분석", icon: "☯️", content: nameResultData?.premiumReport?.nameFlow },
                      { key: "sajuFit", label: "사주와 이름의 궁합", icon: "🧬", content: nameResultData?.premiumReport?.sajuFit },
                      { key: "lifeCycle", label: "인생 총운 (초/중/말년)", icon: "⏳", content: nameResultData?.premiumReport?.lifeCycle },
                    ].map((item) => (
                      <div key={item.key} className="rounded-xl border border-white/5 bg-white/5 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-yellow-400 flex items-center gap-2">
                            <span>{item.icon}</span> {item.label}
                          </span>
                          {!isNamePremiumUnlocked && <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">🔒 잠금</span>}
                        </div>
                        <div className={`text-sm leading-relaxed transition-all duration-1000 ${isNamePremiumUnlocked ? "text-white/90 whitespace-pre-wrap" : "text-white/30 blur-sm select-none"}`}>
                          {isNamePremiumUnlocked ? formatHighlight(item.content) : (item.content ?? "데이터를 불러오는 중입니다...")}
                        </div>
                      </div>
                    ))}
                  </div>
                 
                  <p className="mt-5 text-[11px] text-white/40 text-center break-keep">
                    ※ 본 분석은 정통 성명학 데이터를 기반으로 한 엔터테인먼트 콘텐츠이므로 참고용으로만 활용해 주시기 바랍니다.
                  </p>
                </div>

                <div className="mt-8 space-y-3">
                  {isNamePremiumUnlocked ? (
                  <>
                  {/* 개명 필요성 + VIP 연계 (공유 버튼 바로 위) */}
                  {(nameResultData?.renameNeeded || nameResultData?.renameReason) && (
                    <div
                      className={`rounded-xl border p-4 ${
                        !nameResultData.renameNeeded
                          ? "border-white/15 bg-white/5"
                          : nameResultData.renameNeeded === "높음"
                            ? "border-red-500/40 bg-red-500/10"
                            : nameResultData.renameNeeded === "보통"
                              ? "border-yellow-500/40 bg-yellow-500/10"
                              : "border-green-500/40 bg-green-500/10"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <h4 className="text-sm font-bold text-white/80">✏️ 개명 필요성</h4>
                        {nameResultData.renameNeeded ? (
                          <span
                            className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                              nameResultData.renameNeeded === "높음"
                                ? "bg-red-500 text-white"
                                : nameResultData.renameNeeded === "보통"
                                  ? "bg-yellow-500 text-black"
                                  : "bg-green-500 text-black"
                            }`}
                          >
                            {nameResultData.renameNeeded}
                          </span>
                        ) : null}
                      </div>
                      {nameResultData.renameReason ? (
                        <p className="text-xs text-white/60 mb-3">{nameResultData.renameReason}</p>
                      ) : null}
                      {nameResultData.renameNeeded && nameResultData.renameNeeded !== "낮음" && (
                        <button
                          type="button"
                          onClick={() => alert("VIP 전체 대운분석과 함께 전문가 개명 상담을 받아보세요!\n\n준비 중인 서비스입니다.")}
                          className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                        >
                          👑 전문가 개명 상담 받기 (VIP 서비스)
                        </button>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleNameLinkShare}
                      className="w-full rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-sm font-bold text-sky-300 transition-all hover:bg-sky-500/20"
                    >
                      🔗 링크 공유
                    </button>
                    <button
                      type="button"
                      onClick={handleNameShare}
                      className="w-full rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm font-bold text-yellow-400 transition-all hover:bg-yellow-500/20"
                    >
                      🖼️ 이미지 공유
                    </button>
                  </div>
                  </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNamePremium}
                      className="w-full rounded-xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 px-6 py-4 text-base font-semibold text-slate-900 shadow-lg shadow-yellow-500/30 transition-all hover:scale-[1.02] active:scale-95"
                    >
                      ✨ 전문가 심층 분석 리포트 잠금 해제 (4,900원)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleNameReset}
                    className="w-full rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-medium text-white/80 transition-all hover:bg-white/10 active:scale-95"
                  >
                    ↺ 다시 하기 (처음으로)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {showNamePaymentModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setShowNamePaymentModal(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl border-2 border-yellow-500/50 bg-slate-900/90 p-6 shadow-2xl shadow-yellow-500/10 backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-4 text-center text-lg font-semibold text-yellow-400">
                ✨ 전문가 심층 이름 풀이 리포트 잠금 해제 (4,900원)
              </h3>
              <p className="mb-6 text-center text-sm text-white/70">
                핵심 기운 및 파동 분석, 음양오행 심층 분석, 사주(지장간/합충)와 이름 궁합, 인생 총운(초년/중년/말년)을 전문가가 심층 분석합니다.
              </p>
              <PaymentMethodSelector selectedPayMethod={selectedPayMethod} setSelectedPayMethod={setSelectedPayMethod} />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNamePaymentModal(false)}
                  className="flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleNamePaymentConfirm}
                  className="flex-1 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-yellow-500/25 transition-all hover:from-yellow-400 hover:to-amber-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                >
                  결제하고 리포트 열기
                </button>
              </div>
            </div>
          </div>
        )}

        {showHanjaModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setShowHanjaModal(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-4 text-center text-lg font-medium text-yellow-400">
                &quot;{hanjaModalTargetChar ?? ""}&quot; → 한자 선택
              </h3>
              {hanjaModalLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="h-10 w-10 animate-[fortune-spin_1s_linear_infinite] rounded-full border-2 border-yellow-500/50 border-t-yellow-400" />
                  <p className="text-sm text-yellow-400/90">한자 검색 중...</p>
                </div>
              ) : (
                <div className="hanja-modal-scroll max-h-[60vh] overflow-y-auto pr-2">
                  {hanjaModalResults.length > 0 ? (
                    <>
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-bold text-yellow-400">👍 이름용 추천 한자</span>
                      </div>
                      
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {hanjaModalResults.slice(0, 12).map((item, idx) => (
                          <button
                            key={`rec-${item.hanja}-${idx}`}
                            type="button"
                            onClick={() => handleHanjaSelectFromModal(item.hanja)}
                            className="flex flex-col items-center justify-center rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-center transition-all hover:bg-yellow-500/20 hover:border-yellow-400 hover:shadow-[0_0_15px_rgba(234,179,8,0.3)] focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                          >
                            <span className="text-3xl font-serif text-blue-300/90 mb-1 drop-shadow-md">{item.hanja}</span>
                            <span className="text-[11px] text-white/90 line-clamp-1 leading-tight bg-black/40 px-2 py-1 rounded w-full truncate">{item.meaning.split(',')[0]}</span>
                          </button>
                        ))}
                      </div>

                      {hanjaModalResults.length > 12 && (
                        <details className="mt-5 group">
                          <summary className="cursor-pointer text-sm text-white/50 hover:text-white/80 transition-colors list-none flex items-center justify-center border-t border-white/10 pt-4">
                            <span>전체 한자 보기 ({hanjaModalResults.length - 12}개 더보기) ▾</span>
                          </summary>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4 opacity-70 hover:opacity-100 transition-opacity">
                          {[...hanjaModalResults.slice(12)].sort((a, b) => a.meaning.localeCompare(b.meaning, 'ko-KR')).map((item, idx) => (
                              <button
                                key={`all-${item.hanja}-${idx}`}
                                type="button"
                                onClick={() => handleHanjaSelectFromModal(item.hanja)}
                                className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2 text-center transition-all hover:bg-white/10 focus:outline-none"
                              >
                                <span className="text-2xl font-serif text-blue-200/50 mb-1">{item.hanja}</span>
                                <span className="text-[10px] text-white/50 line-clamp-1 leading-tight w-full truncate">{item.meaning.split(',')[0]}</span>
                              </button>
                            ))}
                          </div>
                        </details>
                      )}
                    </>
                  ) : (
                    !hanjaModalLoading && <p className="py-8 text-center text-sm text-white/60">해당 한자를 찾을 수 없습니다.</p>
                  )}
                </div>
              )}
              <div className="mt-5">
              <button
                  type="button"
                  onClick={() => setShowHanjaModal(false)}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        <SeoAccordion title="관상·이름풀이에 대해 알아보세요 ▾" items={[
          { q: "관상학(觀相學)이란?", a: "관상은 얼굴의 생김새를 통해 성격, 운명, 건강 상태를 파악하는 동양 전통 학문입니다. 얼굴을 상정(이마·초년운), 중정(눈~코·중년운), 하정(코 아래·말년운) 세 구역으로 나눠 분석합니다." },
          { q: "성명학(姓名學)과 이름 획수의 비밀", a: "성명학에서는 이름의 획수와 음양오행 에너지가 삶에 영향을 미친다고 봅니다. 원격·형격·이격·정격·총격 다섯 가지 격을 분석하여 이름의 길흉을 판단합니다." },
          { q: "개명(改名)은 언제 고려하나요?", a: "이름 획수 대부분이 흉수이거나, 음양오행 균형이 크게 깨진 경우, 사주팔자와 이름의 오행이 심하게 충돌하는 경우 개명을 고려해볼 수 있습니다." },
        ]} />

      </div>
      </div>
    </div>
  );
}

function getLottoBallStyle(num: number) {
  if (num <= 10) return "bg-yellow-400 text-black";
  if (num <= 20) return "bg-blue-500 text-white";
  if (num <= 30) return "bg-red-500 text-white";
  if (num <= 40) return "bg-gray-500 text-white";
  return "bg-green-500 text-white";
}

function generateLottoNumbers(): number[] {
  const numbers: number[] = [];
  while (numbers.length < 6) {
    const n = Math.floor(Math.random() * 45) + 1;
    if (!numbers.includes(n)) numbers.push(n);
  }
  return numbers.sort((a, b) => a - b);
}

const LOTTO_STORAGE_KEY = "miracle-lotto-free-count";
const LOTTO_DATE_KEY = "miracle-lotto-free-date";
const MATRIX_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MATRIX_COLOR = "#0abdc6";

function LottoTab({ isVisible }: { isVisible: boolean }) {
  const [lottoHistory, setLottoHistory] = useState<number[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [freeCount, setFreeCount] = useState(3);
  
  // 🚀 유저 정보 및 DB 잔여 횟수 상태 추가
  const [user, setUser] = useState<any>(null);
  const [premiumCount, setPremiumCount] = useState(0);

  // 💡 [이스터에그 상태 관리] 추가!
  const [couponClickCount, setCouponClickCount] = useState(0);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [adWatchCount, setAdWatchCount] = useState(0); // 오늘 광고 시청 횟수
  const [adCountdown, setAdCountdown] = useState(0);

  // 세션 감지 및 DB에서 남은 횟수 불러오기
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const fetchPremiumCount = async (userId: string) => {
      const { data, error } = await supabase.from('profiles').select('premium_lotto_count').eq('id', userId).single();
      if (data && !error) setPremiumCount(data.premium_lotto_count);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchPremiumCount(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchPremiumCount(session.user.id);
      else setPremiumCount(0);
    });

    return () => subscription.unsubscribe();
  }, [isVisible]);

  // 무료 횟수 로컬 스토리지 관리
  useEffect(() => {
    if (typeof window === "undefined") return;
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem(LOTTO_DATE_KEY);
    const s = localStorage.getItem(LOTTO_STORAGE_KEY);

    if (savedDate !== today) {
      setFreeCount(3);
      localStorage.setItem(LOTTO_DATE_KEY, today);
      localStorage.setItem(LOTTO_STORAGE_KEY, "3");
    } else if (s) {
      const n = parseInt(s, 10);
      if (!Number.isNaN(n) && n >= 0) setFreeCount(n);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LOTTO_STORAGE_KEY, String(freeCount));
      localStorage.setItem(LOTTO_DATE_KEY, new Date().toDateString());
    }
  }, [freeCount]);

  const [visibleCount, setVisibleCount] = useState(0);
  const [showLottoProgressModal, setShowLottoProgressModal] = useState(false);
  const [lottoProgressStep, setLottoProgressStep] = useState(0);
  const [lottoProgressPct, setLottoProgressPct] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const LOTTO_PROGRESS_STEPS = [
    "출현 빈도 분포 정리 중...",
    "구간/합계 필터 적용 중...",
    "고급 통계 조합 계산 중...",
  ];

  // 💡 [5번 클릭 감지 로직]
  const handleCouponSecretClick = () => {
    setCouponClickCount((prev) => {
      const nextCount = prev + 1;
      if (nextCount === 5) {
        setShowCouponModal(true); // 5번 채우면 모달창 오픈!
        return 0;
      }
      return nextCount;
    });
  };

  // 💡 [클릭 2초 후 카운트 초기화]
  useEffect(() => {
    if (couponClickCount > 0) {
      const timer = setTimeout(() => setCouponClickCount(0), 2000);
      return () => clearTimeout(timer);
    }
  }, [couponClickCount]);

  // 💡 [쿠폰 확인 로직: 1회 제한 + 대표님 전용 초기화 기능]
  const handleCouponSubmit = async () => {
    // 👑 대표님 전용 시크릿 초기화 키 (영상 촬영용)
    if (couponInput === "쿠폰초기화") {
      if (user) localStorage.removeItem(`coupon_used_${user.id}`);
      alert("✨ [관리자] 쿠폰 사용 기록이 초기화되었습니다. 이제 다시 쓸 수 있습니다!");
      setCouponInput("");
      return;
    }

    if (couponInput === "로또1등기원") {
      if (!user) {
        alert("로그인이 필요합니다. 먼저 카카오 로그인을 해주세요!");
        setShowCouponModal(false);
        return;
      }

      // 🚫 일반 유저 1회 한정 차단 로직
      if (localStorage.getItem(`coupon_used_${user.id}`)) {
        alert("❌ 이미 사용 완료된 쿠폰입니다. (1인 1회 한정)");
        setShowCouponModal(false);
        setCouponInput("");
        return;
      }

      alert("🎉 시크릿 쿠폰 확인! 로또 10회 이용권이 충전되었습니다.");
      
      // 🔒 쿠폰 사용 완료 도장 찍기
      localStorage.setItem(`coupon_used_${user.id}`, "true");

      // 프론트엔드 숫자 즉시 증가
      setPremiumCount((prev) => prev + 10);

      // DB에도 횟수 반영 업데이트
      await supabase
        .from('profiles')
        .update({ premium_lotto_count: premiumCount + 10 })
        .eq('id', user.id);

      setShowCouponModal(false);
      setCouponInput("");
    } else {
      alert("❌ 유효하지 않은 쿠폰 번호입니다.");
    }
  };

  // 매트릭스 애니메이션 효과
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isVisible) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) { canvas.width = parent.clientWidth; canvas.height = parent.clientHeight; } 
      else { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    };
    resize();
    window.addEventListener("resize", resize);
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = Array(columns).fill(1);

    const draw = () => {
      ctx.fillStyle = "rgba(10, 10, 10, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px monospace`;
      ctx.fillStyle = "rgba(180, 140, 30, 0.45)";
      for (let i = 0; i < drops.length; i++) {
        const char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        ctx.fillText(char, x, y);
        if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };
    let frameId: number;
    const loop = () => { draw(); frameId = requestAnimationFrame(loop); };
    frameId = requestAnimationFrame(loop);
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(frameId); };
  }, [isVisible]);

  // 일반 무료 번호 생성
  const handleFreeDraw = () => {
    if (freeCount <= 0) return alert("무료 횟수가 모두 소진되었습니다.");
    if (isDrawing) return;
    supabase.rpc('increment_tab_click', { target_tab_id: 'lotto' }).then(({ error }) => { if(error) console.error('로또 에러:', error) });
    setIsDrawing(true);
    setVisibleCount(0);
    const numbers = generateLottoNumbers();
    setLottoHistory((prev) => [numbers, ...prev]);
    setFreeCount((c) => c - 1);
    numbers.forEach((_, i) => { setTimeout(() => setVisibleCount((v) => v + 1), i * 450); });
    setTimeout(() => setIsDrawing(false), numbers.length * 450 + 100);
  };

  // 10회권 묶음 결제 진행 함수
  const handleLottoPaymentConfirm = async () => {
    if (!user) return alert("로그인 정보가 없습니다.");
    
    if (typeof window !== "undefined") {
      const IMP = (window as any).IMP;
      if (!IMP) return alert("🚨 결제 시스템 로딩 실패.");
      IMP.init("imp61375123"); 

      const amount = 4500; // 10회권 가격
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      const payData: any = {
        channelKey: selectedPayMethod === "kpn" ? "channel-key-47b05312-c2e5-4e20-8b76-afb3915eb765" : selectedPayMethod === "tosspay" ? "channel-key-ec9a613e-4407-413c-9ad1-921edb7b694e" : "channel-key-314bb395-3a71-48e6-a2a1-fed1d4ccb8c1",
        pay_method: "card",
        merchant_uid: `mid_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        name: "고급 통계 로또 추천 10회 이용권",
        amount: amount,
        buyer_email: user.email || "test@ymstudio.co.kr", 
        buyer_name: user.user_metadata?.name || "명운 사용자",
        app_scheme: "myungun",
      };

      if (isMobile) {
        const toolsOrigin = `${window.location.origin}/tools`;
        payData.m_redirect_url = `${toolsOrigin}?tab=lotto`;
        localStorage.removeItem("pendingPremiumWish");
        localStorage.setItem("pendingPaymentType", "lotto");
        localStorage.setItem("pendingPaymentAmount", String(amount));
        localStorage.setItem("pendingPaymentUserId", user.id);
        savePendingPaymentData({ v: 1, tab: "lotto", flow: "lotto" });
        savePendingPaymentState({
          tab: "lotto",
          flow: "lotto",
          lotto: { amount, userId: user.id },
        });
      }

      IMP.request_pay(payData, async function (rsp: any) {
        if (!rsp || rsp.success !== true) {
          const isUserCancel =
            rsp?.error_msg?.includes("사용자 취소") || rsp?.error_code === "F1002" || rsp?.error_code === "F1001";
          if (isUserCancel && !isMobile) {
            alert("결제가 취소되었습니다.\n💡 PC 화면 결제창의 [결제 완료] 버튼을 눌러주세요!");
          } else {
            alert(rsp?.error_msg ? `결제가 취소되었습니다.\n${rsp.error_msg}` : "결제가 취소되었습니다.");
          }
          return;
        }
        try {
            const verifyRes = await fetch(PAYMENT_VERIFY_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                paymentType: "lotto",
                imp_uid: rsp.imp_uid,
                paymentId: rsp.imp_uid,
                merchant_uid: rsp.merchant_uid,
                amount: amount,
                userId: user.id
              }),
            });
            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              setShowLottoPaymentModal(false);
              alert("✨ 결제 성공! 로또 10회 이용권이 충전되었습니다.");
              const { data } = await supabase.from('profiles').select('premium_lotto_count').eq('id', user.id).single();
              if (data) setPremiumCount(data.premium_lotto_count);
            } else {
              alert(`🚨 결제 검증 실패: ${verifyData.message}`);
            }
        } catch (error) {
          console.error("결제 검증 오류:", error);
          alert("서버 오류가 발생했습니다.");
        }
      });
    }
  };

  const handlePremiumClick = () => {
    if (isDrawing) return;
    void executeLottoDraw(false);
  };

  // 실제 고급 통계 로또 번호 추출
  const executeLottoDraw = async (usePremium: boolean = false) => {
    if (usePremium && user) {
      const { data, error } = await supabase.rpc('use_premium_lotto', { user_id: user.id });
      if (error || !data) {
        alert("잔여 횟수 차감 중 오류가 발생했습니다.");
        return;
      }
      setPremiumCount(c => c - 1);
    }

    setShowLottoProgressModal(true);
    setLottoProgressStep(0);
    setLottoProgressPct(0);
    const progressInterval = setInterval(() => setLottoProgressPct((p) => Math.min(100, p + 2)), 60);
    setTimeout(() => setLottoProgressStep(1), 900);
    setTimeout(() => setLottoProgressStep(2), 1800);

    try {
      const res = await fetch("/api/lotto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "생성 실패");

      const numbers = data.numbers as number[];
      clearInterval(progressInterval);
      setLottoProgressPct(100);
      setShowLottoProgressModal(false);
      setIsDrawing(true);
      setVisibleCount(0);
      setLottoHistory((prev) => [numbers, ...prev]);

      numbers.forEach((_, i) => setTimeout(() => setVisibleCount((v) => v + 1), i * 450));
      setTimeout(() => setIsDrawing(false), numbers.length * 450 + 100);
    } catch (err) {
      clearInterval(progressInterval);
      setShowLottoProgressModal(false);
      alert(err instanceof Error ? err.message : "오류가 발생했습니다.");
    }
  };

  const handleAdminReset = () => {
    setFreeCount(3);
    if (typeof window !== "undefined") localStorage.setItem(LOTTO_STORAGE_KEY, "3");
    alert("✨ [비밀 관리자 모드] 로또 무료 횟수가 3회로 초기화되었습니다.");
  };

  // 광고 보고 프리미엄 뽑기
  const handleWatchAdForPremium = () => {
    if (isWatchingAd) return;
    setIsWatchingAd(true);
    setAdCountdown(5);

    // 5초 카운트다운 (실제 광고 연동 전 시뮬레이션)
    let count = 5;
    const timer = setInterval(() => {
      count--;
      setAdCountdown(count);
      if (count <= 0) {
        clearInterval(timer);
        setIsWatchingAd(false);
        setAdWatchCount(prev => prev + 1);
        // 광고 시청 완료 → 프리미엄 뽑기 실행
        void executeLottoDraw(false);
      }
    }, 1000);
  };

  const currentSet = lottoHistory[0] ?? [];
  const displayHistory = lottoHistory.slice(0, 5);

  return (
    <div role="tabpanel" aria-hidden={!isVisible} className={isVisible ? "relative w-full overflow-x-hidden" : "hidden"}>
      <div className="relative isolate min-h-[100svh] w-full overflow-x-hidden">
      <canvas ref={canvasRef} id="matrix-canvas" className="absolute inset-0 z-0 opacity-30 pointer-events-none" />

      {/* 로딩 모달창 */}
      {showLottoProgressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-yellow-700/30 bg-[#17120d]/90 p-8 backdrop-blur-md shadow-2xl">
            <p className="mb-6 text-center text-lg font-medium text-yellow-300">{LOTTO_PROGRESS_STEPS[lottoProgressStep]}</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
              <div className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 transition-all duration-75 ease-out" style={{ width: `${lottoProgressPct}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* 🎁 시크릿 쿠폰 모달창 */}
      {showCouponModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-yellow-500/30 bg-[#111] p-6 shadow-2xl md:p-8">
            <h3 className="mb-2 text-center text-2xl font-bold text-white">🤫 시크릿 쿠폰</h3>
            <p className="mb-6 text-center text-sm text-gray-400">숨겨진 쿠폰 코드를 입력하세요.</p>
            
            <input
              type="text"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              placeholder="쿠폰 번호 입력"
              className="mb-4 w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-center text-white focus:border-yellow-500 focus:outline-none"
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowCouponModal(false)}
                className="flex-1 rounded-lg bg-gray-800 py-3 text-gray-300 transition hover:bg-gray-700"
              >
                닫기
              </button>
              <button
                onClick={handleCouponSubmit}
                className="flex-1 rounded-lg bg-gradient-to-r from-yellow-600 to-yellow-400 py-3 font-bold text-black transition hover:scale-105"
              >
                충전하기
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 py-6">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full border border-yellow-700/40 bg-yellow-500/10 px-3 py-1 text-[11px] text-yellow-200 backdrop-blur-sm">이번 주 추천 조합</span>
          
          {/* 👇 cursor-text 적용으로 일반 글씨와 똑같이 I빔 커서가 뜨도록 완벽 위장 */}
          <span 
            onClick={handleCouponSecretClick}
            className="cursor-text select-none rounded-full border border-yellow-700/40 bg-yellow-500/10 px-3 py-1 text-[11px] text-yellow-200 backdrop-blur-sm"
          >
            무료 3회 제공
          </span>

          {user && premiumCount > 0 && <span className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3 py-1 text-[11px] text-emerald-300 font-bold backdrop-blur-sm">이용권 {premiumCount}회 보유</span>}
        </div>

        <div className="w-full max-w-2xl rounded-3xl border border-yellow-700/35 bg-[#151515]/85 p-6 shadow-[0_0_30px_rgba(245,158,11,0.08)] backdrop-blur-md">
          <div className="mb-5 text-center">
            <h2 onClick={() => pushSecret("L", handleAdminReset)} className="text-xl font-bold text-yellow-300 select-none cursor-pointer">행운의 로또 번호 추출기</h2>
            <p className="mt-2 text-sm text-yellow-50/70">가볍게 번호를 뽑고, 필요하면 고급 통계 필터 추천까지 받아볼 수 있습니다.</p>
          </div>

          <div className="rounded-2xl border border-yellow-800/20 bg-[#0f0f0f]/70 px-4 py-6">
            <p className="mb-4 text-center text-sm font-medium tracking-wide text-yellow-200/80">이번에 추출된 번호</p>
            <div className="flex min-h-[100px] flex-wrap items-center justify-center gap-5">
              {currentSet.length === 0 ? (
                <p className="text-sm text-yellow-50/45">아직 생성된 번호가 없습니다. 아래 버튼을 눌러 시작하세요.</p>
              ) : (
                currentSet.map((num, i) => (
                  <div key={`current-${num}-${i}`} className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold shadow-inner ring-2 ring-black/20 ${getLottoBallStyle(num)} ${i < visibleCount ? "animate-[lotto-ball-bounce_0.5s_ease-out_forwards]" : "opacity-0 scale-0"}`}>
                    {num}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {/* 무료 뽑기 버튼 */}
            <button
              type="button"
              onClick={handleFreeDraw}
              disabled={isDrawing || freeCount <= 0}
              className="w-full rounded-xl border border-yellow-700/40 bg-[#2a2a2a] px-6 py-3 text-sm font-medium text-yellow-200 transition-all hover:bg-[#333333] disabled:opacity-50"
            >
              {freeCount > 0
                ? `일반 번호 생성 (남은 횟수: ${freeCount}/3)`
                : "오늘 무료 횟수를 모두 사용했습니다"}
            </button>

            {/* 광고 보고 고급 통계 뽑기 */}
            <button
              type="button"
              onClick={handleWatchAdForPremium}
              disabled={isWatchingAd || showLottoProgressModal}
              className="w-full rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 px-6 py-3 text-sm font-bold text-slate-900 shadow-lg shadow-yellow-900/25 transition-all hover:from-yellow-400 hover:to-amber-500 disabled:opacity-50 relative overflow-hidden"
            >
              {isWatchingAd ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                  광고 시청 중... ({adCountdown}초)
                </span>
              ) : (
                <span>📺 광고 보고 고급 통계 번호 추출</span>
              )}
              {/* 카운트다운 진행바 */}
              {isWatchingAd && (
                <div
                  className="absolute bottom-0 left-0 h-1 bg-slate-900/40 transition-all"
                  style={{ width: `${((5 - adCountdown) / 5) * 100}%` }}
                />
              )}
            </button>

            {adWatchCount > 0 && (
              <p className="text-center text-xs text-yellow-300/60">
                오늘 광고 시청 {adWatchCount}회 완료 ✓
              </p>
            )}
          </div>
        </div>

        {displayHistory.length > 0 && (
          <div className="w-full max-w-lg space-y-3">
            <h3 className="text-center text-sm font-medium text-yellow-300/90">추천 번호 이력</h3>
            <div className="space-y-2">
              {displayHistory.map((nums, idx) => (
                <div key={idx} className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-yellow-700/20 bg-[#1a1a1a]/80 px-4 py-3">
                  {nums.map((num, i) => (
                    <div key={`${idx}-${i}`} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-inner ${getLottoBallStyle(num)}`}>
                      {num}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        <a href="https://www.dhlottery.co.kr/" target="_blank" rel="noreferrer noopener" className="mt-2 w-full max-w-md rounded-2xl border border-yellow-700/30 bg-[#191611]/90 px-4 py-4 transition-all hover:bg-[#211c15]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/15 text-lg">🎟</div>
              <div>
                <p className="text-sm font-medium text-yellow-200">동행복권 공식 홈페이지</p>
                <p className="mt-1 text-xs text-yellow-50/50">추첨 결과 및 판매점 정보 확인</p>
              </div>
            </div>
            <span className="text-sm text-yellow-300/70">→</span>
          </div>
        </a>
      </div>
      </div>
    </div>
  );
}

// 🚀 [정통 객관식 MBTI 테스트 32문항 & 결과 데이터]
const MBTI_QUESTIONS = [
  { id: 1, text: "새로운 사람들을 만나는 자리에 가는 것이 즐겁습니다.", axis: "EI", reverse: false },
  { id: 2, text: "주말에는 밖으로 나가기보다 집에서 쉬는 것이 좋습니다.", axis: "EI", reverse: true },
  { id: 3, text: "대화를 할 때 주로 듣는 것보다 말하는 것을 선호합니다.", axis: "EI", reverse: false },
  { id: 4, text: "주목받는 일은 가능하면 피하고 싶습니다.", axis: "EI", reverse: true },
  { id: 5, text: "주변 사람들에게 에너지가 넘친다는 말을 자주 듣습니다.", axis: "EI", reverse: false },
  { id: 6, text: "여러 사람과 함께 시간을 보내면 쉽게 피로해집니다.", axis: "EI", reverse: true },
  { id: 7, text: "처음 보는 사람에게 먼저 다가가 대화를 시작하는 편입니다.", axis: "EI", reverse: false },
  { id: 8, text: "전화 통화보다 메시지를 주고받는 것이 훨씬 편합니다.", axis: "EI", reverse: true },
  
  { id: 9, text: "종종 비현실적이고 엉뚱하지만 흥미로운 상상을 하곤 합니다.", axis: "SN", reverse: true },
  { id: 10, text: "사실과 경험에 기반하여 현실적으로 판단하는 것을 선호합니다.", axis: "SN", reverse: false },
  { id: 11, text: "사물의 숨겨진 의미나 비유를 찾는 것을 좋아합니다.", axis: "SN", reverse: true },
  { id: 12, text: "구체적이고 명확한 지시사항이 주어지는 것이 편합니다.", axis: "SN", reverse: false },
  { id: 13, text: "앞으로 다가올 미래보다 현재 일어나고 있는 일이 더 중요합니다.", axis: "SN", reverse: false },
  { id: 14, text: "가끔 머릿속에서 여러 가지 생각이 꼬리를 물고 이어집니다.", axis: "SN", reverse: true },
  { id: 15, text: "추상적인 이론보다는 당장 써먹을 수 있는 실용적인 정보가 좋습니다.", axis: "SN", reverse: false },
  { id: 16, text: "일을 할 때 기존의 방식보다 새롭고 독창적인 방식을 시도해 봅니다.", axis: "SN", reverse: true },

  { id: 17, text: "논쟁에서 이기는 것보다 상대방의 기분을 상하지 않게 하는 것이 더 중요합니다.", axis: "TF", reverse: true },
  { id: 18, text: "결정을 내릴 때 감정보다는 객관적인 사실과 논리를 우선합니다.", axis: "TF", reverse: false },
  { id: 19, text: "누군가 위로를 원할 때, 해결책을 제시하기보다 공감해 주는 편입니다.", axis: "TF", reverse: true },
  { id: 20, text: "종종 사람들의 감정보다 효율성을 더 중시하곤 합니다.", axis: "TF", reverse: false },
  { id: 21, text: "슬픈 영화나 사연을 보면 쉽게 눈물이 나거나 감정 이입이 됩니다.", axis: "TF", reverse: true },
  { id: 22, text: "나에게 비판적인 피드백을 주더라도 그것이 사실이라면 기꺼이 수용합니다.", axis: "TF", reverse: false },
  { id: 23, text: "친구가 '나 우울해서 화분 샀어'라고 하면 화분의 종류보다 우울한 이유를 먼저 묻습니다.", axis: "TF", reverse: true },
  { id: 24, text: "규칙이나 원칙은 상황에 따라 유연하게 바꾸기보다 엄격하게 지켜져야 합니다.", axis: "TF", reverse: false },

  { id: 25, text: "여행을 갈 때 세부적인 일정을 미리 철저하게 세우는 편입니다.", axis: "JP", reverse: false },
  { id: 26, text: "일정을 꽉 채우기보다 그때그때 기분에 따라 즉흥적으로 행동하는 것이 좋습니다.", axis: "JP", reverse: true },
  { id: 27, text: "할 일이 있으면 미루지 않고 즉시 시작하는 편입니다.", axis: "JP", reverse: false },
  { id: 28, text: "마감 기한이 임박해야 비로소 에너지가 솟고 능률이 오릅니다.", axis: "JP", reverse: true },
  { id: 29, text: "물건들이 항상 정해진 자리에 깔끔하게 정리되어 있는 것을 좋아합니다.", axis: "JP", reverse: false },
  { id: 30, text: "계획이 갑자기 변경되어도 유연하게 잘 대처하는 편입니다.", axis: "JP", reverse: true },
  { id: 31, text: "일을 시작하기 전에 필요한 모든 단계와 결과를 미리 구상합니다.", axis: "JP", reverse: false },
  { id: 32, text: "정리정돈보다는 현재 하고 있는 일에 더 집중하는 편입니다.", axis: "JP", reverse: true },
];

const MBTI_RESULTS: Record<string, any> = {
  "ENFJ": { title: "언변능숙형", emoji: "🌟", desc: "따뜻하고 적극적이며 책임감이 강하고 사교성이 풍부하고 동정심이 많습니다.", traits: ["마음이 약하고 남의 의견에 동화를 잘함", "말로 표현을 잘하고 생각이 깊음", "적극적이고 추진력이 강함"], bad: ["현실적인 일과 세부 사항에 약함", "인간관계에 얽매여 큰 일을 놓칠 수 있음"] },
  "ENFP": { title: "스파크형", emoji: "✨", desc: "정열적이고 활기가 넘치며 상상력이 풍부하고 온정적입니다.", traits: ["감정 기복이 심함", "새로운 시도를 좋아함", "사람을 기쁘게 하는 타고난 능력"], bad: ["반복적인 일상을 견디기 힘들어함", "마무리가 약함"] },
  "ENTJ": { title: "지도자형", emoji: "🚀", desc: "열성이 많고 솔직하고 단호하며 통솔력이 있습니다.", traits: ["타고난 리더십", "효율성을 극도로 중시함", "감정 표현에 서툴 수 있음"], bad: ["타인의 감정을 무시할 때가 있음", "지나친 완벽주의"] },
  "ENTP": { title: "발명가형", emoji: "💡", desc: "민첩하고 독창적이며 안목이 넓고 다방면에 관심과 재능이 많습니다.", traits: ["두뇌 회전이 빠름", "논쟁을 즐김", "반복되는 일을 싫어함"], bad: ["일상적이고 세부적인 일을 소홀히 함", "말만 앞설 수 있음"] },
  "ESFJ": { title: "친선도모형", emoji: "🤝", desc: "동정심이 많고 다른 사람에게 관심을 쏟으며 인화를 중시합니다.", traits: ["타고난 조력자", "규칙과 질서를 잘 지킴", "남의 인정을 받는 것을 중요시함"], bad: ["거절을 잘 못함", "변화에 적응하기 힘들어함"] },
  "ESFP": { title: "사교적인 유형", emoji: "🎉", desc: "사교적이고 활동적이며 수용력이 강하고 친절하며 낙천적입니다.", traits: ["분위기 메이커", "현실적이고 실제적임", "사람들과 어울리는 것을 좋아함"], bad: ["장기적인 계획 세우기를 어려워함", "진지한 상황을 피하려 함"] },
  "ESTJ": { title: "사업가형", emoji: "💼", desc: "구체적이고 현실적이고 사실적이며 활동을 조직화하고 주도해 나가는 지도력이 있습니다.", traits: ["강한 책임감", "현실감각이 뛰어남", "타고난 관리자"], bad: ["타인의 감정을 고려하지 못할 때가 있음", "너무 융통성이 없음"] },
  "ESTP": { title: "수완좋은 활동가형", emoji: "🏎️", desc: "현실적인 문제 해결에 능하며 적응력이 강하고 관용적입니다.", traits: ["스릴을 즐김", "관찰력이 뛰어남", "실용성을 중시함"], bad: ["충동적일 수 있음", "이론적인 논의를 지루해함"] },
  "INFJ": { title: "예언자형", emoji: "🔮", desc: "인내심이 많고 통찰력과 직관력이 뛰어나며 양심이 바르고 화합을 추구합니다.", traits: ["깊은 통찰력", "완벽주의 성향", "타인의 감정을 잘 읽음"], bad: ["현실 감각이 부족할 수 있음", "혼자만의 시간이 매우 필요함"] },
  "INFP": { title: "잔다르크형", emoji: "🕊️", desc: "정열적이고 충실하며 목가적이고, 낭만적이며 내적 신념이 깊습니다.", traits: ["이상주의자", "공감 능력이 뛰어남", "개인적인 가치를 중시함"], bad: ["지나치게 감정적일 수 있음", "행동보다 생각이 많음"] },
  "INTJ": { title: "과학자형", emoji: "♟️", desc: "사고가 독창적이고 창의력이 뛰어나며, 비판적인 분석력이 탁월합니다.", traits: ["독립적인 성향", "전략적 사고", "지식에 대한 갈망"], bad: ["타인에게 차갑게 보일 수 있음", "오만해 보일 수 있음"] },
  "INTP": { title: "아이디어 뱅크형", emoji: "🔬", desc: "조용하고 과묵하며 논리와 분석으로 문제를 해결하기 좋아합니다.", traits: ["객관적인 분석력", "지적 호기심이 강함", "관습에 얽매이지 않음"], bad: ["실행력이 부족함", "타인의 감정에 둔감할 수 있음"] },
  "ISFJ": { title: "임금 뒷면의 권력형", emoji: "🛡️", desc: "조용하고 차분하며 친근하고 책임감이 있으며 헌신적입니다.", traits: ["세심한 배려", "책임감이 강함", "전통을 중시함"], bad: ["변화를 싫어함", "자신의 의견을 강하게 주장하지 못함"] },
  "ISFP": { title: "성인군자형", emoji: "🎨", desc: "말없이 다정하고 온화하며 친절하고 연기력이 뛰어나며 겸손합니다.", traits: ["예술적 감각", "현재를 즐김", "갈등을 피하려 함"], bad: ["계획성이 부족함", "비판에 매우 민감함"] },
  "ISTJ": { title: "세상의 소금형", emoji: "📋", desc: "실제 사실에 대하여 정확하고 체계적으로 기억하며 일 처리에 있어서도 신중하고 책임감이 있습니다.", traits: ["철저한 계획", "신뢰할 수 있음", "원리원칙주의"], bad: ["융통성이 부족함", "새로운 아이디어를 수용하기 어려워함"] },
  "ISTP": { title: "백과사전형", emoji: "🛠️", desc: "조용하고 과묵하고 절제된 호기심으로 인생을 관찰하며 상황을 파악하는 민감성과 도구를 다루는 뛰어난 능력이 있습니다.", traits: ["뛰어난 위기 대처 능력", "효율성을 중시함", "독립적임"], bad: ["무뚝뚝해 보일 수 있음", "장기적인 약속을 꺼림"] },
};

function MbtiTab({ isVisible, onNavigate }: { isVisible: boolean, onNavigate: (id: TabId) => void }) {
  const [step, setStep] = useState(0); 
  const [scores, setScores] = useState({ E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 });
  const [history, setHistory] = useState<any[]>([]); // 🚀 이전 버튼을 위한 기록 저장소
  const [resultType, setResultType] = useState("");

  const handleAnswer = (score: number, axis: string, reverse: boolean) => {
    const adjustedScore = reverse ? -score : score;
    const newScores = { ...scores };
    
    if (axis === "EI") { adjustedScore > 0 ? newScores.E += adjustedScore : newScores.I += Math.abs(adjustedScore); }
    if (axis === "SN") { adjustedScore > 0 ? newScores.S += adjustedScore : newScores.N += Math.abs(adjustedScore); }
    if (axis === "TF") { adjustedScore > 0 ? newScores.T += adjustedScore : newScores.F += Math.abs(adjustedScore); }
    if (axis === "JP") { adjustedScore > 0 ? newScores.J += adjustedScore : newScores.P += Math.abs(adjustedScore); }
    
    setScores(newScores);
    // 🚀 이전 버튼을 위해 현재 상태를 기록에 추가
    setHistory([...history, { newScores }]);
    
    if (step < MBTI_QUESTIONS.length) {
      setStep(step + 1);
    } else {
      calculateResult(newScores);
    }
  };

  // 🚀 이전 문항으로 돌아가기 로직
  const handlePrevious = () => {
    if (step > 1 && history.length > 0) {
      const newHistory = [...history];
      newHistory.pop(); // 방금 한 답변 기록 제거
      const prevScores = newHistory.length > 0 ? newHistory[newHistory.length - 1].newScores : { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
      
      setScores(prevScores);
      setHistory(newHistory);
      setStep(step - 1);
    } else if (step === 1) {
      resetTest();
    }
  };

  const calculateResult = (finalScores: any) => {
    supabase.rpc('increment_tab_click', { target_tab_id: 'mbti' }).then(({ error }) => { if(error) console.error('MBTI 에러:', error) });
    setStep(99); 
    setTimeout(() => {
      const type = 
        (finalScores.E >= finalScores.I ? "E" : "I") +
        (finalScores.S >= finalScores.N ? "S" : "N") +
        (finalScores.T >= finalScores.F ? "T" : "F") +
        (finalScores.J >= finalScores.P ? "J" : "P");
      setResultType(type);
      setStep(100); 
    }, 2500);
  };

  const resetTest = () => {
    setScores({ E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 });
    setHistory([]);
    setResultType("");
    setStep(0);
  };

  // 🚀 결과창 퍼센트 그래프 렌더링 함수
  const renderSpectrum = (leftLabel: string, leftScore: number, rightLabel: string, rightScore: number, colorClass: string) => {
    const total = leftScore + rightScore || 1; // 0 나누기 방지
    const leftPct = Math.round((leftScore / total) * 100);
    const rightPct = 100 - leftPct;

    return (
      <div className="mb-5">
        <div className="flex justify-between text-xs font-bold text-white/90 mb-1.5 px-1">
          <span>{leftLabel} ({leftPct}%)</span>
          <span>{rightLabel} ({rightPct}%)</span>
        </div>
        <div className="h-3 w-full bg-slate-800/80 rounded-full overflow-hidden flex shadow-inner">
          <div className={`h-full ${colorClass} transition-all duration-1000 ease-out`} style={{ width: `${leftPct}%` }}></div>
          <div className="h-full bg-slate-600/50 transition-all duration-1000 ease-out" style={{ width: `${rightPct}%` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div role="tabpanel" aria-hidden={!isVisible} className={isVisible ? "relative w-full" : "hidden"}>
      <div className="relative isolate min-h-[100svh] w-full">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-slate-900">
          <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: "url('/bg_mbti.png')" }} />
        </div>

      <div className="relative z-10 flex w-full flex-col items-center px-4 py-6">
        
        {/* 1. 시작 화면 */}
        {step === 0 && (
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl shadow-2xl">
            <span className="text-teal-400 text-xs font-bold tracking-widest bg-teal-500/10 px-3 py-1 rounded-full mb-4 inline-block border border-teal-500/20">MBTI TEST</span>
            <h2 className="text-3xl font-extrabold text-white mb-4">심층 성격 검사</h2>
            <p className="text-sm text-white/70 leading-relaxed mb-8">
              나는 어떤 사람일까?<br/>핵심만 뽑아낸 32개의 문항을 통해<br/>숨겨진 진짜 내 성격을 알아보세요.
            </p>
            <button onClick={() => setStep(1)} className="w-full rounded-2xl bg-gradient-to-r from-teal-500 to-indigo-500 px-6 py-4 text-base font-bold text-white shadow-lg hover:scale-[1.02] transition-transform">
              검사 시작하기 (약 3분 소요)
            </button>
          </div>
        )}

        {/* 2. 질문 화면 */}
        {step > 0 && step <= MBTI_QUESTIONS.length && (
          <div className="w-full max-w-md animate-fade-in-up">
            <div className="mb-6 flex items-center justify-between px-2 text-xs font-bold text-teal-400">
              <span>진행률</span>
              <span>{step} / {MBTI_QUESTIONS.length}</span>
            </div>
            <div className="mb-8 h-2 w-full rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-teal-500 transition-all duration-300" style={{ width: `${(step / MBTI_QUESTIONS.length) * 100}%` }} />
            </div>
            
            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 md:p-8 backdrop-blur-xl shadow-2xl text-center">
              <h3 className="text-lg md:text-xl font-bold text-white mb-8 break-keep leading-relaxed min-h-[60px] flex items-center justify-center">
                {MBTI_QUESTIONS[step - 1].text}
              </h3>
              
              <div className="flex flex-col gap-3">
                {[
                  { label: "매우 그렇다", score: 2, color: "bg-teal-500 hover:bg-teal-400 border-teal-400" },
                  { label: "그렇다", score: 1, color: "bg-teal-500/60 hover:bg-teal-400/80 border-teal-500/50" },
                  { label: "보통이다", score: 0, color: "bg-slate-700 hover:bg-slate-600 border-slate-600" },
                  { label: "아니다", score: -1, color: "bg-indigo-500/60 hover:bg-indigo-400/80 border-indigo-500/50" },
                  { label: "매우 아니다", score: -2, color: "bg-indigo-500 hover:bg-indigo-400 border-indigo-400" },
                ].map((btn, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleAnswer(btn.score, MBTI_QUESTIONS[step - 1].axis, MBTI_QUESTIONS[step - 1].reverse)}
                    className={`w-full py-4 rounded-xl text-sm font-bold text-white transition-all shadow-md border ${btn.color} active:scale-95`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* 🚀 이전으로 돌아가기 버튼 추가 */}
              <button 
                onClick={handlePrevious} 
                className="mt-6 text-xs text-white/40 hover:text-white/80 underline underline-offset-4 transition-colors"
              >
                ← 이전 질문으로 돌아가기
              </button>
            </div>
          </div>
        )}

        {/* 3. 로딩 화면 */}
        {step === 99 && (
          <div className="flex flex-col items-center justify-center gap-6">
            <div className="h-16 w-16 animate-spin rounded-full border-[4px] border-teal-500/30 border-t-teal-400" />
            <p className="text-teal-300 font-bold tracking-wide animate-pulse">심리 패턴을 분석 중입니다...</p>
          </div>
        )}

        {/* 4. 결과 화면 */}
        {step === 100 && resultType && MBTI_RESULTS[resultType] && (
          <div id="mbti-capture-area" className="w-full max-w-2xl animate-fade-in-up pb-8">
            <div className="rounded-3xl border border-teal-500/30 bg-slate-900/95 p-6 md:p-10 backdrop-blur-xl shadow-[0_0_40px_rgba(20,184,166,0.15)]">
              
              {/* 🚀 썸네일 이모지 및 타이틀 */}
              <div className="text-center mb-8 pb-8">
                <div className="text-7xl mb-4 animate-bounce">
                  {MBTI_RESULTS[resultType].emoji}
                </div>
                <p className="text-sm font-bold text-teal-400 mb-2">당신의 심리 분석 결과는?</p>
                <h2 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400 mb-4 drop-shadow-lg">
                  {resultType}
                </h2>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-4">
                  {MBTI_RESULTS[resultType].title}
                </h3>
                <p className="text-sm text-white/80 leading-relaxed max-w-md mx-auto">
                  {MBTI_RESULTS[resultType].desc}
                </p>
              </div>

              {/* 🚀 아래로 스크롤 유도 애니메이션 (이탈률 방어) */}
              <div className="flex flex-col items-center justify-center mb-8 animate-bounce text-teal-400/80">
                <span className="text-xs font-bold mb-1">👇 아래로 내려서 내용 더 확인하기 👇</span>
                <span className="text-xl leading-none">⌄</span>
              </div>

              {/* 🚀 퍼센트(%) 성향 그래프 추가 */}
              <div className="mb-10 p-6 rounded-2xl bg-black/40 border border-white/5 shadow-inner">
                <h4 className="text-center text-sm font-bold text-teal-300 mb-6">📊 나의 성향 분석 스펙트럼</h4>
                {renderSpectrum("외향(E)", scores.E, "내향(I)", scores.I, "bg-teal-500")}
                {renderSpectrum("감각(S)", scores.S, "직관(N)", scores.N, "bg-blue-500")}
                {renderSpectrum("사고(T)", scores.T, "감정(F)", scores.F, "bg-amber-500")}
                {renderSpectrum("판단(J)", scores.J, "인식(P)", scores.P, "bg-purple-500")}
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="rounded-2xl bg-teal-900/20 border border-teal-500/20 p-5">
                  <h4 className="text-sm font-bold text-teal-300 mb-3 flex items-center gap-2"><span>✨</span> 강점 및 특징</h4>
                  <ul className="space-y-2 text-sm text-white/80">
                    {MBTI_RESULTS[resultType].traits.map((t: string, i: number) => (
                      <li key={i} className="flex gap-2"><span className="text-teal-500">•</span> {t}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl bg-rose-900/20 border border-rose-500/20 p-5">
                  <h4 className="text-sm font-bold text-rose-300 mb-3 flex items-center gap-2"><span>⚠️</span> 개발해야 할 점</h4>
                  <ul className="space-y-2 text-sm text-white/80">
                    {MBTI_RESULTS[resultType].bad.map((t: string, i: number) => (
                      <li key={i} className="flex gap-2"><span className="text-rose-500">•</span> {t}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                <button onClick={() => {
                    const shareData = { 
                      title: "MBTI 심층 분석", 
                      text: `나의 MBTI 결과는 ${resultType}! 확인해보세요.`, 
                      url: `${window.location.origin}/mbti/${resultType.toLowerCase()}` 
                    };
                    if (navigator.share) { navigator.share(shareData).catch(() => {}); } 
                    else { navigator.clipboard.writeText(window.location.href); alert("링크가 복사되었습니다."); }
                  }} className="w-full rounded-2xl border border-sky-500/40 bg-sky-500/10 px-4 py-4 text-sm font-bold text-sky-300 transition-all hover:bg-sky-500/20 flex flex-col items-center justify-center gap-1">
                    <span className="text-xl leading-none">🔗</span> 링크 공유
                  </button>
                  <button onClick={async () => { const target = document.getElementById("mbti-capture-area"); await captureAndShareElement(target, { fileName: "mbti-result.png" }); }} className="w-full rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-4 text-sm font-bold text-yellow-400 transition-all hover:bg-yellow-500/20 flex flex-col items-center justify-center gap-1">
                    <span className="text-xl leading-none">🖼️</span> 이미지 공유
                  </button>
                </div>
                <button onClick={resetTest} className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-4 text-sm font-medium text-white/80 hover:bg-white/10 transition-colors">
                  ↺ 다시 검사하기
                </button>
              </div>

              {/* 🚀 깔때기(Funnel) 전략: 운세 및 사주 탭으로 유도하는 황금 버튼 */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-center text-xs text-white/50 mb-3">내 성향에 딱 맞는 맞춤 운세가 궁금하다면?</p>
                <button onClick={() => { window.scrollTo(0,0); onNavigate('fortune'); }} className="w-full mb-3 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-600 px-4 py-4 text-base font-bold text-slate-900 shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:scale-[1.02] transition-transform animate-pulse">
                  ✨ 소름돋는 오늘의 맞춤 운세 보기
                </button>
                <button onClick={() => { window.scrollTo(0,0); onNavigate('saju'); }} className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-4 text-sm font-bold text-white shadow-lg hover:scale-[1.02] transition-transform">
                  🔍 내 타고난 관상 / 이름 풀이 보기
                </button>
              </div>

            </div>
          </div>
        )}

        <SeoAccordion title="MBTI와 사주의 연관성 ▾" items={[
          { q: "MBTI와 오행(五行)의 놀라운 연결", a: "MBTI의 E(외향)/I(내향)는 명리학의 양(陽)/음(陰)에, S(감각)는 토(土), N(직관)은 목(木)·화(火), T(사고)는 금(金), F(감정)는 화(火)·수(水)에 대응됩니다." },
          { q: "내 MBTI 유형과 맞는 사주 기운은?", a: "INTJ·INTP는 수(水)·금(金) 기운으로 깊은 분석력을, ENFP·ENFJ는 화(火)·목(木) 기운으로 열정과 창의성을, ISTJ·ESTJ는 금(金)·토(土) 기운으로 책임감과 원칙을 지닙니다." },
          { q: "MBTI × 사주 융합 분석의 장점", a: "MBTI로 현재 심리 경향을, 사주로 타고난 에너지와 운의 흐름을 이해하면 동서양 최고의 지혜로 자신을 입체적으로 파악할 수 있습니다." },
        ]} />

      </div>
      </div>
    </div>
  );
}

// 🚀 [소름돋는 궁합 컴포넌트 - 음/양력 추가 및 이름 기반 캐싱]
function MatchTab({ isVisible, onNavigate }: { isVisible: boolean, onNavigate: (id: TabId) => void }) {
  // 🚀 상태에 calendar(음양력) 추가
  const [myInfo, setMyInfo] = useState({ name: "", gender: "male", calendar: "solar", birthDate: "", birthTime: "unknown" });
  const [partnerInfo, setPartnerInfo] = useState({ name: "", gender: "female", calendar: "solar", birthDate: "", birthTime: "unknown" });
  const [relationshipType, setRelationshipType] = useState("lover");
  
  const [isLoading, setIsLoading] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  
  const handleDateInput = (val: string, setter: any) => {
    let clean = val.replace(/[^0-9]/g, '');
    if (clean.length > 6) clean = clean.slice(0,4) + '-' + clean.slice(4,6) + '-' + clean.slice(6,8);
    else if (clean.length > 4) clean = clean.slice(0,4) + '-' + clean.slice(4);
    setter(clean);
  };

  const handleMatchAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myInfo.name || !partnerInfo.name || !myInfo.birthDate || !partnerInfo.birthDate) {
      return alert("이름과 생년월일을 모두 입력해 주세요.");
    }

    supabase.rpc('increment_tab_click', { target_tab_id: 'match' }).then(({ error }) => { if(error) console.error('궁합 에러:', error) });
    setIsLoading(true);
    setResultData(null);

    // 🚀 A와 B의 위치를 바꿔서 입력해도 항상 똑같은 결과가 나오도록 정렬(Sort) 마법 적용
    const myKey = `${myInfo.name}_${myInfo.gender}_${myInfo.calendar}_${myInfo.birthDate}_${myInfo.birthTime}`;
    const partnerKey = `${partnerInfo.name}_${partnerInfo.gender}_${partnerInfo.calendar}_${partnerInfo.birthDate}_${partnerInfo.birthTime}`;
    
    const sortedKeys = [myKey, partnerKey].sort(); // 알파벳 순으로 정렬해버림 (위치 무관)
    const cacheKey = `match_${sortedKeys[0]}_${sortedKeys[1]}_${relationshipType}`;
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setResultData(JSON.parse(cached));
        setIsLoading(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ myInfo, partnerInfo, relationshipType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      if (typeof window !== "undefined") localStorage.setItem(cacheKey, JSON.stringify(data));
      setResultData(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "궁합 분석 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeLabel = (label: string) => {
    if (!label || label === "모름") return "모름";
    if (label.includes("(")) {
      const parts = label.split("(");
      if (parts.length > 1) {
        const timePart = parts[1].replace(")", "").trim();
        const namePart = parts[0].trim();
        return `${timePart} (${namePart})`;
      }
    }
    return label;
  };

  return (
    <div role="tabpanel" aria-hidden={!isVisible} className={isVisible ? "relative w-full" : "hidden"}>
      <div className="relative isolate min-h-[100svh] w-full">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-slate-900">
          <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: "url('/bg_match.png')" }} />
        </div>

      <div className="relative z-10 flex w-full flex-col items-center px-4 py-6">
        
        {!isLoading && !resultData && (
          <form onSubmit={handleMatchAnalyze} className="w-full max-w-md animate-fade-in-up">
            <div className="text-center mb-8">
              <span className="inline-block px-3 py-1 mb-3 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 text-xs font-bold tracking-widest">CHEMISTRY TEST</span>
              <h2 className="text-3xl font-extrabold text-white mb-2 drop-shadow-lg">소름돋는 궁합</h2>
              <p className="text-sm text-white/70">나와 그 사람의 타고난 기운은 얼마나 잘 맞을까?</p>
            </div>

            <div className="space-y-6">

              {/* 💑 관계 유형 선택 */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                <p className="text-xs text-white/50 mb-3 font-bold tracking-widest text-center">어떤 관계인가요?</p>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { value: "lover", label: "연인", emoji: "💑" },
                    { value: "couple", label: "부부", emoji: "💍" },
                    { value: "friend", label: "친구", emoji: "🤝" },
                    { value: "family", label: "가족", emoji: "👨‍👩‍👧" },
                    { value: "business", label: "비즈니스", emoji: "💼" },
                  ].map((rel) => (
                    <button
                      key={rel.value}
                      type="button"
                      onClick={() => setRelationshipType(rel.value)}
                      className={`flex flex-col items-center gap-1 rounded-xl py-2.5 px-1 text-xs font-bold transition-all ${
                        relationshipType === rel.value
                          ? "bg-rose-500/30 border border-rose-400/60 text-rose-300"
                          : "bg-white/5 border border-white/10 text-white/50 hover:text-white/80"
                      }`}
                    >
                      <span className="text-lg leading-none">{rel.emoji}</span>
                      <span>{rel.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 👤 나의 정보 */}
              <div className="rounded-3xl border border-rose-500/30 bg-slate-900/80 p-6 backdrop-blur-md shadow-lg">
                <h3 className="text-rose-400 font-bold mb-4 flex items-center gap-2"><span>👤</span> 나의 정보</h3>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <input type="text" placeholder="내 이름" value={myInfo.name} onChange={e=>setMyInfo({...myInfo, name: e.target.value})} className="flex-1 rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white focus:border-rose-400 focus:outline-none" />
                    <select value={myInfo.gender} onChange={e=>setMyInfo({...myInfo, gender: e.target.value})} className="w-24 rounded-xl bg-black/40 border border-white/10 px-2 py-3 text-white focus:border-rose-400 focus:outline-none">
                      <option value="male">남자</option><option value="female">여자</option>
                    </select>
                  </div>
                  
                  {/* 🚀 음/양력 및 생년월일 */}
                  <div className="flex gap-3">
                    <select value={myInfo.calendar} onChange={e=>setMyInfo({...myInfo, calendar: e.target.value})} className="w-24 rounded-xl bg-black/40 border border-white/10 px-2 py-3 text-white focus:border-rose-400 focus:outline-none text-sm">
                      <option value="solar">양력</option><option value="lunar">음력</option>
                    </select>
                    <input type="tel" maxLength={10} placeholder="생년월일 (예: 19900101)" value={myInfo.birthDate} onChange={e=>handleDateInput(e.target.value, (val:string)=>setMyInfo({...myInfo, birthDate: val}))} className="flex-1 rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white focus:border-rose-400 focus:outline-none" />
                  </div>

                  <select value={myInfo.birthTime} onChange={e=>setMyInfo({...myInfo, birthTime: e.target.value})} className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3 text-white focus:border-rose-400 focus:outline-none text-sm">
                    {BIRTH_TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{formatTimeLabel(o.label)}</option>)}
                  </select>
                </div>
              </div>

              {/* ❤️ 상대방 정보 */}
              <div className="rounded-3xl border border-orange-500/30 bg-slate-900/80 p-6 backdrop-blur-md shadow-lg">
                <h3 className="text-orange-400 font-bold mb-4 flex items-center gap-2"><span>❤️</span> 상대방 정보</h3>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <input type="text" placeholder="상대방 이름" value={partnerInfo.name} onChange={e=>setPartnerInfo({...partnerInfo, name: e.target.value})} className="flex-1 rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white focus:border-orange-400 focus:outline-none" />
                    <select value={partnerInfo.gender} onChange={e=>setPartnerInfo({...partnerInfo, gender: e.target.value})} className="w-24 rounded-xl bg-black/40 border border-white/10 px-2 py-3 text-white focus:border-orange-400 focus:outline-none">
                      <option value="female">여자</option><option value="male">남자</option>
                    </select>
                  </div>

                  {/* 🚀 음/양력 및 생년월일 */}
                  <div className="flex gap-3">
                    <select value={partnerInfo.calendar} onChange={e=>setPartnerInfo({...partnerInfo, calendar: e.target.value})} className="w-24 rounded-xl bg-black/40 border border-white/10 px-2 py-3 text-white focus:border-orange-400 focus:outline-none text-sm">
                      <option value="solar">양력</option><option value="lunar">음력</option>
                    </select>
                    <input type="tel" maxLength={10} placeholder="생년월일 (예: 19920505)" value={partnerInfo.birthDate} onChange={e=>handleDateInput(e.target.value, (val:string)=>setPartnerInfo({...partnerInfo, birthDate: val}))} className="flex-1 rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white focus:border-orange-400 focus:outline-none" />
                  </div>

                  <select value={partnerInfo.birthTime} onChange={e=>setPartnerInfo({...partnerInfo, birthTime: e.target.value})} className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3 text-white focus:border-orange-400 focus:outline-none text-sm">
                    {BIRTH_TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{formatTimeLabel(o.label)}</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 px-6 py-4 text-base font-bold text-white shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:scale-[1.02] transition-transform">
                ✨ 상세 궁합 분석하기
              </button>
            </div>
          </form>
        )}

        {isLoading && (
          <div className="mt-10 flex min-h-[220px] w-full max-w-md flex-col items-center justify-center gap-6">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-24 h-24 bg-rose-500/20 rounded-full animate-ping" />
              <Heart className="w-12 h-12 text-rose-500 animate-pulse drop-shadow-[0_0_15px_rgba(244,63,94,0.8)]" fill="currentColor" />
            </div>
            <div className="text-center">
              <p className="text-rose-300 font-bold tracking-wide">사주와 이름의 기운을 교차 분석 중입니다...</p>
              <p className="text-xs text-white/50 mt-2">사주 명식 대조 및 성명학 오행 보완성 계산</p>
            </div>
          </div>
        )}

        {resultData && !isLoading && (
          <div id="match-capture-area" className="w-full max-w-md animate-fade-in-up pb-6">
            <div className="rounded-3xl border border-rose-500/30 bg-slate-900/90 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
              
              <div className="text-center border-b border-white/10 pb-6 mb-6">
              <div className="flex justify-center items-center gap-4 mb-4">
                  <span className="text-lg font-bold text-rose-300">{myInfo.name}</span>
                  {relationshipType === "lover" ? (
                    <Heart className="w-5 h-5 text-rose-500 animate-pulse fill-current" />
                  ) : (
                    <span className="text-xl leading-none">
                      {{
                        couple: "💍",
                        friend: "🤝",
                        family: "👨‍👩‍👧",
                        business: "💼",
                      }[relationshipType] ?? "❤️"}
                    </span>
                  )}
                  <span className="text-lg font-bold text-orange-300">{partnerInfo.name}</span>
                </div>
                <div className="flex justify-center mb-2">
                  <span className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/60">
                    {{
                      lover: "💑 연인 궁합",
                      couple: "💍 부부 궁합",
                      friend: "🤝 친구 궁합",
                      family: "👨‍👩‍👧 가족 궁합",
                      business: "💼 비즈니스 궁합",
                    }[relationshipType] ?? "💑 연인 궁합"}
                  </span>
                </div>
                
                <div className="relative inline-flex items-center justify-center mb-2">
                  <svg className="w-28 h-28 transform -rotate-90">
                    <circle cx="56" cy="56" r="50" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
                    <circle cx="56" cy="56" r="50" stroke="url(#score-gradient)" strokeWidth="8" fill="none" strokeDasharray="314" strokeDashoffset={314 - (314 * resultData.score) / 100} className="transition-all duration-1500 ease-out" />
                    <defs>
                      <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f43f5e" />
                        <stop offset="100%" stopColor="#f97316" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="absolute text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-400">{resultData.score}점</span>
                </div>
                
                {/* 궁합 등급 배지 */}
                {resultData.grade && (
                  <div className="mt-3 mb-1">
                    <span className={`inline-block px-4 py-1 rounded-full text-sm font-extrabold border ${
                      resultData.grade === "천생연분"
                        ? "bg-rose-500/20 border-rose-400 text-rose-300"
                        : resultData.grade === "좋음"
                        ? "bg-orange-500/20 border-orange-400 text-orange-300"
                        : resultData.grade === "보통"
                        ? "bg-yellow-500/20 border-yellow-400 text-yellow-300"
                        : "bg-slate-500/20 border-slate-400 text-slate-300"
                    }`}>
                      {resultData.grade === "천생연분" ? "💑 천생연분" : resultData.grade === "좋음" ? "💛 좋음" : resultData.grade === "보통" ? "🤝 보통" : "⚠️ 주의"}
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-bold text-white mt-4">{resultData.title}</h3>
                <p className="text-sm text-white/70 mt-2">{resultData.summary}</p>
                {/* 오행 관계 */}
                {resultData.elementRelation && (
                  <p className="mt-2 text-xs text-rose-300/80 bg-rose-500/10 rounded-xl px-3 py-2 border border-rose-500/20">
                    🌿 {resultData.elementRelation}
                  </p>
                )}
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                  <h4 className="text-sm font-bold text-rose-400 mb-2">🔍 상세 궁합 풀이</h4>
                  <p className="text-sm text-white/85 leading-relaxed">{resultData.details}</p>
                </div>

                {/* 분야별 궁합 점수 바 */}
                {resultData.categoryScores && (
                  <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                    <h4 className="text-sm font-bold text-white/70 mb-3">📊 분야별 궁합</h4>
                    <div className="space-y-2">
                      {[
                        { label: "성격 조화", key: "personality", color: "bg-rose-400" },
                        { label: "가치관", key: "values", color: "bg-orange-400" },
                        { label: "금전 관념", key: "money", color: "bg-yellow-400" },
                        { label: "애정 표현", key: "love", color: "bg-pink-400" },
                        { label: "미래 비전", key: "future", color: "bg-purple-400" },
                      ].map(({ label, key, color }) => {
                        const score = resultData.categoryScores[key] ?? 0;
                        return (
                          <div key={key} className="flex items-center gap-3">
                            <span className="w-16 text-xs text-white/50 shrink-0">{label}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-white/10">
                              <div className={`h-1.5 rounded-full ${color} transition-all duration-700`} style={{ width: `${score}%` }} />
                            </div>
                            <span className="w-9 text-xs text-right text-white/70 font-mono">{score}점</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-900/20 rounded-xl p-3 border border-emerald-500/20">
                    <p className="text-[10px] font-bold text-emerald-400 mb-1">😍 가장 잘 맞는 점</p>
                    <p className="text-xs text-white/90 leading-snug">{resultData.goodPoint}</p>
                  </div>
                  <div className="bg-red-900/20 rounded-xl p-3 border border-red-500/20">
                    <p className="text-[10px] font-bold text-red-400 mb-1">⚠️ 주의해야 할 점</p>
                    <p className="text-xs text-white/90 leading-snug">{resultData.badPoint}</p>
                  </div>
                </div>

                <div className="bg-orange-900/20 rounded-xl p-4 border border-orange-500/20">
                  <p className="text-[11px] font-bold text-orange-400 mb-1">💡 관계 발전을 위한 조언</p>
                  <p className="text-sm text-white/90">{resultData.actionGuide}</p>
                </div>

                {/* 좋은 날 / 조심할 날 */}
                {(resultData.luckyDay || resultData.carefulDay) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-900/20 rounded-xl p-3 border border-emerald-500/20">
                      <p className="text-[10px] font-bold text-emerald-400 mb-1">📅 함께하면 좋은 날</p>
                      <p className="text-xs text-white/80 leading-snug">{resultData.luckyDay}</p>
                    </div>
                    <div className="bg-red-900/20 rounded-xl p-3 border border-red-500/20">
                      <p className="text-[10px] font-bold text-red-400 mb-1">⚡ 조심할 날</p>
                      <p className="text-xs text-white/80 leading-snug">{resultData.carefulDay}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                <button onClick={() => {
                    const shareData = { title: "소름돋는 궁합 분석", text: "우리의 궁합 점수는 몇 점일까? 확인해보세요!", url: window.location.href };
                    if (navigator.share) { navigator.share(shareData).catch(() => {}); } 
                    else { navigator.clipboard.writeText(window.location.href); alert("링크가 복사되었습니다."); }
                  }} className="w-full rounded-2xl border border-sky-500/40 bg-sky-500/10 px-4 py-4 text-sm font-bold text-sky-300 transition-all hover:bg-sky-500/20 flex flex-col items-center justify-center gap-1">
                    <span className="text-xl leading-none">🔗</span> 링크 공유
                  </button>
                  <button onClick={async () => { const target = document.getElementById("match-capture-area"); await captureAndShareElement(target, { fileName: "match-result.png" }); }} className="w-full rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-4 text-sm font-bold text-yellow-400 transition-all hover:bg-yellow-500/20 flex flex-col items-center justify-center gap-1">
                    <span className="text-xl leading-none">🖼️</span> 이미지 공유
                  </button>
                </div>
                <button onClick={() => setResultData(null)} className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-4 text-sm font-medium text-white/80 hover:bg-white/10 transition-colors">
                  ↺ 다른 사람과 궁합 보기
                </button>
              </div>

              {/* 🚀 유도 깔때기: 기적의 제단으로 자연스럽게 연결 */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-center text-xs text-white/50 mb-3">우리 관계의 긍정적인 에너지를 모으고 싶다면?</p>
                <button onClick={() => { window.scrollTo(0,0); onNavigate('altar'); }} className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 px-4 py-4 text-sm font-bold text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:scale-[1.02] transition-transform">
                  🙏 기적의 제단에 소원 빌러 가기
                </button>
                </div>

</div>
</div>
)}

<SeoAccordion title="궁합(宮合)이란 무엇인가요? ▾" items={[
{ q: "궁합의 원리", a: "궁합은 두 사람의 사주팔자를 대조하여 음양오행의 조화와 상생·상극 관계를 분석하는 것입니다. 단순한 미신이 아니라 두 사람의 에너지 특성을 이해하여 더 행복한 관계를 만들기 위한 지혜입니다." },
{ q: "삼합(三合) — 가장 잘 맞는 띠 조합", a: "인·오·술(화火), 신·자·진(수水), 해·묘·미(목木), 사·유·축(금金)의 삼합 관계가 궁합이 잘 맞는 대표적인 조합입니다." },
{ q: "나쁜 궁합도 극복할 수 있나요?", a: "궁합이 좋지 않아도 두 사람의 노력과 이해가 더 중요합니다. 궁합은 관계의 특성을 미리 파악하여 지혜롭게 관계를 가꾸는 참고 도구로 활용하는 것이 올바른 접근입니다." },
]} />

</div>
</div>
</div>
);
}

// ===== 손금 분석 탭 =====
function PalmistryTab({ isVisible }: { isVisible: boolean }) {
  const [hand, setHand] = useState<"left" | "right">("right");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [freeResult, setFreeResult] = useState<any>(null);
  const [premiumResult, setPremiumResult] = useState<any>(null);
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumPeriod, setPremiumPeriod] = useState<"24h" | "10d">("24h");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isVisible) {
      supabase.rpc('increment_tab_click', { target_tab_id: 'palmistry' }).then(({ error }) => { if(error) console.error('손금 에러:', error) });
      // 마스터 어드민 체크
      if (typeof window !== "undefined" && localStorage.getItem("MASTER_ADMIN") === "true") {
        setIsPremiumUnlocked(true);
      }
    }
  }, [isVisible]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("이미지 크기는 5MB 이하여야 합니다.");
      return;
    }
    setImageFile(file);
    setFreeResult(null);
    setPremiumResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageFile) {
      alert("손바닥 사진을 먼저 업로드해주세요.");
      return;
    }
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("hand", hand);
      formData.append("isPremium", "false");

      const res = await fetch("/api/palmistry", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      setFreeResult(data.result);
    } catch {
      alert("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePremiumAnalyze = async () => {
    if (!imageFile) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("hand", hand);
      formData.append("isPremium", "true");

      const res = await fetch("/api/palmistry", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      setPremiumResult(data.result);
      setShowPremiumModal(false);
    } catch {
      alert("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const GRADE_COLOR: Record<string, string> = {
    "A+": "text-yellow-400", "A": "text-emerald-400",
    "B+": "text-blue-400",   "B": "text-white/80", "C": "text-white/50",
  };

  const PALM_LINES = [
    { key: "lifeLine",  label: "💚 생명선", desc: "건강·체력·생명력" },
    { key: "heartLine", label: "❤️ 감정선", desc: "감정·연애·인간관계" },
    { key: "headLine",  label: "💙 두뇌선", desc: "지성·사고력·창의성" },
    { key: "fateLine",  label: "🌟 운명선", desc: "직업·성공·운명" },
  ];

  const PREMIUM_SECTIONS = [
    { key: "wealth",  title: "💰 재물운",      icon: "💰" },
    { key: "love",    title: "💕 결혼·연애운",  icon: "💕" },
    { key: "health",  title: "💊 건강·수명운",  icon: "💊" },
    { key: "career",  title: "🏆 직업·성공운",  icon: "🏆" },
    { key: "summary", title: "✨ 종합 운명 리포트", icon: "✨" },
  ];

  return (
    <div
      className={`w-full min-h-screen relative ${isVisible ? "block" : "hidden"}`}
      style={{
        backgroundImage: "url('/images/bg-palmistry.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="absolute inset-0 bg-black/65 pointer-events-none" />

      {/* 헤더 */}
      <div className="relative z-10 pt-8 pb-4 text-center">
        <h2 className="text-2xl font-bold text-yellow-400 mb-1">✋ 손금 분석</h2>
        <p className="text-xs text-white/70">손바닥 사진을 업로드하면 AI가 손금을 분석합니다</p>
      </div>

      <div className="relative z-10 mx-auto max-w-md px-4 pb-8 space-y-5">

        {!freeResult ? (
          <>
            {/* 손 선택 */}
            <div className="flex gap-3">
              {(["right", "left"] as const).map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHand(h)}
                  className={`flex-1 rounded-2xl border py-3 text-sm font-bold transition-all ${
                    hand === h
                      ? "border-yellow-400/70 bg-yellow-400/15 text-yellow-400"
                      : "border-white/10 bg-white/5 text-white/60 hover:border-yellow-400/30"
                  }`}
                >
                  {h === "right" ? "🖐️ 오른손" : "🤚 왼손"}
                </button>
              ))}
            </div>

            {/* 이미지 업로드 */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-2xl border-2 border-dashed border-white/20 bg-white/5 p-6 text-center hover:border-yellow-400/40 transition-all"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="손금 미리보기" className="mx-auto max-h-48 rounded-xl object-contain" />
              ) : (
                <>
                  <p className="text-4xl mb-3">🖐️</p>
                  <p className="text-sm font-bold text-white/80 mb-1">손바닥 사진 업로드</p>
                  <p className="text-xs text-white/45">손가락이 펼쳐진 손바닥 사진 · 최대 5MB</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />

            {/* 촬영 팁 + 참고 이미지 */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
              <p className="text-xs font-bold text-yellow-400/90">📸 잘 나오는 촬영 방법</p>

              {/* 올바른 예시 이미지 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl overflow-hidden border border-emerald-500/30">
                  <div className="bg-emerald-500/10 py-1 text-center">
                    <span className="text-[10px] font-bold text-emerald-400">✅ 좋은 예시</span>
                  </div>
                  <div className="bg-white/5 h-28 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-4xl">🖐️</p>
                      <p className="text-[10px] text-white/50 mt-1">손바닥 전체 노출<br/>밝은 단색 배경</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl overflow-hidden border border-red-500/30">
                  <div className="bg-red-500/10 py-1 text-center">
                    <span className="text-[10px] font-bold text-red-400">❌ 나쁜 예시</span>
                  </div>
                  <div className="bg-white/5 h-28 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-4xl">✊</p>
                      <p className="text-[10px] text-white/50 mt-1">손이 잘림·어두움<br/>손금 미노출</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] text-white/55">• <span className="text-white/80 font-medium">손목~손가락 끝</span> 전체가 사진에 담겨야 합니다</p>
                <p className="text-[11px] text-white/55">• <span className="text-white/80 font-medium">밝은 자연광</span> 또는 형광등 아래에서 촬영하세요</p>
                <p className="text-[11px] text-white/55">• <span className="text-white/80 font-medium">흰 종이나 밝은 배경</span> 위에 손을 올리면 더 정확합니다</p>
                <p className="text-[11px] text-white/55">• 오른손: 현재·미래 운세 / 왼손: 타고난 운명</p>
              </div>
            </div>

            {/* 분석 버튼 */}
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!imageFile || isLoading}
              className="w-full rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-600 py-4 text-base font-bold text-slate-900 shadow-lg transition-all hover:from-yellow-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? "🔮 손금 분석 중..." : "✋ 손금 무료 분석하기"}
            </button>
          </>
        ) : (
          <>
            {/* 무료 결과 */}
            <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-5">
              <div className="flex items-center gap-4 mb-4">
                {imagePreview && (
                  <img src={imagePreview} alt="손금" className="h-16 w-16 rounded-xl object-cover shrink-0" />
                )}
                <div>
                  <p className="text-xs text-white/50 mb-1">{hand === "right" ? "오른손" : "왼손"} 분석 결과</p>
                  <p className="text-sm text-white/80">{freeResult.handType}</p>
                </div>
              </div>

              {/* 등급 */}
              <div className="text-center py-3 mb-4 rounded-xl border border-white/10 bg-white/5">
                <p className="text-xs text-white/50 mb-1">손금 종합 등급</p>
                <p className={`text-4xl font-bold ${GRADE_COLOR[freeResult.overallGrade] ?? "text-white"}`}>
                  {freeResult.overallGrade}
                </p>
                <p className="text-xs text-white/60 mt-1">{freeResult.gradeDesc}</p>
              </div>

              {/* 성격 요약 */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 mb-4">
                <p className="text-xs font-bold text-yellow-400/80 mb-1">✨ 손금으로 본 성격</p>
                <p className="text-sm text-white/80">{freeResult.personality}</p>
              </div>

              {/* 4대 손금선 */}
              <div className="space-y-3">
                {PALM_LINES.map((line) => (
                  freeResult[line.key] && (
                    <div key={line.key} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-xs font-bold text-white/70 mb-1">
                        {line.label}
                        <span className="ml-1 text-white/35 font-normal">— {line.desc}</span>
                      </p>
                      <p className="text-sm text-white/75">{freeResult[line.key]}</p>
                    </div>
                  )
                ))}
              </div>
            </div>

            {/* 프리미엄 결과 */}
            {premiumResult ? (
              <div className="space-y-3">
                <p className="text-center text-sm font-bold text-yellow-400">✨ 심층 손금 분석 리포트</p>
                {PREMIUM_SECTIONS.map((section) => (
                  premiumResult[section.key] && (
                    <div key={section.key} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <p className="text-sm font-bold text-yellow-400 mb-2">{section.title}</p>
                      <p className="text-sm leading-relaxed text-white/80">{premiumResult[section.key]}</p>
                    </div>
                  )
                ))}
              </div>
            ) : (
              /* 프리미엄 유도 버튼 */
              <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-5 text-center">
                <p className="text-sm font-bold text-yellow-400 mb-2">🔮 심층 손금 분석 리포트</p>
                <p className="text-xs text-white/55 mb-4">
                  재물운 · 결혼운 · 건강운 · 직업운 · 종합 운명 리포트를<br />AI로 상세하게 분석해드립니다
                </p>
                <button
                  type="button"
                  onClick={() => isPremiumUnlocked ? handlePremiumAnalyze() : setShowPremiumModal(true)}
                  disabled={isLoading}
                  className="w-full rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 py-3.5 text-sm font-bold text-slate-900 shadow-lg transition-all hover:from-yellow-400 hover:to-amber-500 disabled:opacity-40"
                >
                  {isLoading ? "🔮 분석 중..." : "✨ 상세 손금 분석 보기 (4,900원)"}
                </button>
              </div>
            )}

            {/* 다시 하기 */}
            <button
              type="button"
              onClick={() => { setFreeResult(null); setPremiumResult(null); setImageFile(null); setImagePreview(null); }}
              className="w-full rounded-2xl border border-white/20 bg-white/5 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
            >
              다른 손 분석하기
            </button>

            {/* SEO 아코디언 */}
            <SeoAccordion title="손금(手相)이란 무엇인가요? ▾" items={[
              { q: "손금학(手相學)의 원리", a: "손금은 손바닥의 선과 구릉의 형태를 분석하여 그 사람의 성격, 건강, 운명을 파악하는 동서양 공통의 전통 학문입니다. 생명선·감정선·두뇌선·운명선의 4대 주요선을 중심으로 분석합니다." },
              { q: "오른손과 왼손의 차이", a: "동양 손금학에서는 오른손이 현재와 미래의 운명을, 왼손이 타고난 선천적 운명을 나타낸다고 봅니다. 두 손을 함께 비교하면 더 정확한 분석이 가능합니다." },
              { q: "손금은 변하나요?", a: "손금은 나이와 생활 습관, 마음 상태에 따라 서서히 변합니다. 긍정적인 생각과 건강한 생활이 손금을 좋게 바꿀 수 있다고 봅니다." },
            ]} />
          </>
        )}

      </div>

      {/* 프리미엄 결제 모달 */}
      {showPremiumModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setShowPremiumModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-yellow-500/30 bg-slate-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-center text-lg font-bold text-yellow-400">✋ 심층 손금 분석</h3>
            <p className="mb-5 text-center text-sm text-white/60">재물·결혼·건강·직업·종합 운명 리포트</p>

            <div className="flex flex-col gap-2 mb-5">
              {([["24h", "24시간 이용권", "4,900원"], ["10d", "10일 이용권", "6,900원"]] as const).map(([val, label, price]) => (
                <label key={val} className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all ${premiumPeriod === val ? "border-yellow-400/60 bg-yellow-400/10" : "border-white/10 bg-white/5"}`}>
                  <input type="radio" checked={premiumPeriod === val} onChange={() => setPremiumPeriod(val)} className="accent-yellow-400" />
                  <span className="text-sm text-white/80">{label}</span>
                  <span className="ml-auto text-sm font-bold text-yellow-400">{price}</span>
                </label>
              ))}
            </div>

            <button
              type="button"
              onClick={handlePremiumAnalyze}
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 py-3.5 font-bold text-slate-900 transition-all hover:from-yellow-400 disabled:opacity-40"
            >
              {isLoading ? "분석 중..." : "결제하고 분석받기"}
            </button>
            <button type="button" onClick={() => setShowPremiumModal(false)} className="mt-3 w-full rounded-xl border border-white/20 bg-white/5 py-3 text-sm text-white/70">
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== 띠별 운세 탭 =====
// 현재 연도 기준으로 띠 해당 연도 자동 생성
function getZodiacYears(baseYear: number): string {
  const years: number[] = [];
  let y = baseYear;
  while (y <= new Date().getFullYear() + 12) {
    if (y >= 1924) years.push(y);
    y += 12;
  }
  return years.join("·");
}

const ZODIAC_LIST = [
  { id: "rat",     label: "쥐띠",     baseYear: 1924, img: "/images/zodiac-rat.png",
    lucky: "흰색·검정색", direction: "북쪽",
    general: "쥐띠는 영리하고 순발력이 뛰어난 기운을 지닙니다. 수(水)의 기운을 타고나 지혜롭고 상황 적응력이 뛰어나며, 대인관계에서 센스 있는 처세를 발휘합니다.",
    wealth: "재물운은 꾸준한 저축과 작은 기회를 놓치지 않는 데서 빛을 발합니다. 큰 한 방보다 안정적인 복리형 재테크가 맞습니다.",
    love: "연애운은 섬세한 감성이 매력으로 작용합니다. 다만 지나친 계산이 관계를 어색하게 만들 수 있으니 솔직한 표현이 중요합니다.",
    career: "직업운은 분석과 기획 분야에서 탁월한 역량을 발휘합니다. IT, 금융, 전략 기획 분야와 잘 맞습니다.",
    caution: "지나친 걱정과 소심함이 기회를 놓치게 만들 수 있습니다. 결정을 미루지 말고 과감히 실행에 옮기세요." },
  { id: "ox",      label: "소띠",    baseYear: 1925, img: "/images/zodiac-ox.png",
    lucky: "노란색·갈색", direction: "중앙",
    general: "소띠는 성실하고 인내심이 강한 토(土)의 기운을 지닙니다. 묵묵히 자신의 길을 걸으며 신뢰를 쌓는 타입으로, 주변으로부터 든든한 기둥 같은 존재로 여겨집니다.",
    wealth: "재물운은 근면성실함에서 나옵니다. 한 번에 크게 벌기보다 꾸준한 노력이 장기적으로 큰 자산을 만들어줍니다.",
    love: "연애운은 느리지만 깊은 관계를 형성합니다. 처음에는 표현이 서툴지만 한 번 마음을 열면 진심으로 상대를 지키는 타입입니다.",
    career: "직업운은 전문성이 요구되는 분야에서 빛납니다. 농업, 건설, 제조, 의료 등 실물 기반 직종과 잘 맞습니다.",
    caution: "고집스러운 면이 팀워크를 방해할 수 있습니다. 타인의 의견에 유연하게 열린 자세를 유지하세요." },
  { id: "tiger",   label: "호랑이띠", baseYear: 1926, img: "/images/zodiac-tiger.png",
    lucky: "빨간색·주황색", direction: "동쪽",
    general: "호랑이띠는 목(木)과 화(火)의 기운을 동시에 지닌 카리스마 넘치는 존재입니다. 강한 정의감과 리더십으로 주변을 이끌며 도전을 즐기는 성격입니다.",
    wealth: "재물운은 과감한 투자와 도전에서 빛을 발합니다. 다만 충동적인 결정은 손실로 이어질 수 있으니 신중함이 필요합니다.",
    love: "연애운은 열정적이고 강렬합니다. 상대를 강하게 끌어당기는 매력이 있지만, 지배적인 성향을 조심해야 합니다.",
    career: "직업운은 리더십이 필요한 분야에서 탁월합니다. 정치, 군인, 스포츠, 창업가 등 도전적인 분야와 잘 맞습니다.",
    caution: "충동적인 결정과 과도한 자신감이 화를 부를 수 있습니다. 실행 전 한 번 더 점검하는 습관을 들이세요." },
  { id: "rabbit",  label: "토끼띠",  baseYear: 1927, img: "/images/zodiac-rabbit.png",
    lucky: "초록색·청색", direction: "동쪽",
    general: "토끼띠는 목(木)의 부드러운 기운을 지닌 온화하고 감성적인 존재입니다. 세심하고 예술적 감각이 뛰어나며 주변을 편안하게 만드는 능력이 있습니다.",
    wealth: "재물운은 안정적인 방향을 선호합니다. 위험 자산보다 부동산이나 안정형 금융 상품이 잘 맞습니다.",
    love: "연애운은 섬세하고 낭만적입니다. 감수성이 풍부해 좋은 파트너가 되지만 상처를 잘 받으니 소통이 중요합니다.",
    career: "직업운은 예술, 디자인, 교육, 상담 분야에서 빛납니다. 사람을 돕고 아름다움을 만드는 일에서 보람을 느낍니다.",
    caution: "우유부단함과 회피 성향이 기회를 놓치게 만들 수 있습니다. 결단력을 기르는 것이 중요합니다." },
  { id: "dragon",  label: "용띠",    baseYear: 1928, img: "/images/zodiac-dragon.png",
    lucky: "금색·노란색", direction: "남동쪽",
    general: "용띠는 12띠 중 가장 강력한 기운을 지닌 존재입니다. 토(土)와 화(火)의 기운이 결합되어 카리스마와 창의성, 추진력이 넘칩니다.",
    wealth: "재물운은 대담한 투자와 사업 확장에서 빛납니다. 큰 그림을 그리고 실행하는 능력이 재물을 끌어모읍니다.",
    love: "연애운은 압도적인 매력으로 상대를 사로잡습니다. 다만 자기중심적 성향을 조절해야 장기적인 관계가 유지됩니다.",
    career: "직업운은 리더, 기업가, 예술가, 정치가 등 무대가 큰 분야에서 최고의 역량을 발휘합니다.",
    caution: "완벽주의와 고집으로 인한 갈등을 주의하세요. 때로는 양보와 협력이 더 큰 성과를 만듭니다." },
  { id: "snake",   label: "뱀띠",    baseYear: 1929, img: "/images/zodiac-snake.png",
    lucky: "빨간색·금색", direction: "남쪽",
    general: "뱀띠는 화(火)의 음적 기운을 지닌 신비롭고 지혜로운 존재입니다. 깊은 통찰력과 직관력으로 남들이 보지 못하는 것을 꿰뚫어 봅니다.",
    wealth: "재물운은 정보력과 직관에서 나옵니다. 투자 시 철저한 분석 후 결정하면 큰 이익을 얻을 수 있습니다.",
    love: "연애운은 신비롭고 매혹적인 매력이 상대를 끌어당깁니다. 질투심이 강한 면이 있어 신뢰 관계 형성이 중요합니다.",
    career: "직업운은 연구, 철학, 의학, 심리학, 법률 등 깊이 있는 전문성이 요구되는 분야와 잘 맞습니다.",
    caution: "의심과 집착이 관계를 망칠 수 있습니다. 신뢰를 바탕으로 한 열린 소통을 실천하세요." },
  { id: "horse",   label: "말띠",    baseYear: 1930, img: "/images/zodiac-horse.png",
    lucky: "빨간색·주황색", direction: "남쪽",
    general: "말띠는 화(火)의 기운이 강렬하게 발현된 자유롭고 활동적인 존재입니다. 열정과 에너지가 넘치며 변화와 모험을 즐깁니다.",
    wealth: "재물운은 활발한 사회 활동과 네트워킹에서 나옵니다. 영업, 유통, 서비스업에서 뛰어난 수완을 발휘합니다.",
    love: "연애운은 열정적이고 로맨틱합니다. 다만 자유를 중시하는 성향으로 헌신적인 관계에 부담을 느낄 수 있습니다.",
    career: "직업운은 스포츠, 여행, 엔터테인먼트, 영업 등 활동적인 분야에서 최고의 역량을 발휘합니다.",
    caution: "성급함과 끈기 부족이 약점입니다. 한 가지에 집중하는 능력을 키우면 더 큰 성과를 이룰 수 있습니다." },
  { id: "goat",    label: "양띠",    baseYear: 1931, img: "/images/zodiac-goat.png",
    lucky: "초록색·흰색", direction: "남서쪽",
    general: "양띠는 토(土)와 목(木)의 기운이 조화된 온화하고 예술적인 존재입니다. 감성이 풍부하고 창의적이며 평화로운 환경을 추구합니다.",
    wealth: "재물운은 창작 활동과 예술적 재능에서 나옵니다. 안정적인 수입보다 자신이 좋아하는 일에서 가치를 찾을 때 재물도 따라옵니다.",
    love: "연애운은 다정하고 헌신적입니다. 상대를 깊이 배려하지만 우유부단함이 관계 진전을 늦출 수 있습니다.",
    career: "직업운은 예술, 음악, 디자인, 요식업, 꽃집 등 감성과 미적 감각이 필요한 분야와 잘 맞습니다.",
    caution: "의존성과 우유부단함이 발목을 잡을 수 있습니다. 스스로 결정하는 힘을 기르는 것이 중요합니다." },
  { id: "monkey",  label: "원숭이띠", baseYear: 1932, img: "/images/zodiac-monkey.png",
    lucky: "흰색·금색", direction: "서쪽",
    general: "원숭이띠는 금(金)의 날카로운 기운과 뛰어난 두뇌가 결합된 영리하고 재치 있는 존재입니다. 다재다능하고 응용력이 탁월합니다.",
    wealth: "재물운은 뛰어난 두뇌와 응용력에서 나옵니다. 부업이나 다중 수입원을 만드는 데 탁월한 능력을 발휘합니다.",
    love: "연애운은 유머와 재치로 상대를 사로잡습니다. 다만 변덕스러운 성향이 상대에게 불안감을 줄 수 있습니다.",
    career: "직업운은 IT, 연구개발, 언론, 교육 등 두뇌를 활용하는 분야에서 빛납니다.",
    caution: "자만심과 변덕이 신뢰를 잃게 만들 수 있습니다. 한 우물을 깊이 파는 집중력을 키우세요." },
  { id: "rooster", label: "닭띠",    baseYear: 1933, img: "/images/zodiac-rooster.png",
    lucky: "금색·노란색", direction: "서쪽",
    general: "닭띠는 금(金)의 기운이 강하게 발현된 분석적이고 완벽주의적인 존재입니다. 꼼꼼하고 원칙적이며 정직함을 중요하게 여깁니다.",
    wealth: "재물운은 철저한 계획과 분석에서 나옵니다. 가계부 관리와 체계적인 저축으로 안정적인 자산을 구축합니다.",
    love: "연애운은 솔직하고 직접적인 표현이 특징입니다. 완벽을 추구하는 성향이 상대에게 부담을 줄 수 있으니 여유가 필요합니다.",
    career: "직업운은 회계, 의료, 법률, 군인 등 정확성과 원칙이 요구되는 분야에서 최고의 역량을 발휘합니다.",
    caution: "지나친 완벽주의와 비판적 성향이 대인관계를 어렵게 만들 수 있습니다. 타인의 단점보다 장점을 보는 연습이 필요합니다." },
  { id: "dog",     label: "개띠",    baseYear: 1934, img: "/images/zodiac-dog.png",
    lucky: "갈색·빨간색", direction: "북서쪽",
    general: "개띠는 토(土)와 금(金)의 기운이 결합된 충직하고 의리 있는 존재입니다. 정의감이 강하고 신뢰할 수 있는 친구이자 동반자입니다.",
    wealth: "재물운은 꾸준한 성실함에서 나옵니다. 갑작스러운 횡재보다 안정적인 직장과 꾸준한 저축이 장기적으로 큰 자산을 만듭니다.",
    love: "연애운은 헌신적이고 변함없는 사랑이 특징입니다. 한 번 마음을 주면 끝까지 지키는 타입으로 신뢰받는 파트너입니다.",
    career: "직업운은 사회복지, 의료, 법률, 경찰 등 정의와 봉사가 필요한 분야에서 큰 보람을 느낍니다.",
    caution: "지나친 걱정과 비관적 사고가 에너지를 소진시킵니다. 긍정적인 시각을 유지하는 노력이 필요합니다." },
  { id: "pig",     label: "돼지띠",  baseYear: 1935, img: "/images/zodiac-pig.png",
    lucky: "노란색·금색", direction: "북쪽",
    general: "돼지띠는 수(水)의 풍요로운 기운을 지닌 복덩이 존재입니다. 낙천적이고 솔직하며 물질적 풍요와 즐거움을 사랑합니다.",
    wealth: "재물운은 12띠 중 손꼽히는 복재(福財)를 지닙니다. 돈이 자연스럽게 모이는 기운이 있으며 투자 운도 좋습니다.",
    love: "연애운은 순수하고 헌신적입니다. 상대에게 아낌없이 베푸는 사랑을 하지만 때로는 너무 순해서 이용당할 수 있습니다.",
    career: "직업운은 요식업, 유통, 부동산, 엔터테인먼트 등 사람과 풍요가 연결된 분야에서 두각을 나타냅니다.",
    caution: "지나친 낙천주의와 게으름이 기회를 놓치게 만듭니다. 구체적인 목표와 계획을 세우는 습관이 필요합니다." },
];

function ZodiacTab({ isVisible }: { isVisible: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"general" | "wealth" | "love" | "career" | "caution">("general");

  useEffect(() => {
    if (isVisible) {
      supabase.rpc('increment_tab_click', { target_tab_id: 'zodiac' }).then(({ error }) => { if(error) console.error('띠별 에러:', error) });
    }
  }, [isVisible]);

  const selectedZodiac = ZODIAC_LIST.find(z => z.id === selected);

  const SECTIONS = [
    { id: "general" as const, label: "총운" },
    { id: "wealth"  as const, label: "재물운" },
    { id: "love"    as const, label: "연애운" },
    { id: "career"  as const, label: "직업운" },
    { id: "caution" as const, label: "주의사항" },
  ];

  return (
    <div
      className={`w-full min-h-screen relative ${isVisible ? "block" : "hidden"}`}
      style={{
        backgroundImage: "url('/images/bg-zodiac.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* 어두운 오버레이 */}
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />

      {/* 헤더 */}
      <div className="relative z-10 pt-8 pb-4 text-center">
        <h2 className="text-2xl font-bold text-yellow-400 mb-1">띠별 운세</h2>
        <p className="text-xs text-white/70">나의 띠를 선택하여 운세를 확인하세요</p>
      </div>

      <div className="relative z-10 mx-auto max-w-md px-4 pb-8 space-y-6">

        {/* 띠 선택 그리드 */}
        <div className="grid grid-cols-4 gap-2">
          {ZODIAC_LIST.map((z) => (
            <button
              key={z.id}
              type="button"
              onClick={() => { setSelected(z.id); setActiveSection("general"); }}
              className={`flex flex-col items-center gap-1 rounded-2xl border p-2 transition-all ${
                selected === z.id
                  ? "border-yellow-400/70 bg-yellow-400/15 scale-105"
                  : "border-white/10 bg-white/5 hover:border-yellow-400/30"
              }`}
            >
              <div className="relative h-16 w-16 overflow-hidden rounded-xl">
                <Image src={z.img} alt={z.label} fill className="object-cover" />
              </div>
              <span className="text-xs font-bold text-white/90">{z.label}</span>
            </button>
          ))}
        </div>

        {/* 선택된 띠 결과 */}
        {selectedZodiac && (
          <div className="space-y-4">

            {/* 띠 기본 정보 */}
            <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-5">
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-yellow-400/20">
                  <Image src={selectedZodiac.img} alt={selectedZodiac.label} fill className="object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-yellow-400 mb-1">{selectedZodiac.label}</h3>
                  <p className="text-[11px] text-white/45 mb-2">{getZodiacYears(selectedZodiac.baseYear)}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
                      🎨 {selectedZodiac.lucky}
                    </span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
                      🧭 {selectedZodiac.direction}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 운세 섹션 탭 */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  className={`shrink-0 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                    activeSection === s.id
                      ? "bg-yellow-400 text-slate-900"
                      : "bg-white/10 text-white/60 hover:bg-white/15"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* 운세 내용 */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h4 className="mb-3 text-sm font-bold text-yellow-400">
                {selectedZodiac.label} — {SECTIONS.find(s => s.id === activeSection)?.label}
              </h4>
              <p className="text-sm leading-relaxed text-white/80">
                {selectedZodiac[activeSection]}
              </p>
            </div>

            {/* 공유 버튼 */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={async () => {
                  const shareText = `🐉 ${selectedZodiac.label} 운세\n\n${selectedZodiac[activeSection]}\n\n✨ 명운(命運)에서 나의 띠별 운세 확인하기\n${window.location.origin}/tools?tab=zodiac`;
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: `${selectedZodiac.label} 운세 — 명운(命運)`,
                        text: shareText,
                      });
                    } catch {
                      navigator.clipboard.writeText(shareText).then(() => alert("클립보드에 복사됐습니다!"));
                    }
                  } else {
                    navigator.clipboard.writeText(shareText).then(() => alert("클립보드에 복사됐습니다!"));
                  }
                }}
                className="rounded-2xl border border-sky-500/40 bg-sky-500/10 py-3 text-sm font-bold text-sky-300 transition-all hover:bg-sky-500/20"
              >
                🔗 링크 공유
              </button>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-2xl border border-white/20 bg-white/5 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
              >
                다른 띠 선택하기
              </button>
            </div>

          </div>
        )}

        {/* SEO 아코디언 */}
        <SeoAccordion title="띠별 운세란 무엇인가요? ▾" items={[
          { q: "12띠(地支)와 운세의 원리", a: "12띠는 명리학의 12지지(地支)에서 비롯된 개념으로, 각 동물이 상징하는 오행의 기운이 타고난 성격과 운명에 영향을 미친다고 봅니다. 쥐·소·호랑이 등 12가지 동물은 단순한 상징이 아니라, 우주의 기운이 12년 주기로 순환하는 원리를 담고 있습니다." },
          { q: "삼합(三合)과 띠 궁합의 원리", a: "인·오·술(화火), 신·자·진(수水), 해·묘·미(목木), 사·유·축(금金)의 삼합 관계는 서로 기운을 도와주는 가장 좋은 조합입니다. 반대로 자·오, 축·미 등의 충(沖) 관계는 서로 기운이 충돌하여 갈등이 생길 수 있습니다." },
          { q: "띠별 운세를 삶에 활용하는 방법", a: "띠별 운세는 타고난 기운의 특성을 이해하고 강점을 극대화하는 데 활용합니다. 내 띠의 부족한 오행을 보완하는 색깔, 방향, 음식을 일상에 적용하면 긍정적인 에너지 흐름을 만들 수 있습니다." },
        ]} />

      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const pathname = usePathname() || "/tools";
  const [activeTab, setActiveTab] = useState<TabId>("fortune");
  // 🚀 메뉴 스크롤 제어를 위한 Ref 추가
  const navRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

    // 🚀 [버그수정] 탭이 바뀔 때마다 메뉴가 부드럽게 자동 중앙 정렬되도록 마법 추가
  useEffect(() => {
    const container = navRef.current;
    if (!container) return;
    const target = container.querySelector(`button[data-tab-id="${activeTab}"]`) as HTMLElement;
    if (target) {
      const containerWidth = container.offsetWidth;
      const targetOffsetLeft = target.offsetLeft;
      const targetWidth = target.offsetWidth;
      container.scrollTo({
        left: targetOffsetLeft - (containerWidth / 2) + (targetWidth / 2),
        behavior: "smooth",
      });
    }
  }, [activeTab]);

  // 🚀 방문자 수 측정 로직 (중복 방지는 로컬 스토리지만 사용)
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const trackVisitor = async () => {
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
      
      // 오늘 방문한 적이 없을 때만 실행
      if (localStorage.getItem("visited_today") !== today) {
        const { error } = await supabase.rpc("increment_visitor");
        
        if (!error) {
          // 성공했을 때만 도장 찍기
          localStorage.setItem("visited_today", today);
        } else {
          console.error("방문 카운팅 실패:", error.message);
        }
      }
    };
    trackVisitor();
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const returnPayId = extractPaymentReturnId(params);
    const paymentEcho =
      !!returnPayId ||
      params.get("imp_success") === "true" ||
      params.get("success") === "true";
      const validTabs: TabId[] = ["fortune", "dream", "lotto", "altar", "saju", "mbti", "match", "zodiac", "palmistry"];
      const tabFromUrl = params.get("tab") as TabId | null;
      if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    } else if (paymentEcho) {
      const st = readPendingPaymentState();
      if (st?.tab && validTabs.includes(st.tab as TabId)) setActiveTab(st.tab as TabId);
      else {
        const pendingMeta = readPendingPaymentData();
        if (pendingMeta?.tab && validTabs.includes(pendingMeta.tab as TabId)) {
          setActiveTab(pendingMeta.tab as TabId);
        }
      }
    }
  }, []);

  // 모바일 PG 리다이렉트 복귀 — paymentId·imp_uid·pending_payment_state
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const returnPayId = extractPaymentReturnId(params);
    const errorMsg = params.get("message") || params.get("error_msg");
    const errorCode = params.get("code") || params.get("error_code");

    const hasReturnSignal =
      !!returnPayId ||
      params.get("imp_success") === "true" ||
      params.get("success") === "true" ||
      !!errorCode ||
      !!errorMsg;

    if (!hasReturnSignal) return;

    const stripPgQuery = () => {
      clearPendingPaymentData();
      router.replace(pathname);
    };

    const clearAllReturnArtifacts = () => {
      clearPendingPaymentData();
      clearPendingPaymentState();
      router.replace(pathname);
    };

    const pendingState = readPendingPaymentState();
    const pendingType = pendingState?.flow ?? localStorage.getItem("pendingPaymentType");

    if (localStorage.getItem("vip_mobile_payment_pending") === "1" || pendingType === "vip") {
      localStorage.removeItem("vip_mobile_payment_pending");
      localStorage.removeItem("pendingVipMerchantUid");
      if (pendingType === "vip") localStorage.removeItem("pendingPaymentType");
      clearAllReturnArtifacts();
      return;
    }

    if (!returnPayId) {
      if (errorCode || errorMsg) {
        alert(`결제 실패: ${errorMsg || errorCode || "알 수 없는 오류"}`);
      } else if (params.get("imp_success") === "true" || params.get("success") === "true") {
        alert("결제 복귀 오류: 결제 식별자(paymentId / imp_uid)가 URL에 없습니다.");
      }
      stripPgQuery();
      return;
    }

    const isSuccess = isLikelyPortOneReturnSuccess(params, returnPayId);
    if (!isSuccess) {
      alert(`결제 실패: ${errorMsg || "사용자 취소"}`);
      stripPgQuery();
      return;
    }

    const verifyAndAct = async (body: Record<string, unknown>, onOk: () => void) => {
      try {
        const verifyRes = await fetch(PAYMENT_VERIFY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const verifyData = (await verifyRes.json()) as { success?: boolean; message?: string };
        if (!verifyRes.ok || !verifyData.success) {
          alert(
            `결제 검증 오류: ${(verifyData.message && String(verifyData.message).trim()) || verifyRes.statusText || "서버·포트원 설정을 확인해 주세요."}`,
          );
          stripPgQuery();
          return;
        }
        onOk();
        clearAllReturnArtifacts();
      } catch (e) {
        console.error("[payment/verify]", e);
        alert("결제 검증 오류: 네트워크 또는 서버 응답을 확인해 주세요.");
        stripPgQuery();
      }
    };

    void (async () => {
      let wishData: {
        wishText: string;
        period: string;
        nameDisplay: string;
        nameInput: string;
        amount: number;
      } | null = null;
      if (pendingState?.wish) wishData = pendingState.wish;
      else {
        const wishRaw = localStorage.getItem("pendingPremiumWish");
        if (wishRaw) {
          try {
            wishData = JSON.parse(wishRaw);
          } catch {
            wishData = null;
          }
        }
      }

      if (pendingType === "altar" && wishData) {
        await verifyAndAct(
          {
            paymentType: "altar",
            imp_uid: returnPayId,
            paymentId: returnPayId,
            amount: wishData.amount,
            wishText: wishData.wishText,
            period: wishData.period,
            nameDisplay: wishData.nameDisplay,
            nameInput: wishData.nameInput,
          },
          () => {
            alert("✨ 특별 공양 등록 완료!");
            localStorage.removeItem("pendingPremiumWish");
            localStorage.removeItem("pendingPaymentType");
            setActiveTab("altar");
            setTimeout(
              () => window.dispatchEvent(new CustomEvent("premiumAltarSuccess", { detail: wishData })),
              800,
            );
          },
        );
        return;
      }

      if (pendingType === "lotto") {
        await verifyAndAct(
          {
            paymentType: "lotto",
            imp_uid: returnPayId,
            paymentId: returnPayId,
            amount: localStorage.getItem("pendingPaymentAmount"),
            userId: localStorage.getItem("pendingPaymentUserId"),
          },
          () => {
            alert("✨ 결제 성공! 고급 통계 로또 10회 이용권이 충전되었습니다.");
            localStorage.removeItem("pendingPaymentType");
            localStorage.removeItem("pendingPaymentAmount");
            localStorage.removeItem("pendingPaymentUserId");
            setActiveTab("lotto");
          },
        );
        return;
      }

      if (pendingType === "physiognomy" || pendingType === "name") {
        await verifyAndAct(
          {
            paymentType: "saju",
            imp_uid: returnPayId,
            paymentId: returnPayId,
            amount: localStorage.getItem("pendingPaymentAmount"),
          },
          () => {
            alert("✨ 결제가 완료되었습니다. 결과를 확인하세요!");
            localStorage.setItem("last_authorized_imp_uid", returnPayId);
            setActiveTab("saju");
          },
        );
        return;
      }

      alert(
        "결제 복귀 처리: 저장된 결제 종류와 일치하지 않습니다. 같은 브라우저에서 결제를 완료했는지 확인해 주세요.",
      );
      stripPgQuery();
    })();
  }, [pathname, router]);

  // 🚀 [추가됨] 로그인 상태 확인 및 감지
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 🚀 [추가됨] 카카오 로그인 & 로그아웃 함수
  const handleKakaoLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : '',
        scopes: 'profile_nickname profile_image', // 🔥 핵심: 이메일 빼고 이름이랑 프사만 달라고 명시!
      }
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* 🚀 [추가] 관리자 모드일 때만 나타나는 통계 대시보드 */}
      <AdminDashboard />

      <SiteHeader
        variant="app"
        right={
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                  return alert("이 브라우저는 알림을 지원하지 않습니다.");
                }
                try {
                  const registration = await navigator.serviceWorker.register('/sw.js');
                  const permission = await Notification.requestPermission();
                  if (permission !== 'granted') return alert("알림 권한이 거부되었습니다.");

                  const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
                  if (!VAPID_PUBLIC_KEY) return alert("알림 기능이 준비 중입니다. (베르첼 환경변수 VAPID 키 누락)");
                  const base64ToUint8Array = (base64: string) => {
                    const padding = '='.repeat((4 - base64.length % 4) % 4);
                    const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
                    const rawData = window.atob(b64);
                    const outputArray = new Uint8Array(rawData.length);
                    for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
                    return outputArray;
                  };

                  const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: base64ToUint8Array(VAPID_PUBLIC_KEY)
                  });

                  await fetch('/api/push/subscribe', {
                    method: 'POST',
                    body: JSON.stringify(subscription),
                    headers: { 'Content-Type': 'application/json' }
                  });
                  alert("✨ 매일 맞춤 운세 알림이 설정되었습니다!");
                } catch (e: any) {
                  console.error(e);
                  alert("알림 설정 중 오류가 발생했습니다.\n브라우저나 기기 자체의 알림 차단을 해제한 뒤 다시 시도해주세요.");
                }
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-yellow-500/20 bg-slate-800 text-yellow-400 shadow-lg transition-colors hover:bg-slate-700"
              title="매일 운세 알림 받기"
              type="button"
            >
              <Bell className="h-4 w-4 animate-bounce" />
            </button>

            <div className="hidden">
              {!isAuthChecking && (
                user ? (
                  <div className="flex animate-fade-in items-center gap-3">
                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3">
                      <img 
                        src={user.user_metadata?.avatar_url || "https://www.gravatar.com/avatar/0000?d=mp&f=y"} 
                        alt="프로필" 
                        className="h-6 w-6 rounded-full border border-yellow-500/50 object-cover" 
                      />
                      <span className="max-w-[80px] truncate text-xs font-medium text-white/90">
                        {user.user_metadata?.name || "사용자"}님
                      </span>
                    </div>
                    <button onClick={handleLogout} className="text-[10px] text-white/40 transition-colors hover:text-white/80">
                      로그아웃
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={handleKakaoLogin}
                      className="flex animate-fade-in items-center gap-2 rounded-xl bg-[#FEE500] px-3 py-2 text-xs font-bold text-[#000000] shadow-lg shadow-[#FEE500]/20 transition-transform hover:bg-[#FEE500]/90 active:scale-95"
                      type="button"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16 4.64C8.953 4.64 3.2 9.426 3.2 15.33c0 3.824 2.454 7.17 6.166 8.922l-1.33 4.88c-.122.45.39.81.77.56l5.65-3.77c.5.06 1.015.094 1.544.094 7.047 0 12.8-4.787 12.8-10.686S23.047 4.64 16 4.64z" fill="#000000"/>
                      </svg>
                      카카오 로그인
                    </button>
                    <button 
                      onClick={async () => {
                        const email = prompt("심사용 아이디(이메일)를 입력하세요.");
                        if (!email) return;
                        const password = prompt("비밀번호를 입력하세요.");
                        if (!password) return;
                        const { error } = await supabase.auth.signInWithPassword({ email, password });
                        if (error) alert("로그인 실패: " + error.message);
                        else alert("심사용 테스트 계정으로 로그인되었습니다.");
                      }} 
                      className="animate-fade-in text-[10px] text-white/30 transition-colors hover:text-white/70"
                      type="button"
                    >
                      심사관 로그인
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        }
      />

      {/* 🚀 메뉴 클릭 시 자동 중앙 정렬 기능이 탑재된 네비게이션 */}
      <nav className="sticky top-[52px] z-50 w-full border-b border-slate-700/50 bg-slate-900/95 backdrop-blur-sm shadow-md relative">
        <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-slate-900 via-slate-900/80 to-transparent z-10 pointer-events-none sm:hidden" />
        
        <div 
          ref={navRef}
          className="mx-auto flex max-w-screen-md items-center justify-start gap-6 px-4 py-2 overflow-x-auto no-scrollbar sm:px-6 sm:justify-between sm:gap-0 relative z-0"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-tab-id={tab.id} // 🚀 자동 스크롤을 위한 이름표 부착
                type="button"
                onClick={(e) => {
                  if (!tab.isReady) return;
                  setActiveTab(tab.id);
supabase.rpc('increment_tab_click', { target_tab_id: tab.id });
                  
                  // 🚀 클릭 시 해당 버튼을 스크롤 박스의 중앙으로 이동시키는 매직 로직
                  const target = e.currentTarget;
                  const container = navRef.current;
                  if (container && target) {
                    const containerWidth = container.offsetWidth;
                    const targetOffsetLeft = target.offsetLeft;
                    const targetWidth = target.offsetWidth;
                    container.scrollTo({
                      left: targetOffsetLeft - (containerWidth / 2) + (targetWidth / 2),
                      behavior: 'smooth'
                    });
                  }
                }}
                className={`
                  relative flex flex-col items-center gap-1.5 p-2 min-w-[64px] sm:min-w-[80px]
                  transition-all duration-300 ease-out focus:outline-none
                  ${isActive ? "text-yellow-400" : tab.isReady ? "text-slate-400 hover:text-yellow-300" : "text-white/20 cursor-not-allowed"}
                `}
              >
                {isActive && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.6)]" aria-hidden />
                )}
                <tab.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${isActive ? "drop-shadow-[0_0_6px_rgba(234,179,8,0.8)]" : ""}`} strokeWidth={2} />
                <span className="text-[10px] sm:text-xs font-medium whitespace-nowrap">{tab.label}</span>
                {!tab.isReady && (
                  <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-orange-600 text-[9px] sm:text-[10px] font-bold text-white shadow-lg animate-pulse">
                    준비
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* 메인 콘텐츠 영역 */}
      <main className="relative flex w-full flex-1 flex-col">
        {TABS.map((tab) => {
          const isVisible = activeTab === tab.id;
          const IconComponent = tab.icon;

          if (tab.id === "fortune") return <FortuneTab key={tab.id} isVisible={isVisible} />;
          if (tab.id === "dream") return <DreamTab key={tab.id} isVisible={isVisible} onNavigate={setActiveTab} />;
          if (tab.id === "saju") return <SajuTab key={tab.id} isVisible={isVisible} />;
          if (tab.id === "altar") return <AltarTab key={tab.id} isVisible={isVisible} />;
          if (tab.id === "lotto") return <LottoTab key={tab.id} isVisible={isVisible} />;
          if (tab.id === "mbti") return <MbtiTab key={tab.id} isVisible={isVisible} onNavigate={setActiveTab} />;
          if (tab.id === "match") return <MatchTab key={tab.id} isVisible={isVisible} onNavigate={setActiveTab} />;
          if (tab.id === "zodiac") return <ZodiacTab key={tab.id} isVisible={isVisible} />;
          if (tab.id === "palmistry") return <PalmistryTab key={tab.id} isVisible={isVisible} />;

          return (
            <div
              key={tab.id}
              role="tabpanel"
              aria-hidden={!isVisible}
              className={`flex flex-col items-center gap-8 px-6 py-12 ${isVisible ? "" : "hidden"}`}
            >
              <p className="text-center text-lg text-yellow-400/90">
                신비로운 {tab.label} 기능이 곧 업데이트 됩니다.
              </p>
              <div
                className={`
                  flex items-center justify-center rounded-2xl p-16
                  transition-transform duration-500 ease-out
                  ${isVisible ? "scale-100" : "scale-95"}
                `}
              >
                <IconComponent className="h-32 w-32 text-yellow-500/80 drop-shadow-[0_0_24px_rgba(234,179,8,0.4)]" strokeWidth={1.5} />
              </div>
            </div>
          );
        })}
      </main>

      {activeTab === "lotto" && (
        <div className="w-full shrink-0 border-t border-white/10 bg-slate-950 px-4 py-3">
          <p className="mx-auto max-w-2xl text-center text-[10px] leading-relaxed text-white/45 break-keep">
            제공된 로또 번호는 수학적 난수와 통계 기반으로 추첨되며, 당첨을 보장하지 않습니다. 과도한 복권 몰입은 가계 재정에 부담이 될 수 있습니다.
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-center text-[10px] font-semibold text-white/35 break-keep">
            도박중독예방상담센터: 1336 | 동행복권: 1588-0908
          </p>
        </div>
      )}

    </div>
  );
}
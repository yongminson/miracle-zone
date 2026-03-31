/* eslint-disable */
// @ts-nocheck
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  type LucideIcon,
} from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type TabId = "fortune" | "dream" | "lotto" | "altar" | "saju";

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

const TABS: { id: TabId; label: string; icon: LucideIcon; isReady: boolean }[] = [
  { id: "fortune", label: "오늘의 운세", icon: Sparkles, isReady: true },
  { id: "dream", label: "꿈 풀이", icon: BookOpen, isReady: true },
  { id: "lotto", label: "행운의 로또", icon: Trophy, isReady: true },
  { id: "altar", label: "기적의 제단", icon: Flame, isReady: true },
  { id: "saju", label: "관상/이름 풀이", icon: BookOpen, isReady: true },
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
} | null;

type PremiumReport = {
  daeun: string;
  monthlyAdvice: string;
  wealth: string;
  love: string;
  career: string;
  health: string;
};

type DaeunInfo = {
  startAge: number;
  currentCycle: string;
  currentDescription: string;
};

// 🚀 [추가] 탭별 맞춤 푸터 & 약관 모달 & 진짜 관리자 로그인 컴포넌트
function FooterPolicy({ tabId }: { tabId: TabId }) {
  const [showPolicy, setShowPolicy] = useState<string | null>(null);

  const handleAdminLogin = () => {
    const pwd = prompt("운영자 비밀번호를 입력하세요.");
    if (pwd === "1004") {
      localStorage.setItem("MASTER_ADMIN", "true");
      alert("✨ 운영자 모드가 활성화되었습니다. 이제 모든 프리미엄 결제가 프리패스됩니다.");
    } else if (pwd) {
      alert("비밀번호가 일치하지 않습니다.");
    }
  };

  return (
    <div className="mt-12 mb-8 mx-auto w-full max-w-md border border-white/10 bg-black/40 backdrop-blur-md rounded-2xl pt-6 pb-8 text-center space-y-3 px-4 relative z-50 shadow-xl">
      {tabId === "lotto" ? (
        <>
          <p className="text-[10px] text-white/40 break-keep leading-relaxed">
            제공된 로또 번호는 수학적 난수와 통계 기반으로 추출되며, 당첨을 보장하지 않습니다. 과도한 복권 몰입은 가계 재정에 부담이 될 수 있습니다.
          </p>
          <p className="text-[10px] font-bold text-white/30 pt-1">
            도박중독예방상담센터: 1336 | 동행복권: 1588-0908
          </p>
        </>
      ) : tabId === "altar" ? (
        <p className="text-[10px] text-white/40 break-keep leading-relaxed">
          본 서비스는 희망과 위로를 나누는 공간으로 특정 종교와 무관하며 법적 효력을 갖지 않습니다.
        </p>
      ) : (
        <p className="text-[10px] text-white/40 break-keep leading-relaxed">
          본 서비스에서 제공하는 운세, 해몽, 관상 및 이름 풀이 결과는 정통 명리학에 기반한 통계적 해석으로, 절대적인 미래를 보장하지 않으며 법적 책임을 지지 않습니다.
        </p>
      )}

      <div className="flex justify-center gap-4 text-[10px] text-white/50 pt-2 font-medium">
        <button type="button" onClick={() => setShowPolicy("terms")} className="hover:text-white transition-colors">이용약관</button>
        <span>|</span>
        <button type="button" onClick={() => setShowPolicy("privacy")} className="hover:text-white transition-colors">개인정보처리방침</button>
        <span>|</span>
        <button type="button" onClick={() => setShowPolicy("refund")} className="hover:text-white transition-colors">환불정책</button>
      </div>

      {/* 🔒 더블클릭 시 숨겨진 운영자 로그인 작동 */}
      <p className="text-[9px] text-white/20 pt-2 cursor-default select-none" onDoubleClick={handleAdminLogin}>
        © 2026 명운(命運). All rights reserved.
      </p>

      {/* 📜 정책 모달창 */}
      {showPolicy && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowPolicy(null)}>
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/20 p-6 shadow-2xl max-h-[85vh] flex flex-col text-left" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-bold text-yellow-400 mb-4 border-b border-white/10 pb-3 shrink-0 flex justify-between items-center">
              <span>{showPolicy === "terms" ? "이용약관" : showPolicy === "privacy" ? "개인정보처리방침" : "환불정책"}</span>
              <button onClick={() => setShowPolicy(null)} className="text-white/50 hover:text-white text-2xl font-light">&times;</button>
            </h3>
            <div className="text-xs text-white/80 space-y-4 leading-relaxed whitespace-pre-wrap flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {showPolicy === "terms" && "제1조 (목적)\n본 약관은 서비스의 이용조건 및 절차, 이용자와 회사의 권리, 의무, 책임사항을 규정함을 목적으로 합니다.\n\n제2조 (서비스의 성격)\n본 서비스에서 제공하는 모든 결과는 통계적, 학술적 해석에 기반하며 절대적인 사실이나 미래를 보장하지 않습니다."}
              {showPolicy === "privacy" && "1. 수집하는 개인정보 항목\n회사는 회원가입 없이 서비스를 제공하며, 사주 분석을 위해 입력하신 생년월일, 성별, 이름 등은 서버에 영구 저장되지 않고 분석 즉시 폐기됩니다.\n\n2. 쿠키의 사용\n서비스 편의를 위해 기기 내부에 일부 설정(예: 프리미엄 해제 상태)이 임시 저장될 수 있습니다."}
              {showPolicy === "refund" && "[디지털 콘텐츠 환불 규정 안내]\n\n본 서비스에서 결제를 통해 제공되는 프리미엄 리포트 및 통계 번호 등은 '디지털 콘텐츠'에 해당합니다.\n\n1. 청약철회 불가 안내\n전자상거래 등에서의 소비자보호에 관한 법률 제17조에 의거, 결제가 완료되고 결과가 화면에 노출된 즉시 콘텐츠의 제공이 완료된 것으로 간주되어 원칙적으로 환불(청약철회)이 불가합니다.\n\n2. 예외적 환불 안내\n결제는 정상적으로 완료되었으나 시스템 오류로 인하여 결과를 전혀 열람하지 못한 경우에는 고객센터 확인을 거쳐 100% 환불 처리해 드립니다."}
            </div>
            <button className="mt-6 w-full py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors focus:outline-none" onClick={() => setShowPolicy(null)}>
              확인하고 닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
    return `${FORTUNE_CACHE_PREFIX}${today}-${gender}-${birthDate}-${calendarType}-${birthTime}`;
  };

  const getPremiumCacheKey = () => {
    const today = getKstDateKey();
    return `${PREMIUM_CACHE_PREFIX}${today}-${gender}-${birthDate}-${calendarType}-${birthTime}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
            const minLoadingMs = 2000;
            await new Promise((r) => setTimeout(r, minLoadingMs));
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

    const startTime = Date.now();
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

      const minLoadingMs = 4000;
      const elapsed = Date.now() - startTime;
      if (elapsed < minLoadingMs) {
        await new Promise((r) => setTimeout(r, minLoadingMs - elapsed));
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
    alert("결제 모듈은 연동 예정입니다. (테스트 렌더링)");
  
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
            await new Promise((r) => setTimeout(r, 2200));
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
  
      const startTime = Date.now();
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
  
      const minLoadingMs = 4800;
      const elapsed = Date.now() - startTime;
      if (elapsed < minLoadingMs) {
        await new Promise((r) => setTimeout(r, minLoadingMs - elapsed));
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
        <div className="grid grid-cols-4 gap-2">
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
      className={`
        absolute inset-0 flex flex-col overflow-y-auto
        transition-opacity duration-500 ease-out
        ${isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}
      `}
    >
      <div className="fixed inset-0 z-0 pointer-events-none bg-slate-950">
        <div className="absolute inset-0 bg-cover bg-center opacity-80" style={{ backgroundImage: "url('/bg_fortune.jpg')" }} />
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

      <div className="relative z-10 flex flex-1 flex-col items-center gap-6 px-6 py-8">
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
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
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
                  <span>✨</span> 광고 보고 상세 운세 보기
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
                ✨ 전문가 심층 명리학 리포트 무료 열람
              </h3>
              <p className="mb-6 text-center text-sm text-white/70">
                짧은 광고를 시청하시면 대운과 재물·연애·직장·건강운 심층 분석 리포트를 <strong className="text-yellow-300">무료로</strong> 확인하실 수 있습니다.
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
                  ▶ 광고 보고 리포트 열기
                </button>
              </div>
            </div>
          </div>
        )}
        <FooterPolicy tabId="fortune" />
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

    setIsLoading(true);
    setResultData(null);

    try {
      const res = await fetch("/api/dream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dreamText: dreamInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResultData(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "해몽 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div role="tabpanel" aria-hidden={!isVisible} className={`absolute inset-0 flex flex-col overflow-y-auto transition-opacity duration-500 ease-out ${isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
      
      <div className="fixed inset-0 z-0 pointer-events-none bg-slate-900 overflow-hidden">
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

      <div className="relative z-10 flex flex-1 flex-col items-center gap-6 px-6 pt-4 pb-12 min-h-full">
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
          <div className="flex flex-1 flex-col items-center justify-center gap-8 mt-4">
            
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

              <button onClick={() => setResultData(null)} className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-4 text-sm font-medium text-white/80 hover:bg-white/10 transition-colors">
                다른 꿈 해몽하기
              </button>
            </div>
          </div>
        )}
        <FooterPolicy tabId="dream" />
      </div>
    </div>
  );
}

function AltarTab({ isVisible }: { isVisible: boolean }) {
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
  const [premiumPeriod, setPremiumPeriod] = useState<PremiumPeriod>("24h");
  const [premiumNameDisplay, setPremiumNameDisplay] = useState<PremiumNameDisplay>("anonymous");
  const [premiumNameInput, setPremiumNameInput] = useState("");
  const [premiumWishText, setPremiumWishText] = useState("");
  const [countdownNow, setCountdownNow] = useState(Date.now());
  const audioRef = useRef<HTMLAudioElement>(null);
  
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
      playPromise.catch(() => {});
    }
    return () => {
      audio.pause();
    };
  }, [isVisible]);
  
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
        return [...premium, ...localOnly];
      });
    } catch (err) {
      console.error("데이터 불러오기 실패:", err);
    }
  }, []);
  
  useEffect(() => {
    fetchWishes();
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
    setIsMuted(nextMuted);
  };

  const lastOptimisticRef = useRef<{ text: string; at: number } | null>(null);
  
  const handleSubmitFree = async () => {
    const text = wishText.trim();
    if (!text || isCooldown || isSubmittingFreeWish) return;
  
    setIsSubmittingFreeWish(true);
  
    try {
      await new Promise((r) => setTimeout(r, 1000));
      const optId = `opt-${Date.now()}`;
      const nowIso = new Date().toISOString();
  
      setWishes((prev) =>
        filterFreeWishes([{ id: optId, content: text, created_at: nowIso }, ...prev])
      );
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
  
  // 🚀 프리미엄 결제창 띄우기 함수 (app_scheme 추가 및 상세 에러 로깅)
  const handlePremiumConfirm = () => {
    if (!premiumWishText.trim()) return;

    if (typeof window !== "undefined") {
      const IMP = (window as any).IMP;
      if (!IMP) {
        alert("🚨 결제 시스템 로딩 실패. 새로고침[F5] 해주세요!");
        return;
      }

      IMP.init("imp61375123"); 

      const amount = premiumPeriod === "24h" ? 1900 : 6900;
      const name = premiumPeriod === "24h" ? "명운 제단 (24시간)" : "명운 제단 (10일)";
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      const payData: any = {
        pg: "tosspayments", 
        pay_method: "card",
        merchant_uid: `mid_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        name: name,
        amount: amount,
        buyer_email: "test@ymstudio.co.kr", 
        buyer_name: "명운 사용자",
        app_scheme: "myungun", // 모바일 앱 복귀용 스킴
      };

      if (isMobile) {
        payData.m_redirect_url = window.location.href;
      }

      IMP.request_pay(payData, async function (rsp: any) {
        if (rsp.success) {
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imp_uid: rsp.imp_uid,
                merchant_uid: rsp.merchant_uid,
                amount: amount,
                wishText: premiumWishText,
                period: premiumPeriod,
                nameDisplay: premiumNameDisplay,
                nameInput: premiumNameInput,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              alert("✨ 결제가 성공적으로 완료되었으며 제단에 소원이 올라갔습니다!");
              setShowPremiumModal(false);
              setPremiumWishText("");
              setPremiumNameInput("");
              // 외부에서 선언된 fetchWishes 함수 호출 시도
              if (typeof fetchWishes === 'function') fetchWishes(); 
            } else {
              alert(`🚨 결제 검증 실패: ${verifyData.message}`);
            }
          } catch (error) {
            console.error("결제 검증 오류:", error);
            alert("결제는 성공했으나 서버 통신 중 오류가 발생했습니다. (검증 API 부재)");
          }
        } else {
          console.warn("결제 실패/취소 상세:", rsp);
          
          // 에러 원인 추적을 위해 객체를 문자열로 풀어서 노출
          const rawError = JSON.stringify(rsp, null, 2);
          const isUserCancel = rsp.error_msg?.includes("사용자 취소") || rsp.error_code === "F1002";
          
          if (isUserCancel && !isMobile) {
            alert(`결제가 취소되었습니다.\n💡 스마트폰에서 결제 승인 후, 반드시 PC 화면 결제창의 [결제 완료] 버튼을 누르거나 창이 스스로 닫힐 때까지 기다려주세요!`);
          } else {
            alert(`결제 실패:\n${rsp.error_msg || "알 수 없는 오류"}\n상세 데이터:\n${rawError}`);
          }
        }
      });
    }
  };

  const handlePremiumCancel = () => {
    setShowPremiumModal(false);
    setPremiumWishText("");
    setPremiumNameInput("");
  };
  
  return (
    <div
      role="tabpanel"
      aria-hidden={!isVisible}
      className={`
        absolute inset-0 flex flex-col bg-transparent
        transition-opacity duration-500 ease-out
        ${isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}
      `}
    >
      <div className="fixed inset-0 z-0 pointer-events-none">
        <video src="/초.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      <div className="relative z-10 w-full h-full flex flex-col">
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
                      /* 화면 양끝 15%~85% 사이에서만 나타나도록 제한 (짤림 방지) */
                      left: `${15 + ((i * 17 + 5) % 70)}%`,
                      top: `${30 + (i * 11 % 41)}%`,
                      transform: "translateX(-50%)",
                      animation: `float-wish-center ${10 + (i % 9)}s ease-out infinite`,
                      animationDelay: `${(i * 0.7) % 8}s`,
                      width: "max-content",
                      maxWidth: "85vw", /* 모바일/PC 모두 화면 폭의 85%를 넘지 않음 */
                    }}
                  >
                    <p style={{ whiteSpace: "pre-wrap", wordBreak: "keep-all", textAlign: "center" }} className="text-sm font-medium text-white/60 px-3">
                      {wish}
                    </p>
                  </div>
                ))}
                
                {/* 🚀 프리미엄 소원 렌더링 */}
                {premiumFiltered.slice(-6).map((pw, i) => {
                  const idLength = String(pw.id).length;
                  const isTenDays = pw.period === "10d";
                  
                  const leftPct = 15 + ((i * 25 + idLength * 7) % 70); // 양끝 짤림 방지
                  const duration = isTenDays ? 22 + (i % 5) : 18 + (i % 5);
                  const delay = `${(i * 3.5) % 10}s`;
                  const remaining = getPremiumRemainingMs(pw);

                  return (
                    <div
                      key={pw.id}
                      className="absolute"
                      style={{
                        left: `${leftPct}%`,
                        animation: `float-up-premium ${duration}s linear infinite`,
                        animationDelay: delay,
                        width: "max-content",
                        maxWidth: "90vw",
                      }}
                    >
                      <div className="flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm px-4 py-3 rounded-2xl border border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.15)]">
                        <p className={
                            isTenDays
                              ? "text-base sm:text-xl font-extrabold text-yellow-200 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)] text-center break-keep leading-snug whitespace-pre-wrap"
                              : "text-sm sm:text-lg font-bold text-yellow-300 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)] text-center break-keep leading-snug whitespace-pre-wrap"
                          }
                        >
                          {pw.badge}<br/>{pw.content}
                        </p>
                        <p className={isTenDays ? "mt-1.5 text-xs font-medium text-amber-200/90" : "mt-1.5 text-[11px] text-yellow-400/80"}>
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

        {/* 🚀 입력창을 화면 맨 아래 빈 공간으로 밀착시킴 (pb-8 -> pb-2) */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-end px-4 pb-2 mt-auto">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-black/60 p-4 backdrop-blur-md shadow-2xl">
            <textarea
              value={wishText}
              onChange={(e) => setWishText(e.target.value)}
              placeholder="소원을 적어주세요..."
              rows={2}
              className="w-full resize-none rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-amber-50 placeholder-amber-200/60 focus:border-yellow-500/60 focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
            />

            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-amber-100/70">전체 소원 {activeWishCount}개</span>
              <span className="text-yellow-300/80">프리미엄 {activePremiumCount}개</span>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleSubmitFree}
                disabled={isCooldown || isSubmittingFreeWish}
                className="flex-1 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 px-3 py-2.5 text-xs font-bold text-slate-900 shadow-lg shadow-yellow-500/25 transition-all hover:from-yellow-400 hover:to-amber-500 focus:outline-none disabled:opacity-50"
              >
                {isSubmittingFreeWish ? "유지시간 1시간" : isCooldown ? "5초 후 작성 가능" : "소원 띄우기 (무료)"}
              </button>
              <button
                type="button"
                onClick={handleOpenPremiumModal}
                className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 px-3 py-2.5 text-xs font-bold text-slate-900 shadow-lg shadow-amber-500/25 transition-all hover:from-amber-400 hover:to-yellow-500 focus:outline-none"
              >
                ✨ 프리미엄 기원
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleMuteToggle}
          className="fixed bottom-24 right-4 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-yellow-500/20 text-yellow-400 transition-colors hover:bg-yellow-500/30 focus:outline-none"
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

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
              <div className="flex gap-2">
                <button type="button" onClick={handlePremiumCancel} className="flex-1 rounded-xl border border-white/20 bg-white/5 py-3 text-sm font-medium text-white/90">취소</button>
                <button type="button" onClick={handlePremiumConfirm} disabled={!premiumWishText.trim()} className="flex-1 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 py-3 text-sm font-semibold text-slate-900 disabled:opacity-50">결제하고 띄우기</button>
              </div>
            </div>
          </div>
        )}
        <FooterPolicy tabId="altar" />
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
  const [nameResultData, setNameResultData] = useState<{
    freeSummary: string;
    freeWeakness?: string;
    premiumReport: {
      basisBox?: { pronunciation: string; resource: string; sajuRelation: string };
      coreEnergy: string;
      nameFlow: string;
      sajuFit: string;
      lifeCycle: string;
    };
  } | null>(null);
  const [showNamePaymentModal, setShowNamePaymentModal] = useState(false);
  const [isNamePremiumUnlocked, setIsNamePremiumUnlocked] = useState(false);

  const handleFaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type.startsWith("image/")) {
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
        alert(data.error);
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
      alert("분석 중 오류가 발생했습니다.");
    } finally {
      setIsFaceScanning(false);
    }
  };

  const handleFacePremium = () => {
    if (typeof window !== "undefined" && localStorage.getItem("MASTER_ADMIN") === "true") {
      setIsPhysiognomyPremiumUnlocked(true);
    } else {
      setShowPhysiognomyPaymentModal(true);
    }
  };

  const handlePhysiognomyPaymentConfirm = () => {
    alert("결제 모듈은 Phase 3에서 연동됩니다. (테스트 렌더링)");
    setShowPhysiognomyPaymentModal(false);
    setIsPhysiognomyPremiumUnlocked(true);
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
      setIsNamePremiumUnlocked(true);
    } else {
      setShowNamePaymentModal(true);
    }
  };

  const handleNamePaymentConfirm = () => {
    alert("결제 모듈은 Phase 3에서 연동됩니다. (테스트 렌더링)");
    setShowNamePaymentModal(false);
    setIsNamePremiumUnlocked(true);
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
      className={`
        absolute inset-0 flex flex-col overflow-y-auto
        transition-opacity duration-500 ease-out
        ${isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}
      `}
    >
      <div className="fixed inset-0 z-0 pointer-events-none bg-slate-950">
        <div className="absolute inset-0 bg-cover bg-center opacity-60 mix-blend-screen" style={{ backgroundImage: "url('/bg_face_name.png')" }} />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center gap-6 px-6 py-8">
        
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

                    <div className="rounded-2xl border-2 border-amber-500/50 bg-[#16120d]/90 p-5 shadow-lg">
                      <h4 className="mb-4 text-center text-base font-bold text-amber-400 border-b border-amber-500/30 pb-2">
                        ✨ 심층 인상 및 주의점 (팩트폭력)
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
                          onClick={(e) => { e.preventDefault(); setShowPhysiognomyPaymentModal(true); }}
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
        <FooterPolicy tabId="saju" />
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
      if (!Number.isNaN(n) && n >= 0) {
        setFreeCount(n);
      }
    }
  }, []);

  const [visibleCount, setVisibleCount] = useState(0);
  const [showLottoPaymentModal, setShowLottoPaymentModal] = useState(false);
  const [showLottoProgressModal, setShowLottoProgressModal] = useState(false);
  const [lottoProgressStep, setLottoProgressStep] = useState(0);
  const [lottoProgressPct, setLottoProgressPct] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const LOTTO_PROGRESS_STEPS = [
    "출현 빈도 분포 정리 중...",
    "구간/합계 필터 적용 중...",
    "고급 통계 조합 계산 중...",
  ];

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LOTTO_STORAGE_KEY, String(freeCount));
    localStorage.setItem(LOTTO_DATE_KEY, new Date().toDateString());
  }, [freeCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isVisible) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
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
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    let frameId: number;
    const loop = () => {
      draw();
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameId);
    };
  }, [isVisible]);

  const handleFreeDraw = () => {
    if (freeCount <= 0) {
      alert("무료 횟수가 모두 소진되었습니다.");
      return;
    }
    if (isDrawing) return;

    setIsDrawing(true);
    setVisibleCount(0);
    const numbers = generateLottoNumbers();
    setLottoHistory((prev) => [numbers, ...prev]);
    setFreeCount((c) => c - 1);

    numbers.forEach((_, i) => {
      setTimeout(() => setVisibleCount((v) => v + 1), i * 450);
    });
    setTimeout(() => setIsDrawing(false), numbers.length * 450 + 100);
  };

  const handlePremium = () => {
    if (isDrawing) return;
    if (typeof window !== "undefined" && localStorage.getItem("MASTER_ADMIN") === "true") {
      handleLottoPaymentConfirm();
    } else {
      setShowLottoPaymentModal(true);
    }
  };

  const handleLottoPaymentConfirm = async () => {
    setShowLottoPaymentModal(false);
    setShowLottoProgressModal(true);
    setLottoProgressStep(0);
    setLottoProgressPct(0);
    const progressInterval = setInterval(() => {
      setLottoProgressPct((p) => Math.min(100, p + 2));
    }, 60);
    setTimeout(() => setLottoProgressStep(1), 900);
    setTimeout(() => setLottoProgressStep(2), 1800);

    try {
      const [res] = await Promise.all([
        fetch("/api/lotto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
        new Promise<void>((r) => setTimeout(r, 2800)),
      ]);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "로또 번호 생성 실패");
      const numbers = data.numbers as number[];

      clearInterval(progressInterval);
      setLottoProgressPct(100);
      setShowLottoProgressModal(false);

      setIsDrawing(true);
      setVisibleCount(0);
      setLottoHistory((prev) => [numbers, ...prev]);
      numbers.forEach((_, i) => {
        setTimeout(() => setVisibleCount((v) => v + 1), i * 450);
      });
      setTimeout(() => setIsDrawing(false), numbers.length * 450 + 100);
    } catch (err) {
      clearInterval(progressInterval);
      setShowLottoProgressModal(false);
      alert(err instanceof Error ? err.message : "로또 번호 생성 중 오류가 발생했습니다.");
    }
  };

  // 🚀 [비밀 관리자 모드] 실제 초기화 로직
  const handleAdminReset = () => {
    setFreeCount(3);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOTTO_STORAGE_KEY, "3");
    }
    alert("✨ [비밀 관리자 모드] 로또 무료 횟수가 3회로 초기화되었습니다.");
  };

  const currentSet = lottoHistory[0] ?? [];
  const displayHistory = lottoHistory.slice(0, 5);

  return (
    <div
      role="tabpanel"
      aria-hidden={!isVisible}
      className={`
        absolute inset-0 flex flex-col overflow-y-auto overflow-x-hidden
        transition-opacity duration-500 ease-out
        ${isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}
      `}
    >
      <canvas
        ref={canvasRef}
        id="matrix-canvas"
        className="absolute inset-0 z-0 opacity-30 pointer-events-none"
      />

      {showLottoPaymentModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setShowLottoPaymentModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-yellow-700/50 bg-[#16120d]/95 p-6 shadow-2xl shadow-amber-900/20 backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-center text-lg font-semibold text-yellow-300">
              ✨ 고급 통계 필터 번호 추천 (500원)
            </h3>
            <p className="mb-6 text-center text-sm leading-relaxed text-yellow-100/70">
              출현 빈도, 번호 분포, 합계 구간, 연속 번호 제한 등 여러 통계 필터를 조합해 번호를 추천합니다.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowLottoPaymentModal(false)}
                className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleLottoPaymentConfirm}
                className="flex-1 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-yellow-900/30 transition-all hover:from-yellow-400 hover:to-amber-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
              >
                결제하고 번호 생성
              </button>
            </div>
          </div>
        </div>
      )}

      {showLottoProgressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-yellow-700/30 bg-[#17120d]/90 p-8 backdrop-blur-md shadow-2xl">
            <p className="mb-6 text-center text-lg font-medium text-yellow-300">
              {LOTTO_PROGRESS_STEPS[lottoProgressStep]}
            </p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 transition-all duration-75 ease-out"
                style={{ width: `${lottoProgressPct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-1 flex-col items-center gap-6 px-6 py-8">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full border border-yellow-700/40 bg-yellow-500/10 px-3 py-1 text-[11px] text-yellow-200 backdrop-blur-sm">
            이번 주 추천 조합
          </span>
          <span className="rounded-full border border-yellow-700/40 bg-yellow-500/10 px-3 py-1 text-[11px] text-yellow-200 backdrop-blur-sm">
            무료 3회 제공
          </span>
          <span className="rounded-full border border-yellow-700/40 bg-yellow-500/10 px-3 py-1 text-[11px] text-yellow-200 backdrop-blur-sm">
            통계 기반 추천
          </span>
        </div>

        <div className="w-full max-w-2xl rounded-3xl border border-yellow-700/35 bg-[#151515]/85 p-6 shadow-[0_0_30px_rgba(245,158,11,0.08)] backdrop-blur-md">
          <div className="mb-5 text-center">
            {/* 🚀 [비밀 버튼] 로또 탭 제목 터치를 "L"로 인식 */}
            <h2 onClick={() => pushSecret("L", handleAdminReset)} className="text-xl font-bold text-yellow-300 select-none cursor-pointer">
              행운의 로또 번호 추출기
            </h2>
            <p className="mt-2 text-sm text-yellow-50/70">
              가볍게 번호를 뽑고, 필요하면 고급 통계 필터 추천까지 받아볼 수 있습니다.
            </p>
          </div>

          <div className="rounded-2xl border border-yellow-800/20 bg-[#0f0f0f]/70 px-4 py-6">
            <p className="mb-4 text-center text-sm font-medium tracking-wide text-yellow-200/80">
              이번에 추출된 번호
            </p>

            <div className="flex min-h-[100px] flex-wrap items-center justify-center gap-5">
              {currentSet.length === 0 ? (
                <p className="text-sm text-yellow-50/45">
                  아직 생성된 번호가 없습니다. 아래 버튼을 눌러 시작하세요.
                </p>
              ) : (
                currentSet.map((num, i) => (
                  <div
                    key={`current-${num}-${i}`}
                    className={`
                      flex h-16 w-16 shrink-0 items-center justify-center rounded-full
                      text-xl font-bold shadow-inner ring-2 ring-black/20
                      ${getLottoBallStyle(num)}
                      ${i < visibleCount ? "animate-[lotto-ball-bounce_0.5s_ease-out_forwards]" : "opacity-0 scale-0"}
                    `}
                  >
                    {num}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row">
            <button
              type="button"
              onClick={handleFreeDraw}
              disabled={isDrawing}
              className="flex-1 rounded-xl border border-yellow-700/40 bg-[#2a2a2a] px-6 py-3 text-sm font-medium text-yellow-200 transition-all hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
            >
              무료 번호 생성 (남은 횟수: {freeCount}/3)
            </button>

            <button
              type="button"
              onClick={handlePremium}
              disabled={showLottoPaymentModal || showLottoProgressModal}
              className="flex-1 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 px-6 py-3 text-sm font-medium text-slate-900 shadow-lg shadow-yellow-900/25 transition-all hover:from-yellow-400 hover:to-amber-500 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
            >
              ✨ 고급 통계 필터 번호 추천 (500원)
            </button>
          </div>
        </div>

        {displayHistory.length > 0 && (
          <div className="w-full max-w-lg space-y-3">
            <h3 className="text-center text-sm font-medium text-yellow-300/90">
              추천 번호 이력
            </h3>

            <div className="space-y-2">
              {displayHistory.map((nums, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-yellow-700/20 bg-[#1a1a1a]/80 px-4 py-3"
                >
                  {nums.map((num, i) => (
                    <div
                      key={`${idx}-${i}`}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-inner ${getLottoBallStyle(num)}`}
                    >
                      {num}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        <a
          href="https://www.dhlottery.co.kr/"
          target="_blank"
          rel="noreferrer noopener"
          className="mt-2 w-full max-w-md rounded-2xl border border-yellow-700/30 bg-[#191611]/90 px-4 py-4 text-left transition-all hover:bg-[#211c15]"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-500/15 text-lg">
                🎟
              </div>
              <div>
                <p className="text-sm font-medium text-yellow-200">
                  동행복권 공식 홈페이지 바로가기
                </p>
                <p className="mt-1 text-xs text-yellow-50/50">
                  공식 사이트에서 추첨 결과와 판매점 정보를 확인하세요
                </p>
              </div>
            </div>
            <span className="text-sm text-yellow-300/70">→</span>
          </div>
        </a>

        <FooterPolicy tabId="lotto" />
      </div>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("fortune");
  const [user, setUser] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // 🚀 모바일 결제 후 돌아왔을 때 결과 처리 (파라미터 검사 강화)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    
    const isSuccess = urlParams.get("imp_success") === "true" || urlParams.get("success") === "true";
    const errorMsg = urlParams.get("error_msg") || urlParams.get("message");
    const payReturn = urlParams.get("imp_uid");

    if (payReturn) {
      if (isSuccess) {
        alert("✨ (모바일) 결제가 성공적으로 완료되었습니다!");
        setActiveTab("altar"); 
      } else {
        alert(`결제가 취소/실패했습니다: ${errorMsg || "사용자 취소"}`);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

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
      {/* 🚀 [추가됨] 최상단 헤더 (앱 로고 & 카카오 로그인 버튼) */}
      <header className="sticky top-0 z-[60] w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-600 flex items-center justify-center text-xs font-bold text-black">
            명
          </div>
          <span className="text-yellow-400 font-bold tracking-widest text-sm">명운(命運)</span>
        </div>
        
        <div>
          {!isAuthChecking && (
            user ? (
              <div className="flex items-center gap-3 animate-fade-in">
                <div className="flex items-center gap-2 bg-white/5 pr-3 pl-1 py-1 rounded-full border border-white/10">
                  <img 
                    src={user.user_metadata?.avatar_url || "https://www.gravatar.com/avatar/0000?d=mp&f=y"} 
                    alt="프로필" 
                    className="w-6 h-6 rounded-full border border-yellow-500/50 object-cover" 
                  />
                  <span className="text-xs font-medium text-white/90 truncate max-w-[80px]">
                    {user.user_metadata?.name || "사용자"}님
                  </span>
                </div>
                <button onClick={handleLogout} className="text-[10px] text-white/40 hover:text-white/80 transition-colors">
                  로그아웃
                </button>
              </div>
            ) : (
              <button
                onClick={handleKakaoLogin}
                className="flex items-center gap-2 bg-[#FEE500] hover:bg-[#FEE500]/90 text-[#000000] px-3 py-2 rounded-xl text-xs font-bold transition-transform active:scale-95 shadow-lg shadow-[#FEE500]/20 animate-fade-in"
              >
                <svg className="w-4 h-4" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 4.64C8.953 4.64 3.2 9.426 3.2 15.33c0 3.824 2.454 7.17 6.166 8.922l-1.33 4.88c-.122.45.39.81.77.56l5.65-3.77c.5.06 1.015.094 1.544.094 7.047 0 12.8-4.787 12.8-10.686S23.047 4.64 16 4.64z" fill="#000000"/>
                </svg>
                카카오 1초 로그인
              </button>
            )
          )}
        </div>
      </header>

      {/* 기존 네비게이션 탭 (top-0 에서 top-[52px]로 수정하여 헤더 밑에 붙임) */}
      <nav className="sticky top-[52px] z-50 w-full border-b border-slate-700/50 bg-slate-900/95 backdrop-blur-sm shadow-md">
        <div className="mx-auto flex max-w-screen-md items-center justify-between px-2 py-2 overflow-x-auto no-scrollbar sm:px-6">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => tab.isReady && setActiveTab(tab.id)}
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
      <main className="relative flex-1 w-full overflow-hidden">
        {TABS.map((tab) => {
          const isVisible = activeTab === tab.id;
          const IconComponent = tab.icon;

          if (tab.id === "fortune") return <FortuneTab key={tab.id} isVisible={isVisible} />;
          if (tab.id === "dream") return <DreamTab key={tab.id} isVisible={isVisible} onNavigate={setActiveTab} />;
          if (tab.id === "saju") return <SajuTab key={tab.id} isVisible={isVisible} />;
          if (tab.id === "altar") return <AltarTab key={tab.id} isVisible={isVisible} />;
          if (tab.id === "lotto") return <LottoTab key={tab.id} isVisible={isVisible} />;

          return (
            <div
              key={tab.id}
              role="tabpanel"
              aria-hidden={!isVisible}
              className={`
                absolute inset-0 flex flex-col items-center justify-center gap-8 px-6
                transition-opacity duration-500 ease-out
                ${isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}
              `}
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
    </div>
  );
}
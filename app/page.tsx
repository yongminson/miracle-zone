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
  Bell, // 🚀 종 아이콘 추가
  type LucideIcon,
} from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 🚀 [추가] 관리자 전용 통계 대시보드 컴포넌트
function AdminDashboard() {
  const [stats, setStats] = useState({ daily: 0, total: 0 });
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("MASTER_ADMIN") === "true") {
      setIsAdmin(true);
      const fetchStats = async () => {
        // 🚀 visitors 테이블에서 전체 데이터를 가져옴
        const { data, error } = await supabase.from("visitors").select("visit_date, visit_count");
        
        if (error) {
          console.error("데이터 로딩 실패:", error.message);
          return;
        }

        if (data) {
          const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
          let total = 0; 
          let daily = 0;
          
          data.forEach(row => {
            total += (row.visit_count || 0);
            if (row.visit_date === todayStr) daily = (row.visit_count || 0);
          });
          
          setStats({ daily, total });
        }
      };
      fetchStats();
    }
  }, []);

  if (!isAdmin) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[100] bg-slate-900/90 border border-yellow-500/50 p-5 rounded-2xl backdrop-blur-md shadow-[0_0_30px_rgba(234,179,8,0.2)]">
      <h3 className="text-yellow-400 font-bold text-sm mb-3 flex items-center gap-2">
        <span>👑</span> 명운(命運) 운영 현황
      </h3>
      <div className="space-y-2">
        <p className="text-white/80 text-xs flex justify-between gap-6">
          <span>오늘 방문자:</span> <span className="text-yellow-300 font-bold">{stats.daily.toLocaleString()}명</span>
        </p>
        <p className="text-white/80 text-xs flex justify-between gap-6">
          <span>누적 방문자:</span> <span className="text-yellow-300 font-bold">{stats.total.toLocaleString()}명</span>
        </p>
      </div>
      <div className="mt-4 pt-3 border-t border-white/10 text-center">
        <button onClick={() => { localStorage.removeItem("MASTER_ADMIN"); window.location.reload(); }} className="text-[10px] text-white/40 hover:text-white transition-colors">
          관리자 모드 종료
        </button>
      </div>
    </div>
  );
}

// 🚀 mbti와 match(궁합) 탭 추가
type TabId = "fortune" | "dream" | "lotto" | "altar" | "saju" | "mbti" | "match";

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
  { id: "saju", label: "관상/이름 풀이", icon: FileText, isReady: true },
  { id: "match", label: "소름돋는 궁합", icon: Heart, isReady: true }, 
  { id: "mbti", label: "MBTI - 심층 성격 검사", icon: Activity, isReady: true },
  { id: "dream", label: "꿈 해몽", icon: BookOpen, isReady: true },
  { id: "lotto", label: "행운의 로또", icon: Trophy, isReady: true },
  { id: "altar", label: "기적의 제단", icon: Flame, isReady: true },
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
    <div className={`mx-auto w-full max-w-md border border-white/10 bg-black/40 backdrop-blur-md rounded-2xl pt-6 pb-8 text-center space-y-3 px-4 relative z-50 shadow-xl ${tabId === "altar" ? "mt-3 mb-4" : "mt-12 mb-8"}`}>
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
  // 🚀 [추가] 광고 시청 중인지 확인하는 상태
  const [isAdWatching, setIsAdWatching] = useState(false);

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
    
    // 🚀 운영자면 광고 생략, 일반 유저면 5초 광고 시청 시뮬레이션
    if (typeof window !== "undefined" && localStorage.getItem("MASTER_ADMIN") === "true") {
      alert("✨ [운영자 프리패스] 광고 없이 즉시 리포트를 생성합니다!");
    } else {
      setIsAdWatching(true);
      await new Promise(r => setTimeout(r, 5000)); // 5초간 광고 보는 중...
      setIsAdWatching(false);
      alert("✅ 광고 시청 완료! 전문가 리포트를 생성합니다.");
    }
  
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

              {/* 🚀 SEO 확산을 위한 공유 링크 생성 버튼 */}
              {/* 🚀 SEO 확산을 위한 공유 링크 생성 버튼 (하나로 통합 완료) */}
              {resultData.db_id && (
                <button 
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/dream/${resultData.db_id}`;
                    navigator.clipboard.writeText(url);
                    alert("✨ 해몽 결과 링크가 복사되었습니다!\n블로그, 카톡, 카페 등에 공유해보세요.");
                  }} 
                  className="w-full mb-3 rounded-2xl border border-blue-500/40 bg-blue-500/10 px-4 py-4 text-sm font-bold text-blue-300 hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-2"
                >
                  🔗 이 해몽 결과 링크 복사하기 (공유용)
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
  // 🚀 [추가] 촛불 애니메이션 및 사운드 상태 (기존 432Hz BGM과 충돌하지 않음)
  const [isCandleOn, setIsCandleOn] = useState(false);
  const bellAudioRef = useRef<HTMLAudioElement | null>(null);
  const fireAudioRef = useRef<HTMLAudioElement | null>(null);
  const talismanRef = useRef<HTMLDivElement | null>(null); // 🚀 부적 카드 캡처용
  const [isPremiumGlow, setIsPremiumGlow] = useState(false); // 🚀 프리미엄 황금빛 공양 효과

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

  // 🚀 모바일 결제 후 돌아왔을 때 황금빛 프리미엄 이펙트 팡! 터뜨리기
  useEffect(() => {
    if (typeof window !== "undefined" && isVisible) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("playPremiumAnim") === "true") {
        fetchWishes(); // 🚀 결제한 소원 즉시 새로고침
        setIsCandleOn(true);
        setIsPremiumGlow(true);
        // 모바일은 자동재생이 막히므로 에러 방어코드 씌움
        try {
          if (bellAudioRef.current) { bellAudioRef.current.currentTime = 0; bellAudioRef.current.play(); }
          if (fireAudioRef.current) fireAudioRef.current.play();
        } catch(e) {}
        setTimeout(() => { setIsCandleOn(false); setIsPremiumGlow(false); if(fireAudioRef.current) fireAudioRef.current.pause(); }, 6000);
        window.history.replaceState({}, "", window.location.pathname); // 🚀 주소창 찌꺼기 완벽 청소 (새로고침 버그 완전 해결!)
      }
    }
  }, [isVisible, fetchWishes]);
  
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
  
  // 🚀 프리미엄 결제창 띄우기 함수 (포트원 검증 무시 + 완벽 프리패스 적용)
  const handlePremiumConfirm = () => {
    if (!premiumWishText.trim()) return;

    if (typeof window !== "undefined") {
      const amount = premiumPeriod === "24h" ? 1900 : 6900;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      // 🚀 1. 운영자 절대 프리패스 (가짜 결제 ID 안 쓰고, 바로 DB에 직행!)
      if (localStorage.getItem("MASTER_ADMIN") === "true") {
        alert("✨ [운영자 프리패스] 결제 없이 즉시 프리미엄 소원을 제단에 올립니다!");
        
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
      const IMP = (window as any).IMP;
      if (!IMP) {
        alert("🚨 결제 시스템 로딩 실패. 새로고침[F5] 해주세요!");
        return;
      }

      IMP.init("imp61375123"); 
      const name = premiumPeriod === "24h" ? "명운 제단 (24시간)" : "명운 제단 (10일)";
      
      const payData: any = {
        pg: "tosspayments", 
        pay_method: "card",
        merchant_uid: `mid_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        name: name,
        amount: amount,
        buyer_email: "test@ymstudio.co.kr", 
        buyer_name: "명운 사용자",
        app_scheme: "myungun", 
      };

      if (isMobile) {
        payData.m_redirect_url = window.location.origin + "?tab=altar"; // 🚀 메인 안 거치고 바로 제단 복귀
        localStorage.setItem("pendingPremiumWish", JSON.stringify({
          wishText: premiumWishText,
          period: premiumPeriod,
          nameDisplay: premiumNameDisplay,
          nameInput: premiumNameInput,
          amount: amount
        }));
      }

      IMP.request_pay(payData, async function (rsp: any) {
        const isSuccess = rsp.success || (rsp.imp_uid && !rsp.error_msg);
        if (isSuccess) {
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
              alert(`🚨 결제 검증 실패: ${verifyData.message}`);
            }
          } catch (error) {
            alert("✨ 결제는 성공했습니다!\n(다만 현재 서버 오류로 화면 반영 지연 중)");
            setShowPremiumModal(false);
          }
        } else {
          const isUserCancel = rsp.error_msg?.includes("사용자 취소") || rsp.error_code === "F1002";
          if (isUserCancel && !isMobile) alert(`결제가 취소되었습니다.\n💡 스마트폰에서 승인 후, PC 화면 결제창의 [결제 완료]를 꼭 눌러주세요!`);
          else alert(`결제 실패:\n${rsp.error_msg}`);
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
        {/* 🚀 촛불이 켜졌을 때 배경이 밝아지는 시각 효과 */}
        <div className="absolute inset-0 transition-colors duration-1000" style={{ backgroundColor: isCandleOn ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.5)' }} />
        <div className={`absolute inset-0 bg-gradient-to-t from-amber-500/30 to-transparent transition-opacity duration-1000 ${isCandleOn ? "opacity-100" : "opacity-0"}`} />
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

        {/* 🚀 초소형 압축 입력창 영역 (화면 하단 밀착 & 가로 배치 강제) */}
        <div className="relative z-10 flex w-full max-w-md flex-col items-center justify-end px-4 pb-2 mt-auto shrink-0">
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

{/* 🚀 찐 동양풍 프리미엄 소원성취 부적 UI */}
<div className="absolute left-[-9999px] top-[-9999px]">
  <div ref={talismanRef} className="relative w-[400px] h-[700px] flex flex-col items-center bg-[#ffdf99] border-[12px] border-[#d92c2c] p-6 text-center shadow-2xl" style={{ backgroundImage: "radial-gradient(#ffd57a 1px, transparent 1px)", backgroundSize: "10px 10px" }}>
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#d92c2c]/5 to-[#d92c2c]/10" />
    <div className="relative z-10 w-full h-full border-4 border-[#d92c2c] p-8 flex flex-col items-center">
      <h2 className="text-4xl font-black text-[#d92c2c] mb-8 font-serif tracking-widest" style={{ writingMode: "vertical-rl" }}>所願成就符</h2>
      <div className="w-24 h-24 mb-10 flex items-center justify-center border-2 border-[#d92c2c] rounded-full">
        <span className="text-6xl text-[#d92c2c] font-serif font-black">龘</span>
      </div>
      <div className="bg-[#d92c2c]/5 border-y-2 border-[#d92c2c]/30 py-6 px-4 w-full flex-1 flex items-center justify-center">
        <p className="text-2xl font-bold text-[#a11b1b] leading-loose break-keep whitespace-pre-wrap font-serif">
          {wishText || "간절한 소원이\n반드시 이루어집니다"}
        </p>
      </div>
      <div className="mt-8 pt-4 w-full text-[#d92c2c] font-black tracking-widest flex justify-between items-center px-4">
        <span className="text-sm">명운(命運)</span>
        <span className="text-sm">기적의 제단</span>
      </div>
    </div>
  </div>
</div>

</div>

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

  // 🚀 모바일 결제 복귀 시 1:1 데이터 매칭 복구 및 무한 결제 방지 (버그 수정 완료)
  useEffect(() => {
    if (typeof window !== "undefined" && isVisible) {
      const lastImpUid = localStorage.getItem("last_authorized_imp_uid");

      // 1️⃣ 관상 데이터 복구
      const faceSaved = localStorage.getItem("pendingFaceData");
      if (faceSaved) {
        try {
          const parsed = JSON.parse(faceSaved);
          if (parsed.faceImage) setFaceImage(parsed.faceImage);
          if (parsed.faceResultData) {
            setFaceResultData(parsed.faceResultData);
            setShowFaceResult(true);
            // 💡 결제 도장이 있으면 자물쇠 해제!
            if (lastImpUid) setIsPhysiognomyPremiumUnlocked(true);
          }
        } catch(e) {}
        localStorage.removeItem("pendingFaceData");
        setActiveSajuMode("face");
      }

      // 2️⃣ 이름풀이 데이터 복구
      const nameSaved = localStorage.getItem("pendingNameData");
      if (nameSaved) {
        try {
          const parsed = JSON.parse(nameSaved);
          if (parsed.nameInput) setNameInput(parsed.nameInput);
          if (parsed.nameHanja) setNameHanja(parsed.nameHanja);
          if (parsed.nameBirthDate) setNameBirthDate(parsed.nameBirthDate);
          if (parsed.nameBirthTime) setNameBirthTime(parsed.nameBirthTime);
          if (parsed.nameGender) setNameGender(parsed.nameGender);
          if (parsed.hanjaSelections) setHanjaSelections(parsed.hanjaSelections);
          if (parsed.nameResultData) {
            setNameResultData(parsed.nameResultData);
            setShowNameResult(true);
            // 💡 결제 도장이 있으면 자물쇠 해제!
            if (lastImpUid) setIsNamePremiumUnlocked(true);
          }
        } catch(e) {}
        localStorage.removeItem("pendingNameData");
        setActiveSajuMode("name");
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
    const IMP = (window as any).IMP;
    IMP.init("imp61375123"); 
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const amount = 4900;

    if (isMobile) {
      localStorage.setItem("pendingPaymentType", "physiognomy");
      localStorage.setItem("pendingPaymentAmount", String(amount));
      // 💡 현재 사진 상태를 함께 저장
      localStorage.setItem("pendingFaceData", JSON.stringify({ faceImage, faceResultData }));
    } else {
      // PC의 경우 성공 콜백에서 즉시 해제
    }

    IMP.request_pay({
      pg: "tosspayments",
      pay_method: "card",
      merchant_uid: `face_${Date.now()}`,
      name: "심층 관상 분석",
      amount: amount,
      m_redirect_url: isMobile ? window.location.href : undefined,
      app_scheme: "myungun"
    }, (rsp: any) => {
      if (rsp.success || (rsp.imp_uid && !rsp.error_msg)) {
        setIsPhysiognomyPremiumUnlocked(true);
        setShowPhysiognomyPaymentModal(false);
      }
    });
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
      alert("✨ [운영자 프리패스] 결제 없이 즉시 심층 이름 풀이 리포트를 확인합니다!");
      setIsNamePremiumUnlocked(true);
    } else {
      setShowNamePaymentModal(true);
    }
  };

  // 🚀 이름 풀이 프리미엄 결제 연동 (4,900원)
  const handleNamePaymentConfirm = async () => {
    if (typeof window !== "undefined") {
      const IMP = (window as any).IMP;
      if (!IMP) return alert("🚨 결제 시스템 로딩 실패.");
      IMP.init("imp61375123"); 

      const amount = 4900;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      const payData: any = {
        pg: "tosspayments", 
        pay_method: "card",
        merchant_uid: `mid_name_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        name: "심층 이름 풀이 리포트",
        amount: amount,
        buyer_email: "test@ymstudio.co.kr", 
        buyer_name: "명운 사용자",
        app_scheme: "myungun",
      };

      if (isMobile) {
        payData.m_redirect_url = window.location.href;
        localStorage.setItem("pendingPaymentType", "name");
        localStorage.setItem("pendingPaymentAmount", String(amount));
        // 🚀 이름 입력값과 분석 결과를 브라우저 창고에 보관
        localStorage.setItem("pendingNameData", JSON.stringify({
          nameInput, nameHanja, nameBirthDate, nameBirthTime, nameGender, hanjaSelections, nameResultData
        }));
      }

      IMP.request_pay(payData, async function (rsp: any) {
        const isSuccess = rsp.success || (rsp.imp_uid && !rsp.error_msg);
        if (isSuccess) {
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paymentType: "saju", imp_uid: rsp.imp_uid, merchant_uid: rsp.merchant_uid, amount: amount }),
            });
            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              setShowNamePaymentModal(false);
              setIsNamePremiumUnlocked(true);
            } else {
              alert(`🚨 결제 검증 실패: ${verifyData.message}`);
            }
          } catch (error) {
            alert("서버 오류가 발생했습니다.");
          }
        } else {
          const isUserCancel = rsp.error_msg?.includes("사용자 취소") || rsp.error_code === "F1002";
          if (isUserCancel && !isMobile) alert(`결제가 취소되었습니다.\n💡 PC 화면 결제창의 [결제 완료] 버튼을 눌러주세요!`);
          else alert(`결제 실패: ${rsp.error_msg}`);
        }
      });
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
  
  // 🚀 유저 정보 및 DB 잔여 횟수 상태 추가
  const [user, setUser] = useState<any>(null);
  const [premiumCount, setPremiumCount] = useState(0);

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

  // 무료 횟수 로컬 스토리지 관리 (기존 동일)
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

  // 매트릭스 애니메이션 효과 (기존 동일)
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
    setIsDrawing(true);
    setVisibleCount(0);
    const numbers = generateLottoNumbers();
    setLottoHistory((prev) => [numbers, ...prev]);
    setFreeCount((c) => c - 1);
    numbers.forEach((_, i) => { setTimeout(() => setVisibleCount((v) => v + 1), i * 450); });
    setTimeout(() => setIsDrawing(false), numbers.length * 450 + 100);
  };

  // 🚀 10회권 묶음 결제 진행 함수
  const handleLottoPaymentConfirm = async () => {
    if (!user) return alert("로그인 정보가 없습니다.");
    
    if (typeof window !== "undefined") {
      const IMP = (window as any).IMP;
      if (!IMP) return alert("🚨 결제 시스템 로딩 실패.");
      IMP.init("imp61375123"); 

      const amount = 4500; // 10회권 가격
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      const payData: any = {
        pg: "tosspayments", 
        pay_method: "card",
        merchant_uid: `mid_lotto_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        name: "고급 통계 로또 추천 10회 이용권",
        amount: amount,
        buyer_email: user.email || "test@ymstudio.co.kr", 
        buyer_name: user.user_metadata?.name || "명운 사용자",
        app_scheme: "myungun",
      };

      if (isMobile) {
        payData.m_redirect_url = window.location.href;
        localStorage.removeItem("pendingPremiumWish"); // 🚀 엉뚱한 결제(제단) 플래그 찌꺼기 제거
        localStorage.setItem("pendingPaymentType", "lotto");
        localStorage.setItem("pendingPaymentAmount", String(amount));
        localStorage.setItem("pendingPaymentUserId", user.id); // 서버 DB 기록을 위해 유저ID 저장
      }

      IMP.request_pay(payData, async function (rsp: any) {
        const isSuccess = rsp.success || (rsp.imp_uid && !rsp.error_msg);
        if (isSuccess) {
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                paymentType: "lotto",
                imp_uid: rsp.imp_uid,
                merchant_uid: rsp.merchant_uid,
                amount: amount,
                userId: user.id // 서버로 유저ID 전송
              }),
            });
            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              setShowLottoPaymentModal(false);
              alert("✨ 결제 성공! 로또 10회 이용권이 충전되었습니다.");
              // 충전 후 DB 다시 읽기
              const { data } = await supabase.from('profiles').select('premium_lotto_count').eq('id', user.id).single();
              if (data) setPremiumCount(data.premium_lotto_count);
            } else {
              alert(`🚨 결제 검증 실패: ${verifyData.message}`);
            }
          } catch (error) {
            console.error("결제 검증 오류:", error);
            alert("서버 오류가 발생했습니다.");
          }
        } else {
          const isUserCancel = rsp.error_msg?.includes("사용자 취소") || rsp.error_code === "F1002";
          if (isUserCancel && !isMobile) alert(`결제가 취소되었습니다.\n💡 PC 화면 결제창의 [결제 완료] 버튼을 눌러주세요!`);
          else alert(`결제 실패: ${rsp.error_msg}`);
        }
      });
    }
  };

  // 🚀 버튼 클릭 컨트롤러 (잔여 횟수가 있으면 바로 생성, 없으면 결제창)
  const handlePremiumClick = () => {
    if (isDrawing) return;

    // 1️⃣ 운영자 절대 프리패스 (로그인 무시, 결제 무시하고 즉시 추출!)
    if (typeof window !== "undefined" && localStorage.getItem("MASTER_ADMIN") === "true") {
      alert("✨ [운영자 프리패스] 결제 없이 즉시 고급 통계 번호를 추출합니다!");
      executeLottoDraw(false); // 💡 결제 함수 대신 즉시 실행 함수 호출
      return;
    }

    // 2️⃣ 일반 유저 로직
    if (!user) {
      alert("이용권 충전 및 저장을 위해 우측 상단의 카카오 로그인을 먼저 진행해주세요!");
      return;
    }
    
    if (premiumCount > 0) {
      // 횟수가 남았으니 1회 차감하고 생성!
      executeLottoDraw(true);
    } else {
      // 횟수가 없으면 결제 모달 띄우기
      setShowLottoPaymentModal(true);
    }
  };

  // 🚀 실제 고급 통계 로또 번호 추출
  const executeLottoDraw = async (usePremium: boolean = false) => {
    if (usePremium && user) {
      // DB에서 1회 차감 
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
      const [res] = await Promise.all([
        fetch("/api/lotto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }),
        new Promise<void>((r) => setTimeout(r, 2800)),
      ]);
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

  const currentSet = lottoHistory[0] ?? [];
  const displayHistory = lottoHistory.slice(0, 5);

  return (
    <div
      role="tabpanel"
      aria-hidden={!isVisible}
      className={`absolute inset-0 flex flex-col overflow-y-auto overflow-x-hidden transition-opacity duration-500 ease-out ${isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <canvas ref={canvasRef} id="matrix-canvas" className="absolute inset-0 z-0 opacity-30 pointer-events-none" />

      {/* 결제 모달창 */}
      {showLottoPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && setShowLottoPaymentModal(false)}>
          <div className="w-full max-w-md rounded-2xl border border-yellow-700/50 bg-[#16120d]/95 p-6 shadow-2xl shadow-amber-900/20 backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-center text-lg font-semibold text-yellow-300">✨ 고급 통계 추천 10회권 (4,500원)</h3>
            <p className="mb-6 text-center text-sm leading-relaxed text-yellow-100/70">
              출현 빈도, 번호 분포, 구간 필터 등을 결합한 고급 통계 번호입니다.<br/>
              결제 시 계정에 10회가 충전되며 언제든 나누어 사용할 수 있습니다.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowLottoPaymentModal(false)} className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white/90 hover:bg-white/10">취소</button>
              <button type="button" onClick={handleLottoPaymentConfirm} className="flex-1 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 px-4 py-3 text-sm font-semibold text-slate-900 hover:from-yellow-400 hover:to-amber-500 shadow-lg">결제하고 충전하기</button>
            </div>
          </div>
        </div>
      )}

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

      <div className="relative z-10 flex flex-1 flex-col items-center gap-6 px-6 py-8">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full border border-yellow-700/40 bg-yellow-500/10 px-3 py-1 text-[11px] text-yellow-200 backdrop-blur-sm">이번 주 추천 조합</span>
          <span className="rounded-full border border-yellow-700/40 bg-yellow-500/10 px-3 py-1 text-[11px] text-yellow-200 backdrop-blur-sm">무료 3회 제공</span>
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

          <div className="mt-6 flex flex-col gap-4 sm:flex-row">
            <button type="button" onClick={handleFreeDraw} disabled={isDrawing} className="flex-1 rounded-xl border border-yellow-700/40 bg-[#2a2a2a] px-6 py-3 text-sm font-medium text-yellow-200 transition-all hover:bg-[#333333] disabled:opacity-50">
              일반 번호 생성 (남은 횟수: {freeCount}/3)
            </button>

            {/* 🚀 잔여 횟수에 따라 다르게 보이는 스마트 버튼 */}
            <button
              type="button"
              onClick={handlePremiumClick}
              disabled={showLottoPaymentModal || showLottoProgressModal}
              className="flex-1 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 px-6 py-3 text-sm font-bold text-slate-900 shadow-lg shadow-yellow-900/25 transition-all hover:from-yellow-400 hover:to-amber-500 disabled:opacity-50"
            >
              {premiumCount > 0 
                ? `✨ 통계 번호 추출 (잔여: ${premiumCount}회)` 
                : `✨ 고급 통계 10회권 충전 (4,500원)`}
            </button>
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

        <FooterPolicy tabId="lotto" />
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
    <div role="tabpanel" aria-hidden={!isVisible} className={`absolute inset-0 flex flex-col overflow-y-auto transition-opacity duration-500 ease-out ${isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
      <div className="fixed inset-0 z-0 bg-slate-950">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-slate-900 to-teal-900/40 opacity-80" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-8">
        
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
                    const shareData = { title: "MBTI 심층 분석", text: "나의 소름돋는 성격 분석 결과 확인하기!", url: window.location.href };
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
        <FooterPolicy tabId="mbti" as any />
      </div>
    </div>
  );
}

// 🚀 [소름돋는 궁합 컴포넌트 - 음/양력 추가 및 이름 기반 캐싱]
function MatchTab({ isVisible, onNavigate }: { isVisible: boolean, onNavigate: (id: TabId) => void }) {
  // 🚀 상태에 calendar(음양력) 추가
  const [myInfo, setMyInfo] = useState({ name: "", gender: "male", calendar: "solar", birthDate: "", birthTime: "unknown" });
  const [partnerInfo, setPartnerInfo] = useState({ name: "", gender: "female", calendar: "solar", birthDate: "", birthTime: "unknown" });
  
  const [isLoading, setIsLoading] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  
  const [isAdWatching, setIsAdWatching] = useState(false);
  const [adProgress, setAdProgress] = useState(0);

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

    setIsLoading(true);
    setResultData(null);

    if (typeof window !== "undefined" && localStorage.getItem("MASTER_ADMIN") === "true") {
      // 운영자 패스
    } else {
      setIsAdWatching(true);
      setAdProgress(0);
      for (let i = 0; i <= 100; i += 2) {
        setAdProgress(i);
        await new Promise(r => setTimeout(r, 100)); 
      }
      setIsAdWatching(false);
    }

    // 🚀 A와 B의 위치를 바꿔서 입력해도 항상 똑같은 결과가 나오도록 정렬(Sort) 마법 적용
    const myKey = `${myInfo.name}_${myInfo.gender}_${myInfo.calendar}_${myInfo.birthDate}_${myInfo.birthTime}`;
    const partnerKey = `${partnerInfo.name}_${partnerInfo.gender}_${partnerInfo.calendar}_${partnerInfo.birthDate}_${partnerInfo.birthTime}`;
    
    const sortedKeys = [myKey, partnerKey].sort(); // 알파벳 순으로 정렬해버림 (위치 무관)
    const cacheKey = `match_${sortedKeys[0]}_${sortedKeys[1]}`;
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
        body: JSON.stringify({ myInfo, partnerInfo }),
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
    <div role="tabpanel" aria-hidden={!isVisible} className={`absolute inset-0 flex flex-col overflow-y-auto transition-opacity duration-500 ease-out ${isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
      <div className="fixed inset-0 z-0 bg-slate-950">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-900/40 via-slate-900 to-orange-900/40 opacity-80" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center px-4 py-8">
        
        {!isLoading && !resultData && (
          <form onSubmit={handleMatchAnalyze} className="w-full max-w-md animate-fade-in-up">
            <div className="text-center mb-8">
              <span className="inline-block px-3 py-1 mb-3 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 text-xs font-bold tracking-widest">CHEMISTRY TEST</span>
              <h2 className="text-3xl font-extrabold text-white mb-2 drop-shadow-lg">소름돋는 궁합</h2>
              <p className="text-sm text-white/70">나와 그 사람의 타고난 기운은 얼마나 잘 맞을까?</p>
            </div>

            <div className="space-y-6">
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
                ✨ 광고 보고 상세 궁합 보기
              </button>
            </div>
          </form>
        )}

        {isLoading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 mt-10 w-full max-w-md">
            {isAdWatching ? (
              <div className="w-full bg-slate-900/80 p-8 rounded-3xl border border-white/10 text-center animate-fade-in-up shadow-2xl">
                <p className="text-sm font-bold text-orange-400 mb-2">스폰서 메시지</p>
                <h3 className="text-xl font-extrabold text-white mb-6">광고 시청 후 결과가 공개됩니다</h3>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-gradient-to-r from-rose-500 to-orange-500 transition-all duration-100 ease-linear" style={{ width: `${adProgress}%` }} />
                </div>
                <p className="text-xs text-white/50">{adProgress}% 완료</p>
              </div>
            ) : (
              <>
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-24 h-24 bg-rose-500/20 rounded-full animate-ping" />
                  <Heart className="w-12 h-12 text-rose-500 animate-pulse drop-shadow-[0_0_15px_rgba(244,63,94,0.8)]" fill="currentColor" />
                </div>
                <div className="text-center">
                  <p className="text-rose-300 font-bold tracking-wide">사주와 이름의 기운을 교차 분석 중입니다...</p>
                  <p className="text-xs text-white/50 mt-2">사주 명식 대조 및 성명학 오행 보완성 계산</p>
                </div>
              </>
            )}
          </div>
        )}

        {resultData && !isLoading && (
          <div id="match-capture-area" className="w-full max-w-md animate-fade-in-up pb-6">
            <div className="rounded-3xl border border-rose-500/30 bg-slate-900/90 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
              
              <div className="text-center border-b border-white/10 pb-6 mb-6">
                <div className="flex justify-center items-center gap-4 mb-4">
                  <span className="text-lg font-bold text-rose-300">{myInfo.name}</span>
                  <Heart className="w-5 h-5 text-rose-500 animate-pulse" fill="currentColor" />
                  <span className="text-lg font-bold text-orange-300">{partnerInfo.name}</span>
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
                
                <h3 className="text-xl font-bold text-white mt-4">{resultData.title}</h3>
                <p className="text-sm text-white/70 mt-2">{resultData.summary}</p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                  <h4 className="text-sm font-bold text-rose-400 mb-2">🔍 상세 궁합 풀이</h4>
                  <p className="text-sm text-white/85 leading-relaxed">{resultData.details}</p>
                </div>

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
        <FooterPolicy tabId="match" as any />
      </div>
    </div>
  );
}

export default function Home() {
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

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetTab = urlParams.get("tab") as TabId;
    if (targetTab) setActiveTab(targetTab);
  }, []);

  // 🚀 모바일 결제 결과 처리 (로또 10회권 충전 로직 포함)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    
    const impUid = urlParams.get("imp_uid");
    const errorMsg = urlParams.get("error_msg") || urlParams.get("message");
    const isSuccess = urlParams.get("imp_success") === "true" || urlParams.get("success") === "true" || (impUid && !errorMsg);

    if (impUid) {
      const pendingType = localStorage.getItem("pendingPaymentType");

      if (isSuccess) {
        // 1️⃣ 기적의 제단
        if (localStorage.getItem("pendingPremiumWish")) {
          const wishData = JSON.parse(localStorage.getItem("pendingPremiumWish")!);
          fetch("/api/payments/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentType: "altar", imp_uid: impUid, amount: wishData.amount, wishText: wishData.wishText, period: wishData.period, nameDisplay: wishData.nameDisplay, nameInput: wishData.nameInput }) })
            .then(() => {
              alert("✨ 특별 공양 등록 완료!");
              localStorage.removeItem("pendingPremiumWish");
              // 🚀 애니메이션 재생 파라미터 쏴주기
              window.history.replaceState({}, "", window.location.pathname + "?tab=altar&playPremiumAnim=true");
              setActiveTab("altar");
            });
        } 
        // 2️⃣ 행운의 로또 10회권
        else if (pendingType === "lotto") {
          fetch("/api/payments/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentType: "lotto", imp_uid: impUid, amount: localStorage.getItem("pendingPaymentAmount"), userId: localStorage.getItem("pendingPaymentUserId") }) })
            .then(() => {
              alert("✨ 결제 성공! 고급 통계 로또 10회 이용권이 충전되었습니다.");
              localStorage.removeItem("pendingPaymentType");
              localStorage.removeItem("pendingPaymentAmount");
              localStorage.removeItem("pendingPaymentUserId");
              window.history.replaceState({}, "", window.location.pathname);
              setActiveTab("lotto");
            });
        }
        // 3️⃣ 관상 / 이름 풀이
        else if (pendingType === "physiognomy" || pendingType === "name") {
          fetch("/api/payments/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentType: "saju", imp_uid: impUid, amount: localStorage.getItem("pendingPaymentAmount") }) })
            .then(() => {
              alert("✨ 결제가 완료되었습니다. 결과를 확인하세요!");
              localStorage.setItem("last_authorized_imp_uid", impUid); 
              localStorage.removeItem("pendingPaymentType");
              window.history.replaceState({}, "", window.location.pathname);
              setActiveTab("saju");
            });
        }
      } else {
        alert(`결제 실패: ${errorMsg || "사용자 취소"}`);
        window.history.replaceState({}, "", window.location.pathname);
      }
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
      {/* 🚀 [추가] 관리자 모드일 때만 나타나는 통계 대시보드 */}
      <AdminDashboard />

      {/* 🚀 최상단 헤더 (앱 로고 & 카카오 로그인 버튼 & 알림 버튼) */}
      <header className="sticky top-0 z-[60] w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="명운 로고" className="w-9 h-9 object-contain" />
          <span className="text-yellow-400 font-bold tracking-widest text-sm">명운(命運)</span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 🚀 푸시 알림 구독 버튼 */}
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
            className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-yellow-400 hover:bg-slate-700 transition-colors shadow-lg border border-yellow-500/20"
            title="매일 운세 알림 받기"
          >
            <Bell className="w-4 h-4 animate-bounce" />
          </button>

          {/* 🚀 카카오 로그인 상태 */}
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
                  카카오 로그인
                </button>
              )
            )}
          </div>
        </div>
      </header>

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
      <main className="relative flex-1 w-full overflow-hidden">
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
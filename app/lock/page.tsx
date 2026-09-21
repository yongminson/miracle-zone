"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import {
  LOCK_TIERS,
  SILVER,
  WALL,
  createDemoLocks,
  layoutLocks,
  railYs,
  wallSize,
  type WallLock,
} from "@/lib/locks/wall-locks";
import { supabase } from "@/app/lib/supabase";
import { extractPaymentReturnId } from "@/lib/payments/return-params";
import {
  LockComposer,
  clearLockDraft,
  readLockDraft,
  toWallLock,
  type LockDraft,
} from "@/components/locks/LockComposer";
import "./lock.css";

const MY_LOCKS_KEY = "myeongun_my_locks_v1";
const OWNER_KEY = "myeongun_lock_owner_v1";
const MIN_SCALE = 0.35;
const MAX_SCALE = 3.2;
const READ_SCALE = 2.2;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/** 벽이 화면 밖으로 완전히 빠져나가지 않게 이동값을 가둔다 */
function clampTranslate(value: number, viewSize: number, contentSize: number) {
  if (contentSize <= viewSize) return (viewSize - contentSize) / 2;
  return clamp(value, viewSize - contentSize, 0);
}

/** 자물쇠 3D 메탈 렌더링. 난간을 감싸는 고리와 금속 광택, 등급별 시각 디테일 */
function LockIcon({
  color,
  shine,
  mine,
  isBasic,
}: {
  color: string;
  shine: boolean;
  mine: boolean;
  isBasic?: boolean;
}) {
  const bodyColor = isBasic ? SILVER : color;

  return (
    <svg width="36" height="48" viewBox="0 0 36 48" aria-hidden className="overflow-visible">
      {/* 반짝이 등급: 은은하게 맥박치는 별빛 아우라 */}
      {shine ? (
        <circle
          cx="18"
          cy="28"
          r="19"
          fill={bodyColor}
          className="animate-lock-shine-aura"
          opacity="0.35"
          style={{ filter: "blur(6px)" }}
        />
      ) : null}

      {/* 내 자물쇠: 황금빛 결속 헤일로 링 */}
      {mine ? (
        <g className="animate-lock-mine-ring">
          <rect
            x="2"
            y="13"
            width="32"
            height="32"
            rx="8"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="1.6"
            strokeDasharray="4 3"
          />
          {/* 상단 골드 표식 뱃지 */}
          <circle cx="18" cy="2.5" r="3" fill="#f59e0b" stroke="#fef08a" strokeWidth="0.8" />
          <polygon
            points="18,1 18.5,2.2 19.8,2.4 18.8,3.3 19.1,4.6 18,3.9 16.9,4.6 17.2,3.3 16.2,2.4 17.5,2.2"
            fill="#ffffff"
          />
        </g>
      ) : null}

      {/* U자형 스틸 고리 (Shackle) */}
      <path
        d="M11.5 19 V11 C11.5 7.4 14.4 4.5 18 4.5 C21.6 4.5 24.5 7.4 24.5 11 V19"
        fill="none"
        stroke="url(#lock-shackle-metal)"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      {/* 고리 내부 음영 */}
      <path
        d="M12.5 19 V11 C12.5 8 15 5.5 18 5.5 C21 5.5 23.5 8 23.5 11 V19"
        fill="none"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* 고리가 본체로 들어가는 결합 칼라(Grommets) */}
      <rect x="9.5" y="16.5" width="4" height="2.5" rx="0.8" fill="#475569" stroke="#1e293b" strokeWidth="0.6" />
      <rect x="22.5" y="16.5" width="4" height="2.5" rx="0.8" fill="#475569" stroke="#1e293b" strokeWidth="0.6" />

      {/* 자물쇠 본체 (Body) */}
      <rect
        x="5.5"
        y="17"
        width="25"
        height="24"
        rx="5"
        fill={bodyColor}
        stroke="rgba(0,0,0,0.4)"
        strokeWidth="0.8"
      />

      {/* 금속 질감 광택 오버레이 */}
      <rect x="5.5" y="17" width="25" height="24" rx="5" fill="url(#lock-gloss-overlay)" />

      {/* 상부 빛 반사 하이라이트 밴드 */}
      <rect x="6.5" y="18" width="23" height="9" rx="4" fill="url(#lock-specular-band)" opacity="0.6" />

      {/* 본체 내부 테두리 베벨 하이라이트 (빛받는 좌상단) */}
      <rect x="6.5" y="18" width="23" height="22" rx="4.2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.7" />

      {/* 열쇠구멍 플레이트 & 홀 (Keyhole) */}
      <circle cx="18" cy="28.5" r="3.6" fill="rgba(0,0,0,0.35)" />
      <circle cx="18" cy="27.5" r="2.2" fill="#0f172a" />
      <path d="M17.1 27.5 L18.9 27.5 L19.4 32.5 L16.6 32.5 Z" fill="#0f172a" />
      <circle cx="18" cy="27.2" r="1" fill="#1e293b" opacity="0.7" />

      {/* 모서리 리벳 장식 */}
      <circle cx="8.5" cy="20" r="0.7" fill="rgba(0,0,0,0.4)" />
      <circle cx="27.5" cy="20" r="0.7" fill="rgba(0,0,0,0.4)" />
      <circle cx="8.5" cy="38" r="0.7" fill="rgba(0,0,0,0.4)" />
      <circle cx="27.5" cy="38" r="0.7" fill="rgba(0,0,0,0.4)" />

      {/* 반짝이 등급: 어깨선 4점 별빛 글린트 */}
      {shine ? (
        <g className="animate-lock-glint" transform="translate(26, 12)">
          <path d="M0 -5 L1 -1 L5 0 L1 1 L0 5 L-1 1 L-5 0 L-1 -1 Z" fill="#ffffff" />
          <circle cx="0" cy="0" r="1.3" fill="#ffffff" />
        </g>
      ) : null}
    </svg>
  );
}

export default function LockWallPage() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [myIds, setMyIds] = useState<string[]>([]);
  const [locks, setLocks] = useState<WallLock[]>([]);
  const [usingDemo, setUsingDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isApp, setIsApp] = useState(false);
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);

  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null);
  const hasFittedRef = useRef(false);
  const userMovedRef = useRef(false);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);

  /** 실제로 걸린 자물쇠를 읽어온다. 아직 하나도 없으면 예시로 벽을 채운다 */
  const loadLocks = useCallback(async () => {
    const { data, error } = await supabase
      .from("locks_public")
      .select("id,tier,color,display_name,wish,created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error || !data || data.length === 0) {
      setLocks(createDemoLocks());
      setUsingDemo(true);
      return;
    }
    setLocks(data.map(toWallLock));
    setUsingDemo(false);
  }, []);

  useEffect(() => {
    setIsApp(typeof navigator !== "undefined" && navigator.userAgent.includes("MyeongunApp"));
    try {
      const raw = localStorage.getItem(MY_LOCKS_KEY);
      if (raw) setMyIds(JSON.parse(raw) as string[]);
    } catch {
      // 저장소가 막혀 있으면 내 자물쇠 표시만 없다
    }
    void loadLocks();
  }, [loadLocks]);

  const placed = useMemo(() => {
    const mine = new Set(myIds);
    return layoutLocks(locks.map((l) => ({ ...l, mine: mine.has(l.id) })));
  }, [locks, myIds]);

  const selectedLock = useMemo(() => placed.find((l) => l.id === selected) ?? null, [placed, selected]);
  const size = useMemo(() => wallSize(locks.length), [locks.length]);

  /** 벽 위의 한 점을 화면 가운데로 가져온다 */
  const focusOn = useCallback((wx: number, wy: number, nextScale: number) => {
    const el = viewportRef.current;
    if (!el) return;
    const s = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    setScale(s);
    setTx(clampTranslate(el.clientWidth / 2 - wx * s, el.clientWidth, size.width * s));
    setTy(clampTranslate(el.clientHeight / 2 - wy * s, el.clientHeight, size.height * s));
  }, [size]);

  const fitAll = useCallback(() => {
    const el = viewportRef.current;
    // 첫 그리기 직후에는 폭이 아직 0이라, 그때 맞추면 벽이 화면 밖으로 나간다
    if (!el || el.clientWidth === 0 || el.clientHeight === 0) return;
    const s = clamp(
      Math.min(el.clientWidth / size.width, el.clientHeight / size.height),
      MIN_SCALE,
      MAX_SCALE,
    );
    setScale(s);
    setTx((el.clientWidth - size.width * s) / 2);
    setTy((el.clientHeight - size.height * s) / 2);
  }, [size]);

  /** 화면 크기가 실제로 잡힌 뒤에 한 번 맞춘다 */
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    fitAll();
    const observer = new ResizeObserver(() => {
      if (hasFittedRef.current) return;
      if (el.clientWidth === 0 || el.clientHeight === 0) return;
      hasFittedRef.current = true;
      fitAll();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fitAll]);

  /** 걸린 자물쇠가 늘어 벽이 커지면, 아직 직접 움직이기 전일 때만 다시 맞춘다 */
  useEffect(() => {
    if (!userMovedRef.current) fitAll();
  }, [fitAll]);

  const zoomAt = useCallback(
    (clientX: number, clientY: number, nextScale: number) => {
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const s = clamp(nextScale, MIN_SCALE, MAX_SCALE);
      // 가리키던 벽 위의 점이 그대로 그 자리에 남도록 이동값을 다시 계산한다
      setTx(clampTranslate(px - ((px - tx) / scale) * s, el.clientWidth, size.width * s));
      setTy(clampTranslate(py - ((py - ty) / scale) * s, el.clientHeight, size.height * s));
      setScale(s);
    },
    [scale, size, tx, ty],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchRef.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale };
      dragRef.current = null;
      return;
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    userMovedRef.current = true;
    dragRef.current = { x: e.clientX, y: e.clientY, tx, ty, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [a, b] = [...pointersRef.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinchRef.current.scale * (dist / pinchRef.current.dist));
      return;
    }

    const d = dragRef.current;
    const el = viewportRef.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true;
    setTx(clampTranslate(d.tx + dx, el.clientWidth, size.width * scale));
    setTy(clampTranslate(d.ty + dy, el.clientHeight, size.height * scale));
  };

  const endPointer = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
  };

  /** 빈 곳을 누르면 그 지점을 확대한다 */
  const onWallClick = (e: React.MouseEvent) => {
    if (dragRef.current?.moved) return;
    if (scale >= READ_SCALE) return;
    zoomAt(e.clientX, e.clientY, READ_SCALE);
  };

  const findMine = () => {
    const mine = placed.find((l) => l.mine);
    if (!mine) return;
    focusOn(mine.x, mine.y, READ_SCALE);
    setSelected(mine.id);
  };

  /** 로그인했으면 계정에 묶인 자물쇠 id를 서버에서 받아 온다(기기가 바뀌어도 찾게) */
  const syncMyLocksFromAccount = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    try {
      const res = await fetch("/api/locks/mine", { headers: { Authorization: `Bearer ${token}` } });
      const json = (await res.json()) as { success?: boolean; ids?: string[] };
      if (!json.success || !json.ids?.length) return;
      setMyIds((prev) => {
        const merged = [...new Set([...prev, ...json.ids!])];
        try {
          localStorage.setItem(MY_LOCKS_KEY, JSON.stringify(merged));
        } catch {
          // 저장 실패해도 이번 화면에서는 보인다
        }
        return merged;
      });
    } catch {
      // 목록을 못 받아도 이 기기에 저장된 자물쇠는 그대로 보인다
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const apply = (session: { user?: { id: string; user_metadata?: Record<string, unknown> } } | null) => {
      if (!alive) return;
      const u = session?.user;
      setUser(
        u
          ? {
              id: u.id,
              name:
                (typeof u.user_metadata?.name === "string" && u.user_metadata.name) ||
                (typeof u.user_metadata?.full_name === "string" && u.user_metadata.full_name) ||
                "회원",
            }
          : null,
      );
      if (u) void syncMyLocksFromAccount();
    };

    void supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => apply(session));
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [syncMyLocksFromAccount]);

  const handleKakaoLogin = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        scopes: "profile_nickname profile_image",
        redirectTo: `${window.location.origin}/lock`,
      },
    });
  }, []);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const rememberMyLock = useCallback((id: string) => {
    setMyIds((prev) => {
      const next = [...prev, id];
      try {
        localStorage.setItem(MY_LOCKS_KEY, JSON.stringify(next));
      } catch {
        // 저장에 실패해도 이번 화면에서는 보인다
      }
      return next;
    });
  }, []);

  /** 결제가 확인된 뒤 서버에 자물쇠를 등록한다 */
  const registerLock = useCallback(
    async (params: {
      paymentId: string;
      merchantUid: string | null;
      purchaseToken?: string;
      platform?: "web" | "app";
      draft: LockDraft;
    }) => {
      setBusy(true);
      setNotice(null);
      try {
        // 로그인했으면 계정을 소유자로 쓴다. 그래야 기기를 바꿔도 내 자물쇠를 찾는다
        let ownerKey = user?.id ?? "";
        if (!ownerKey) {
          try {
            ownerKey = localStorage.getItem(OWNER_KEY) ?? "";
            if (!ownerKey) {
              ownerKey = crypto.randomUUID();
              localStorage.setItem(OWNER_KEY, ownerKey);
            }
          } catch {
            ownerKey = `tmp-${Date.now().toString(36)}`;
          }
        }

        const res = await fetch("/api/locks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId: params.paymentId,
            merchant_uid: params.merchantUid,
            purchaseToken: params.purchaseToken,
            tier: params.draft.tier,
            color: params.draft.color,
            displayName: params.draft.displayName,
            wish: params.draft.wish,
            ownerKey,
            userId: user?.id ?? null,
            platform: params.platform ?? "web",
          }),
        });
        const json = (await res.json()) as { success?: boolean; message?: string; lock?: { id: string } };

        if (!res.ok || !json.success || !json.lock) {
          setNotice(json.message || "자물쇠를 걸지 못했습니다. 고객센터에 문의해 주세요.");
          return;
        }

        clearLockDraft();
        rememberMyLock(json.lock.id);
        await loadLocks();
        setSelected(json.lock.id);
        setNotice("자물쇠를 걸었습니다. 이제 사라지지 않습니다.");
      } catch {
        setNotice("자물쇠를 거는 중 오류가 발생했습니다. 결제가 되었다면 고객센터에 문의해 주세요.");
      } finally {
        setBusy(false);
      }
    },
    [loadLocks, rememberMyLock, user],
  );

  /** 모바일은 결제창으로 이동했다 돌아오므로, 주소에 남은 결제 식별자로 마무리한다 */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const returnId = extractPaymentReturnId(params);
    if (!returnId) return;
    const draft = readLockDraft();
    window.history.replaceState({}, "", window.location.pathname);
    if (!draft) return;
    void registerLock({ paymentId: returnId, merchantUid: null, draft });
  }, [registerLock]);

  /** +, − 버튼은 화면 한가운데를 기준으로 확대·축소한다 */
  const rectCenter = () => {
    const r = viewportRef.current?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 0, y: 0 };
  };

  const mineCount = placed.filter((l) => l.mine).length;

  // 난간 기둥(포스트) 위치 계산 (4열마다 배치)
  const postSlots = useMemo(() => {
    const cols = Math.min(Math.max(locks.length, 1), WALL.cols);
    const slots: number[] = [];
    for (let c = 0; c <= cols; c += 4) {
      slots.push(c);
    }
    return slots;
  }, [locks.length]);

  return (
    <div className="flex min-h-screen flex-col bg-[#070a12] text-slate-100">
      <SiteHeader variant="marketing" />

      {/* SVG 그라데이션 및 필터 전역 정의 (1회 로드) */}
      <svg className="absolute h-0 w-0 pointer-events-none" aria-hidden>
        <defs>
          <linearGradient id="lock-shackle-metal" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="25%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#f8fafc" />
            <stop offset="75%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <linearGradient id="lock-gloss-overlay" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.38" />
            <stop offset="25%" stopColor="#ffffff" stopOpacity="0.1" />
            <stop offset="60%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
          </linearGradient>
          <linearGradient id="lock-specular-band" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* 상단 페이지 소개 */}
      <div className="mx-auto w-full max-w-5xl px-4 pt-4 sm:pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-500/15 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <h1 className="font-serif text-lg font-bold tracking-tight text-amber-200 sm:text-xl">소원 자물쇠</h1>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            {usingDemo ? "준비 중 · 예시" : `영원히 걸린 자물쇠 ${locks.length}개`}
          </span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400 sm:text-[13px]">
          한 번 걸면 영원히 사라지지 않습니다. 난간을 끌어 움직이고, 자물쇠를 누르면 소원을 읽을 수 있습니다.
        </p>

        {/* 로그인하면 기기를 바꿔도 내 자물쇠를 찾을 수 있다 */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2">
          {user ? (
            <>
              <span className="text-[11px] text-slate-300">
                <strong className="text-amber-200">{user.name}</strong> 님으로 로그인됨 · 어느 기기에서든 내 자물쇠를 찾을 수 있습니다
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="ml-auto text-[11px] text-white/35 transition hover:text-white/70"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <span className="min-w-0 flex-1 text-[11px] leading-relaxed text-slate-400">
                로그인하지 않으면 이 기기에서만 내 자물쇠를 찾을 수 있습니다.
              </span>
              <button
                type="button"
                onClick={handleKakaoLogin}
                className="shrink-0 rounded-lg bg-[#FEE500] px-3 py-1.5 text-[11px] font-bold text-black transition hover:brightness-95 active:scale-95"
              >
                카카오로 로그인
              </button>
            </>
          )}
        </div>
      </div>

      {/* 자물쇠 벽 뷰포트 영역 */}
      <div className="relative mx-auto mt-3.5 w-full max-w-5xl flex-1 px-4 pb-4">
        <div
          ref={viewportRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onClick={onWallClick}
          className="relative h-[62vh] min-h-[400px] w-full touch-none overflow-hidden rounded-2xl border border-amber-500/20 bg-[radial-gradient(ellipse_at_50%_0%,#141c2e_0%,#090d18_60%,#040508_100%)] shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_0_80px_rgba(0,0,0,0.8)]"
          style={{ cursor: "grab" }}
        >
          {/* 밤하늘 별빛 및 원경 분위기 조명 (뷰포트 고정) */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {/* 하단 안개 & 원경 도시 야경 반사광 */}
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-amber-500/[0.04] via-indigo-950/20 to-transparent" />
            {/* 정적 밤하늘 별빛 요소들 */}
            <div className="absolute left-[12%] top-[18%] h-1 w-1 rounded-full bg-amber-200/50 animate-lock-twinkle" />
            <div className="absolute left-[38%] top-[12%] h-1.5 w-1.5 rounded-full bg-white/60 animate-lock-twinkle" style={{ animationDelay: "1s" }} />
            <div className="absolute left-[64%] top-[22%] h-1 w-1 rounded-full bg-blue-200/50 animate-lock-twinkle" style={{ animationDelay: "2s" }} />
            <div className="absolute left-[84%] top-[15%] h-1.5 w-1.5 rounded-full bg-amber-100/60 animate-lock-twinkle" style={{ animationDelay: "1.5s" }} />
            <div className="absolute left-[24%] top-[45%] h-1 w-1 rounded-full bg-white/40 animate-lock-twinkle" style={{ animationDelay: "2.5s" }} />
            <div className="absolute left-[78%] top-[40%] h-1 w-1 rounded-full bg-white/40 animate-lock-twinkle" style={{ animationDelay: "0.5s" }} />
          </div>

          {/* 스케일 및 위치 이동 컨텐츠 */}
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: size.width,
              height: size.height,
              transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            }}
          >
            {/* 난간 세로 지지 기둥 (Baluster Posts) */}
            {postSlots.map((slot) => {
              const postX = WALL.marginX + slot * WALL.slotGapX - 6;
              return (
                <div
                  key={`post-${slot}`}
                  className="absolute rounded-sm bg-gradient-to-r from-[#1e293b] via-[#475569] to-[#0f172a] shadow-lg"
                  style={{
                    left: postX,
                    top: WALL.railTopY - 10,
                    width: 12,
                    // 난간 줄 수만큼만 내려온다. 벽 바닥까지 뻗으면 자물쇠가 적을 때 기둥만 보인다
                    height: (size.rows - 1) * WALL.railGapY + 90,
                  }}
                >
                  {/* 기둥 상하 하이라이트 림 */}
                  <div className="absolute inset-y-0 left-0 w-[1px] bg-white/20" />
                  <div className="absolute inset-y-0 right-0 w-[1px] bg-black/40" />
                </div>
              );
            })}

            {/* 난간 가로 레일 및 인장 와이어 (Steel Rail & Tension Wire) */}
            {railYs(locks.length).map((y) => (
              <div key={y} className="pointer-events-none">
                {/* 상부 메인 철제 레일 바 (Heavy Steel Rail) */}
                <div
                  className="absolute rounded-full bg-gradient-to-b from-[#94a3b8] via-[#475569] to-[#1e293b] shadow-[0_5px_12px_rgba(0,0,0,0.85)]"
                  style={{ left: 36, top: y + 2, width: size.width - 72, height: 9 }}
                >
                  {/* 금속 상단 반사 하이라이트 라인 */}
                  <div className="absolute inset-x-0 top-0 h-[1.5px] rounded-full bg-white/50" />
                  {/* 하단 그림자 라인 */}
                  <div className="absolute inset-x-0 bottom-0 h-[1.5px] rounded-full bg-black/60" />
                </div>

                {/* 하부 인장 와이어 케이블 (Tension Cable) */}
                <div
                  className="absolute rounded-full bg-gradient-to-r from-slate-600 via-slate-400 to-slate-600 opacity-60 shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                  style={{ left: 40, top: y + 26, width: size.width - 80, height: 2 }}
                />
              </div>
            ))}

            {/* 자물쇠 리스트 */}
            {placed.map((lock) => (
              <button
                key={lock.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (dragRef.current?.moved) return;
                  setSelected(lock.id);
                  if (scale < READ_SCALE) focusOn(lock.x, lock.y, READ_SCALE);
                }}
                className="group absolute transition-transform active:scale-95 focus:outline-none"
                style={{
                  left: lock.x,
                  top: lock.y,
                  transform: `rotate(${lock.tilt}deg)`,
                  filter:
                    lock.tier === "shine"
                      ? `drop-shadow(0 0 10px ${lock.color}) drop-shadow(0 4px 6px rgba(0,0,0,0.7))`
                      : "drop-shadow(0 3px 5px rgba(0,0,0,0.65))",
                }}
                aria-label={lock.name ? `${lock.name}님의 자물쇠` : "자물쇠"}
              >
                <LockIcon
                  color={lock.color}
                  shine={lock.tier === "shine"}
                  mine={!!lock.mine}
                  isBasic={lock.tier === "basic"}
                />
                {scale >= 1.5 && lock.name ? (
                  <span className="mt-1 block max-w-[70px] truncate whitespace-nowrap rounded-md border border-amber-400/25 bg-black/80 px-1.5 py-0.5 text-center text-[10px] font-medium text-amber-200/90 shadow-md backdrop-blur-sm">
                    {lock.name}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {/* 플로팅 컨트롤 HUD (하단 조작 바) */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3 sm:p-4">
            <div className="pointer-events-auto flex gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fitAll();
                }}
                className="rounded-xl border border-white/15 bg-black/70 px-3.5 py-2 text-xs font-medium text-slate-200 shadow-lg backdrop-blur-md transition hover:bg-black/90 hover:text-white active:scale-95"
              >
                전체 보기
              </button>
              {mineCount > 0 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    findMine();
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-500/20 px-3.5 py-2 text-xs font-bold text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.2)] backdrop-blur-md transition hover:bg-amber-500/30 active:scale-95"
                >
                  <span className="text-amber-300">★</span>
                  <span>내 자물쇠 찾기 ({mineCount})</span>
                </button>
              ) : null}
            </div>

            <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-white/15 bg-black/70 px-1.5 py-1 shadow-lg backdrop-blur-md">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  zoomAt(rectCenter().x, rectCenter().y, scale * 0.8);
                }}
                aria-label="축소"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                −
              </button>
              <span className="w-12 text-center text-[11px] font-medium tabular-nums text-slate-300">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  zoomAt(rectCenter().x, rectCenter().y, scale * 1.25);
                }}
                aria-label="확대"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* 선택된 자물쇠 소원 카드 */}
        {selectedLock ? (
          <div className="relative mt-4 overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-b from-[#0f172a]/95 via-[#0b101f]/95 to-[#060812]/95 p-4 sm:p-5 shadow-[0_16px_40px_rgba(0,0,0,0.7)] backdrop-blur-xl">
            {/* 은은한 배경 광택 */}
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-400/25 bg-black/50 p-1 shadow-inner">
                  <LockIcon
                    color={selectedLock.color}
                    shine={selectedLock.tier === "shine"}
                    mine={!!selectedLock.mine}
                    isBasic={selectedLock.tier === "basic"}
                  />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="text-base font-bold text-amber-200">
                      {selectedLock.name ? `${selectedLock.name} 님의 소원` : "익명의 간절한 소원"}
                    </h3>
                    {selectedLock.mine ? (
                      <span className="rounded-full border border-amber-400/40 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                        내 자물쇠
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {new Date(selectedLock.createdAt).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}에 걸림 · <span className="text-amber-300/80">{LOCK_TIERS[selectedLock.tier].label}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-slate-400 transition hover:bg-white/15 hover:text-white"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            {/* 소원 본문 */}
            <div className="relative mt-3.5 rounded-xl border border-amber-500/20 bg-black/40 p-4 shadow-inner">
              <p className="whitespace-pre-wrap break-keep font-serif text-sm leading-relaxed text-slate-100 sm:text-base">
                "{selectedLock.wish}"
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5 text-[10px] text-slate-400">
                <span className="flex items-center gap-1 text-amber-300/70">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l2.4 6.6L21 11l-5.6 4.4L17 22l-5-4-5 4 1.6-6.6L3 11l6.6-2.4L12 2z" />
                  </svg>
                  영원히 보존되는 소원
                </span>
                <span className="text-slate-400">소원 자물쇠 난간</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* 알림 메시지 */}
        {notice ? (
          <div className="mt-3.5 flex items-center gap-2.5 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-950/60 to-amber-900/40 px-4 py-3 text-xs text-amber-100 shadow-lg">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-stone-950 text-[10px] font-bold">
              ✓
            </span>
            <span>{notice}</span>
          </div>
        ) : null}

        {/* 자물쇠 걸기 컴포저 */}
        <div className="mt-4">
          <LockComposer isApp={isApp} busy={busy} onPaid={(p) => registerLock(p)} />
        </div>

        {/* 하단 안내 및 링크 */}
        <div className="mt-4 flex flex-col items-center justify-between gap-2 border-t border-white/[0.06] pt-4 text-center sm:flex-row sm:text-left">
          <p className="text-[11px] leading-relaxed text-slate-400">
            {usingDemo
              ? "아직 걸린 자물쇠가 없어 예시 자물쇠를 보여주고 있습니다. 첫 자물쇠가 걸리면 실제 자물쇠만 표시됩니다."
              : "걸린 자물쇠는 영원히 지워지지 않으며 같은 자리에 보존됩니다."}
          </p>

          <Link
            href="/tools?tab=altar"
            className="inline-flex items-center gap-1 text-xs font-medium text-amber-300/80 transition hover:text-amber-200 underline underline-offset-4"
          >
            <span>기적의 제단으로 가기</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

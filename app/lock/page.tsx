"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import {
  LOCK_COLORS,
  LOCK_TIERS,
  SILVER,
  WALL,
  createDemoLocks,
  layoutLocks,
  railYs,
  type LockTier,
  type WallLock,
} from "@/lib/locks/wall-locks";

const MY_LOCKS_KEY = "myeongun_my_locks_v1";
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

/** 자물쇠 한 개. 위쪽 고리가 난간을 감싸는 모양으로 그린다 */
function LockIcon({ color, shine, mine }: { color: string; shine: boolean; mine: boolean }) {
  return (
    <svg width="34" height="46" viewBox="0 0 34 46" aria-hidden>
      <path d="M11 16V11a6 6 0 0 1 12 0v5" fill="none" stroke="#9aa1ad" strokeWidth="3.4" strokeLinecap="round" />
      <rect x="5" y="15" width="24" height="21" rx="4" fill={color} stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
      <rect x="5" y="15" width="24" height="9" rx="4" fill="rgba(255,255,255,0.22)" />
      <circle cx="17" cy="24" r="2.6" fill="rgba(0,0,0,0.45)" />
      <rect x="16" y="25" width="2" height="5" rx="1" fill="rgba(0,0,0,0.45)" />
      {shine ? <circle cx="17" cy="25" r="17" fill="none" stroke={color} strokeWidth="1" opacity="0.5" /> : null}
      {mine ? <rect x="2.5" y="12.5" width="29" height="26" rx="6" fill="none" stroke="#facc15" strokeWidth="2" /> : null}
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

  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);

  useEffect(() => {
    setLocks(createDemoLocks());
    try {
      const raw = localStorage.getItem(MY_LOCKS_KEY);
      if (raw) setMyIds(JSON.parse(raw) as string[]);
    } catch {
      // 저장소가 막혀 있으면 내 자물쇠 표시만 없다
    }
  }, []);

  const placed = useMemo(() => {
    const mine = new Set(myIds);
    return layoutLocks(locks.map((l) => ({ ...l, mine: mine.has(l.id) })));
  }, [locks, myIds]);

  const selectedLock = useMemo(() => placed.find((l) => l.id === selected) ?? null, [placed, selected]);

  /** 벽 위의 한 점을 화면 가운데로 가져온다 */
  const focusOn = useCallback((wx: number, wy: number, nextScale: number) => {
    const el = viewportRef.current;
    if (!el) return;
    const s = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    setScale(s);
    setTx(clampTranslate(el.clientWidth / 2 - wx * s, el.clientWidth, WALL.width * s));
    setTy(clampTranslate(el.clientHeight / 2 - wy * s, el.clientHeight, WALL.height * s));
  }, []);

  const fitAll = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const s = clamp(Math.min(el.clientWidth / WALL.width, el.clientHeight / WALL.height), MIN_SCALE, MAX_SCALE);
    setScale(s);
    setTx((el.clientWidth - WALL.width * s) / 2);
    setTy((el.clientHeight - WALL.height * s) / 2);
  }, []);

  useEffect(() => {
    fitAll();
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
      setTx(clampTranslate(px - ((px - tx) / scale) * s, el.clientWidth, WALL.width * s));
      setTy(clampTranslate(py - ((py - ty) / scale) * s, el.clientHeight, WALL.height * s));
      setScale(s);
    },
    [scale, tx, ty],
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
    setTx(clampTranslate(d.tx + dx, el.clientWidth, WALL.width * scale));
    setTy(clampTranslate(d.ty + dy, el.clientHeight, WALL.height * scale));
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

  /** 결제를 붙이기 전까지 느낌을 보기 위한 임시 동작 */
  const hangDemoLock = (tier: LockTier) => {
    const id = `mine-${Date.now().toString(36)}`;
    const color = tier === "basic" ? SILVER : LOCK_COLORS[Math.floor(Math.random() * LOCK_COLORS.length)].value;
    const next: WallLock = {
      id,
      tier,
      color,
      name: "나",
      wish: "미리보기로 걸어본 자물쇠입니다.",
      createdAt: new Date().toISOString(),
    };
    setLocks((prev) => [...prev, next]);
    const ids = [...myIds, id];
    setMyIds(ids);
    try {
      localStorage.setItem(MY_LOCKS_KEY, JSON.stringify(ids));
    } catch {
      // 저장에 실패해도 이번 화면에서는 보인다
    }
    const [placedNew] = layoutLocks([{ ...next, mine: true }]);
    focusOn(placedNew.x, placedNew.y, READ_SCALE);
    setSelected(id);
  };

  /** +, − 버튼은 화면 한가운데를 기준으로 확대·축소한다 */
  const rectCenter = () => {
    const r = viewportRef.current?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 0, y: 0 };
  };

  const mineCount = placed.filter((l) => l.mine).length;

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0d16] text-slate-100">
      <SiteHeader variant="marketing" />

      <div className="mx-auto w-full max-w-5xl px-4 pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-serif text-lg font-bold text-amber-300">소원 자물쇠</h1>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] text-amber-200/80">
            준비 중 · 미리보기
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          한 번 걸면 사라지지 않습니다. 벽을 끌어 움직이고, 보고 싶은 곳을 누르면 확대됩니다. 자물쇠를 누르면 소원을 읽을 수 있습니다.
        </p>
      </div>

      <div className="relative mx-auto mt-3 w-full max-w-5xl flex-1 px-4 pb-4">
        <div
          ref={viewportRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onClick={onWallClick}
          className="relative h-[62vh] min-h-[380px] w-full touch-none overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_top,#152036,#080b13_70%)]"
          style={{ cursor: "grab" }}
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: WALL.width,
              height: WALL.height,
              transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            }}
          >
            {railYs().map((y) => (
              <div
                key={y}
                className="absolute rounded-full bg-gradient-to-b from-slate-500/70 via-slate-400/50 to-slate-600/60"
                style={{ left: 40, top: y, width: WALL.width - 80, height: 7 }}
              />
            ))}

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
                className="absolute"
                style={{
                  left: lock.x,
                  top: lock.y,
                  transform: `rotate(${lock.tilt}deg)`,
                  filter:
                    lock.tier === "shine"
                      ? `drop-shadow(0 0 6px ${lock.color})`
                      : "drop-shadow(0 2px 3px rgba(0,0,0,0.5))",
                }}
                aria-label={lock.name ? `${lock.name}님의 자물쇠` : "자물쇠"}
              >
                <LockIcon
                  color={lock.tier === "basic" ? SILVER : lock.color}
                  shine={lock.tier === "shine"}
                  mine={!!lock.mine}
                />
                {scale >= 1.6 && lock.name ? (
                  <span className="mt-0.5 block whitespace-nowrap text-center text-[9px] text-white/60">{lock.name}</span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between gap-2 p-3">
            <div className="pointer-events-auto flex gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fitAll();
                }}
                className="rounded-lg border border-white/15 bg-black/60 px-3 py-1.5 text-xs text-white/80 backdrop-blur hover:bg-black/80"
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
                  className="rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-200 backdrop-blur hover:bg-amber-500/25"
                >
                  내 자물쇠 찾기 ({mineCount})
                </button>
              ) : null}
            </div>
            <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-white/15 bg-black/60 px-1 backdrop-blur">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  zoomAt(rectCenter().x, rectCenter().y, scale * 0.8);
                }}
                className="px-2.5 py-1.5 text-sm text-white/80"
              >
                −
              </button>
              <span className="w-10 text-center text-[10px] text-white/40">{Math.round(scale * 100)}%</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  zoomAt(rectCenter().x, rectCenter().y, scale * 1.25);
                }}
                className="px-2.5 py-1.5 text-sm text-white/80"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {selectedLock ? (
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <LockIcon
                  color={selectedLock.tier === "basic" ? SILVER : selectedLock.color}
                  shine={selectedLock.tier === "shine"}
                  mine={!!selectedLock.mine}
                />
                <div>
                  <p className="text-sm font-bold text-amber-200">
                    {selectedLock.name ? `${selectedLock.name} 님의 자물쇠` : "익명의 자물쇠"}
                    {selectedLock.mine ? <span className="ml-1 text-[10px] text-yellow-400">· 내 자물쇠</span> : null}
                  </p>
                  <p className="text-[10px] text-white/40">
                    {new Date(selectedLock.createdAt).toLocaleDateString("ko-KR")}에 걸림 ·{" "}
                    {LOCK_TIERS[selectedLock.tier].label}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-xs text-white/40 hover:text-white/80">
                닫기
              </button>
            </div>
            <p className="mt-3 whitespace-pre-wrap break-keep text-sm leading-relaxed text-slate-200">{selectedLock.wish}</p>
          </div>
        ) : null}

        <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-4">
          <p className="text-xs font-bold text-amber-300/90">자물쇠 걸기 (미리보기 — 결제 없음)</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {(Object.keys(LOCK_TIERS) as LockTier[]).map((tier) => {
              const t = LOCK_TIERS[tier];
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => hangDemoLock(tier)}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-3 text-left transition hover:border-amber-400/50 hover:bg-amber-500/10"
                >
                  <p className="text-sm font-bold text-slate-100">{t.label}</p>
                  <p className="text-[11px] text-amber-300/90">{t.priceWon.toLocaleString()}원</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-white/45">{t.desc}</p>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-white/35">
            지금은 화면 확인용입니다. 누르면 예시 자물쇠가 걸리고 이 기기에만 저장됩니다. 실제 결제와 보관은 다음 단계에서 붙입니다.
          </p>
          <Link href="/tools?tab=altar" className="mt-3 inline-block text-[11px] text-amber-300/70 underline underline-offset-2">
            기적의 제단으로 가기
          </Link>
        </div>
      </div>
    </div>
  );
}

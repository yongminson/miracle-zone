"use client";

import { useEffect, useState } from "react";
import { getAnalyticsDeviceId, logEvent } from "@/lib/analytics";
import { readProfiles, type SavedProfile } from "@/lib/profiles/saved-profiles";
import { BIRTHDAY_GIFT_DAYS, birthdayWindow, todayKst, upcomingBirthdays } from "@/lib/birthday/birthday";

/**
 * 생일 축하 띠 — 저장된 '본인' 프로필의 생일(당일~6일 뒤)에만 보인다.
 * 지인·가족·배우자로 저장한 생일은 대상이 아니다.
 * 선물: 기적의 제단 10일 고정 소원 1회(서버 /api/birthday-gift 가 받을 수 있는지 확인).
 */

const DISMISS_KEY = "mu_bday_banner_dismissed";

/** 저장된 프로필 중 본인(가장 최근 저장) */
export function readSelfProfile(): SavedProfile | null {
  return readProfiles().find((p) => p.relation === "self") ?? null;
}

type Status = { eligible: boolean; claimed: boolean; reason: string | null; birthday: string | null };

const APP_SYNC_KEY = "mu_bday_app_sync";
const GIFT_DEVICE_DAYS = 30; // /api/birthday-gift 의 기기 30일 조건과 같다

/**
 * 구글 앱(1.1.7~)에 '본인' 생일 날짜를 알려 생일 아침 8시 축하 알림을 예약하게 한다.
 * 하루 한 번만 보낸다. 본인 프로필이 없으면 빈 목록을 보내 예약을 지운다.
 * 예전 앱은 이 메시지를 모르고 그냥 넘긴다.
 */
async function syncAppBirthdayReminder(self: SavedProfile | null) {
  if (typeof navigator === "undefined" || !navigator.userAgent.includes("MyeongunApp")) return;
  const bridge = (window as unknown as { ReactNativeWebView?: { postMessage: (m: string) => void } }).ReactNativeWebView;
  if (!bridge) return;
  const dates = self ? upcomingBirthdays(self.birthDate, self.calendar, 2) : [];
  const stamp = `${todayKst()}|${self?.name ?? ""}|${dates.join(",")}`;
  try {
    if (localStorage.getItem(APP_SYNC_KEY) === stamp) return;
  } catch {
    // 저장소가 막혀 있으면 매번 보낸다
  }
  let since = todayKst();
  if (dates.length > 0) {
    try {
      const r = await fetch(`/api/birthday-gift?peek=device&sid=${encodeURIComponent(getAnalyticsDeviceId())}`);
      const d = (await r.json()) as { deviceSince?: string | null };
      if (d.deviceSince) since = d.deviceSince.slice(0, 10);
    } catch {
      // 모르면 오늘부터로 본다
    }
  }
  const dayMs = 86_400_000;
  const items = dates.map((date) => ({
    date,
    gift: (Date.parse(date) - Date.parse(since)) / dayMs >= GIFT_DEVICE_DAYS,
  }));
  bridge.postMessage(JSON.stringify({ type: "BIRTHDAY_REMINDER_SET", name: self?.name ?? "", items }));
  try {
    localStorage.setItem(APP_SYNC_KEY, stamp);
  } catch {
    // 무시
  }
}

export function BirthdayGiftBanner() {
  const [profile, setProfile] = useState<SavedProfile | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    const self = readSelfProfile();
    void syncAppBirthdayReminder(self);
    if (!self) return;
    const win = birthdayWindow(self.birthDate, self.calendar);
    if (!win.inWindow || win.daysSince === null) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === todayKst()) return;
    } catch {
      // 저장소가 막혀 있으면 매번 보여 준다
    }
    const sid = getAnalyticsDeviceId();
    setProfile(self);
    setDaysLeft(BIRTHDAY_GIFT_DAYS - win.daysSince);
    const qs = new URLSearchParams({ sid, birthDate: self.birthDate, calendar: self.calendar });
    fetch(`/api/birthday-gift?${qs}`)
      .then((r) => r.json())
      .then((d: Status & { success?: boolean }) => {
        if (!d?.success) return;
        setStatus(d);
        void logEvent("birthday_banner_view", { eligible: d.eligible, reason: d.reason });
      })
      .catch(() => {});
  }, []);

  if (!profile || !status) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, todayKst());
    } catch {
      // 무시
    }
    setStatus(null);
  };

  return (
    <div className="relative mx-auto mt-3 w-full max-w-5xl px-4">
      <div className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-950/70 via-rose-950/50 to-amber-950/70 px-4 py-3.5 shadow-[0_0_30px_-10px_rgba(245,158,11,0.6)]">
        <button
          type="button"
          onClick={dismiss}
          aria-label="닫기"
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-amber-200/50 transition hover:bg-white/10 hover:text-amber-100"
        >
          ×
        </button>
        <p className="pr-6 text-sm font-bold text-amber-200">🎂 {profile.name}님, 생일 축하해요!</p>
        {status.eligible ? (
          <>
            <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
              명운이 <strong className="text-amber-200">기적의 제단 10일 고정 소원권</strong>(2,200원 상당)을 선물로 드려요.
              올해 가장 바라는 소원을 10일 동안 제단에 올려 보세요. <span className="text-amber-200/70">· {daysLeft}일 안에 사용</span>
            </p>
            <button
              type="button"
              onClick={() => {
                void logEvent("birthday_gift_click", {});
                window.location.href = "/tools?tab=altar&gift=birthday";
              }}
              className="mt-2.5 w-full rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 py-2.5 text-sm font-bold text-stone-950 shadow-md transition hover:brightness-105 active:scale-[0.98]"
            >
              🎁 선물 받고 소원 올리기
            </button>
          </>
        ) : (
          <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
            {status.claimed
              ? "생일 선물 소원이 제단에 올라가 있어요. 올해도 바라는 일이 모두 이루어지길 바라요."
              : "태어난 날의 기운이 가장 밝게 빛나는 한 주예요. 올해도 바라는 일이 모두 이루어지길 바라요."}
          </p>
        )}
      </div>
    </div>
  );
}

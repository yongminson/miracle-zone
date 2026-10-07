"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { logEvent } from "@/lib/analytics";
import { readProfiles } from "@/lib/profiles/saved-profiles";
import { hasWebPushSubscription, isWebPushAvailable, subscribeDailyPush, unsubscribeDailyPush } from "@/lib/push/web-push";
import { disableAppDailyPush, enableAppDailyPush, hasAppDailyPush, isAppDailyPushAvailable } from "@/lib/push/app-push";

/**
 * 상단 오른쪽 종 — 매일 아침 8시 알림 켜기·끄기.
 * "이번 주 나의 흐름" 아래 버튼(components/calendar/WeekLuck.tsx)과 같은 알림이다.
 * 저장된 생년월일(본인 우선)이 있으면 그 사람의 흐름으로 보낸다.
 * 토스·예전 구글 앱처럼 알림이 안 되는 곳에서는 종을 아예 보이지 않는다.
 */
export default function HeaderPushBell() {
  const [state, setState] = useState<"hidden" | "off" | "on" | "busy">("hidden");

  useEffect(() => {
    if (isAppDailyPushAvailable()) {
      void hasAppDailyPush().then((on) => setState(on ? "on" : "off"));
    } else if (isWebPushAvailable()) {
      void hasWebPushSubscription().then((on) => setState(on ? "on" : "off"));
    }
  }, []);

  if (state === "hidden") return null;

  const toggle = async () => {
    if (state === "busy") return;
    const inApp = isAppDailyPushAvailable();
    const channel = inApp ? "app" : "web";

    if (state === "on") {
      if (!window.confirm("매일 아침 운세 알림을 끌까요?")) return;
      setState("busy");
      if (inApp) await disableAppDailyPush();
      else await unsubscribeDailyPush();
      setState("off");
      void logEvent("push_unsubscribe", { source: "header_bell", channel });
      return;
    }

    const profiles = readProfiles();
    const me = profiles.find((p) => p.relation === "self") ?? profiles[0];
    const profile = me ? { birthDate: me.birthDate, calendarType: me.calendar } : undefined;
    if (inApp && !profile) {
      window.alert("오늘의 운세에서 생년월일을 먼저 넣어 주세요. 그 흐름으로 매일 아침 알려 드려요.");
      return;
    }

    setState("busy");
    const result = inApp && profile ? await enableAppDailyPush(profile) : await subscribeDailyPush(profile);
    if (result.ok) {
      setState("on");
      void logEvent("push_subscribe", { source: "header_bell", channel, personalized: !!profile });
      window.alert(
        profile
          ? "✨ 내일 아침 8시부터 오늘의 흐름을 알려 드릴게요."
          : "✨ 내일 아침 8시부터 알려 드릴게요. 오늘의 운세에서 생년월일을 저장하면 나에게 맞춘 알림이 와요.",
      );
    } else {
      setState("off");
      window.alert(result.message);
    }
  };

  const on = state === "on";
  return (
    <button
      onClick={() => void toggle()}
      disabled={state === "busy"}
      className={`flex h-8 w-8 items-center justify-center rounded-full border shadow-lg transition-colors disabled:opacity-60 ${
        on
          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
          : "border-yellow-500/20 bg-slate-800 text-yellow-400 hover:bg-slate-700"
      }`}
      title={on ? "매일 아침 알림 받는 중 (누르면 끄기)" : "매일 아침 8시 운세 알림 받기"}
      aria-label={on ? "매일 아침 알림 끄기" : "매일 아침 알림 받기"}
      type="button"
    >
      {on ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4 animate-bounce" />}
    </button>
  );
}

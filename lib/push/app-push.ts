/**
 * 구글 앱(명운-rn) 안에서 매일 아침 알림 켜기·끄기.
 *
 * 앱 안(WebView)에서는 브라우저 알림이 안 되므로, 앱에 부탁해 휴대폰에 알림을 예약한다.
 * 앱이 앞으로 2주치 그날의 흐름을 받아 아침 8시마다 울리게 하고, 앱을 열 때마다 다시 채운다.
 * 이 기능이 있는 앱(1.1.5~)만 userAgent 에 "MyeongunPush/" 를 붙인다 — 옛 앱에서는 버튼이 숨는다.
 * 앱 쪽 메시지 처리: 명운-rn app/index.tsx (DAILY_LUCK_PUSH_*). 형식을 바꿀 때 함께 바꿀 것.
 */

type Bridge = { postMessage: (message: string) => void };
type AppPushResult = { ok: true; on: boolean } | { ok: false; message: string };

function bridge(): Bridge | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { ReactNativeWebView?: Bridge }).ReactNativeWebView ?? null;
}

export function isAppDailyPushAvailable(): boolean {
  return typeof navigator !== "undefined" && navigator.userAgent.includes("MyeongunPush/") && !!bridge();
}

/** 앱에 부탁하고 답(DAILY_LUCK_PUSH_RESULT)을 기다린다 */
function ask(message: Record<string, unknown>, timeoutMs: number): Promise<AppPushResult> {
  return new Promise((resolve) => {
    const app = bridge();
    if (!app) {
      resolve({ ok: false, message: "앱에서만 쓸 수 있어요." });
      return;
    }
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const onMessage = (event: MessageEvent) => {
      let data: { type?: string; requestId?: string; ok?: boolean; on?: boolean; message?: string };
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (data?.type !== "DAILY_LUCK_PUSH_RESULT" || data.requestId !== requestId) return;
      cleanup();
      resolve(data.ok ? { ok: true, on: !!data.on } : { ok: false, message: data.message || "알림을 설정하지 못했어요." });
    };
    const timer = window.setTimeout(() => {
      cleanup();
      resolve({ ok: false, message: "앱이 응답하지 않아요. 잠시 후 다시 시도해 주세요." });
    }, timeoutMs);
    function cleanup() {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
    }
    window.addEventListener("message", onMessage);
    app.postMessage(JSON.stringify({ ...message, requestId }));
  });
}

/** 이 앱에서 이미 알림을 받고 있는지 */
export async function hasAppDailyPush(): Promise<boolean> {
  const result = await ask({ type: "DAILY_LUCK_PUSH_STATUS" }, 5000);
  return result.ok && result.on;
}

/** 알림 켜기 — 휴대폰 알림 허용 창을 기다리느라 넉넉히 1분 기다린다 */
export async function enableAppDailyPush(profile: {
  birthDate: string;
  calendarType: "solar" | "lunar" | "lunar-leap";
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const result = await ask({ type: "DAILY_LUCK_PUSH_ON", ...profile }, 60000);
  return result.ok ? { ok: true } : result;
}

export async function disableAppDailyPush(): Promise<void> {
  await ask({ type: "DAILY_LUCK_PUSH_OFF" }, 5000);
}

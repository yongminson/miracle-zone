/**
 * 웹 알림(브라우저 푸시) 켜기·끄기 — 화면에서 쓴다.
 *
 * 구글 앱(WebView)·앱인토스 안에서는 브라우저 알림이 동작하지 않아 쓰지 않는다.
 * 아이폰은 사파리에서 "홈 화면에 추가"한 경우에만 웹 알림을 받을 수 있다.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export function isWebPushAvailable(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_PLATFORM === "toss") return false;
  if (navigator.userAgent.includes("MyeongunApp")) return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/** 이 기기가 이미 알림을 받고 있는지 */
export async function hasWebPushSubscription(): Promise<boolean> {
  if (!isWebPushAvailable() || Notification.permission !== "granted") return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    return !!(await registration?.pushManager.getSubscription());
  } catch {
    return false;
  }
}

export type SubscribeResult = { ok: true } | { ok: false; message: string };

/** 매일 아침 알림 켜기. 생년월일을 넘기면 그 사람의 흐름으로 알림이 온다 */
export async function subscribeDailyPush(profile?: {
  birthDate: string;
  calendarType: "solar" | "lunar" | "lunar-leap";
}): Promise<SubscribeResult> {
  if (!isWebPushAvailable()) return { ok: false, message: "이 브라우저는 알림을 지원하지 않아요." };
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  if (!key) return { ok: false, message: "알림 기능을 준비하고 있어요." };
  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, message: "알림이 차단돼 있어요. 브라우저 설정에서 이 사이트 알림을 허용해 주세요." };
    }
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(key) as BufferSource,
      }));
    const res = await fetch(`${API_BASE}/api/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...subscription.toJSON(), ...(profile ?? {}) }),
    });
    if (!res.ok) return { ok: false, message: "알림을 켜지 못했어요. 잠시 후 다시 시도해 주세요." };
    return { ok: true };
  } catch {
    return { ok: false, message: "알림을 켜지 못했어요. 기기 설정에서 알림이 꺼져 있는지 확인해 주세요." };
  }
}

/** 알림 끄기 — 이 기기 구독을 지운다 */
export async function unsubscribeDailyPush(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    await fetch(`${API_BASE}/api/push/unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    await subscription.unsubscribe();
  } catch {
    // 끄지 못해도 다음 알림에서 만료 구독으로 정리된다
  }
}

"use client";

import { createClient } from "@supabase/supabase-js";
import { tossLog, tossRequestReview } from "@/lib/toss-bridge";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SESSION_KEY = "mu_session_id";
const ATTRIBUTION_KEY = "mu_attribution";

function getSessionId(): string {
  try {
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "unknown";
  }
}

/** 첫 진입 시 referrer + UTM 파싱해서 저장 (이미 있으면 유지 = 최초 유입 기준) */
export function captureAttribution() {
  try {
    if (localStorage.getItem(ATTRIBUTION_KEY)) return;

    const params = new URLSearchParams(window.location.search);
    const attribution = {
      referrer: document.referrer || null,
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
    };
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {}
}

function getAttribution() {
  try {
    const raw = localStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return { referrer: null, utm_source: null, utm_medium: null, utm_campaign: null };
    return JSON.parse(raw);
  } catch {
    return { referrer: null, utm_source: null, utm_medium: null, utm_campaign: null };
  }
}

/**
 * 어디서 들어왔는지 — web(웹) / app(구글 앱) / toss(앱인토스).
 * 앱인토스는 빌드할 때 NEXT_PUBLIC_PLATFORM=toss 로 정해 두고,
 * 구글 앱은 WebView 사용자 에이전트의 "MyeongunApp" 으로 알아본다.
 */
function getPlatform(): string {
  const fixed = process.env.NEXT_PUBLIC_PLATFORM;
  if (fixed) return fixed;
  try {
    return navigator.userAgent.includes("MyeongunApp") ? "app" : "web";
  } catch {
    return "web";
  }
}

/**
 * 공유 링크에 출처 표시를 붙인다. 받은 사람이 들어오면 "공유로 온 사람"으로 잡힌다.
 * feature 는 무엇을 공유했는지(fortune·lock 등).
 */
export function withShareUtm(url: string, feature: string): string {
  try {
    const u = new URL(url, window.location.origin);
    // 공유한 사람이 달고 온 유튜브 캠페인 표시 등은 떼어 낸다
    for (const k of ["utm_campaign", "utm_content", "utm_term"]) u.searchParams.delete(k);
    u.searchParams.set("utm_source", "share");
    u.searchParams.set("utm_medium", feature);
    return u.toString();
  } catch {
    return url;
  }
}

/** 이벤트 기록. 실패해도 서비스 동작에 영향 없음 */
export async function logEvent(eventName: string, eventData?: Record<string, unknown>) {
  // 앱인토스 빌드면 토스 분석에도 보낸다(웹·구글 앱에서는 아무것도 안 함)
  void sendToTossAnalytics(eventName, eventData);
  try {
    const attribution = getAttribution();
    const row = {
      session_id: getSessionId(),
      event_name: eventName,
      event_data: eventData ?? null,
      referrer: attribution.referrer,
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      page_path: window.location.pathname + window.location.search,
    };
    const { error } = await supabase
      .from("user_events")
      .insert({ ...row, platform: getPlatform() });
    // platform 칸이 아직 없는 DB 라도 기록은 남긴다
    if (error) await supabase.from("user_events").insert(row);
  } catch {}
}

// ───────────── 앱인토스 전용: 토스 분석·리뷰 ─────────────
// 토스는 "추천 미니앱"을 고를 때 재방문·전환 같은 실사용 지표와 리뷰를 본다.
// 아래 두 함수는 앱인토스 빌드(NEXT_PUBLIC_PLATFORM=toss)에서만 동작하고, 웹·구글 앱에서는 아무것도 하지 않는다.

const IS_TOSS_BUILD = process.env.NEXT_PUBLIC_PLATFORM === "toss";

/** 토스 콘솔(분석 > 이벤트)로도 보낼 이벤트. 의미 있는 행동만 고른다 */
const TOSS_EVENTS: Record<string, "screen" | "click"> = {
  tool_result: "screen",
  newyear_result: "screen",
  week_luck_view: "screen",
  payment_complete: "screen",
  fortune_feedback: "click",
  payment_start: "click",
  newyear_share: "click",
};

/** 토스 분석은 문자·숫자·참거짓 값만 받는다 */
function tossParams(eventData?: Record<string, unknown>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(eventData ?? {})) {
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") out[k] = v;
  }
  return out;
}

async function sendToTossAnalytics(eventName: string, eventData?: Record<string, unknown>) {
  if (!IS_TOSS_BUILD) return;
  const kind = TOSS_EVENTS[eventName];
  if (!kind) return;
  try {
    // tool_result 는 기능별로 나눠 보이게 한다(예: fortune_result)
    const tool = typeof eventData?.tool === "string" ? eventData.tool : null;
    const logName = eventName === "tool_result" && tool ? `${tool}_result` : eventName;
    await tossLog(kind, { ...tossParams(eventData), log_name: logName });
  } catch {
    // 토스 분석 전송이 실패해도 서비스 동작에는 영향이 없다
  }
}

const REVIEW_KEY = "myeongun_toss_review_asked_v1";
const REVIEW_GAP_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * 토스 리뷰(별점) 요청 — 결제를 마쳤거나 "맞았어요"를 누른 좋은 순간에만 부른다.
 * 토스가 띄울지 말지를 다시 판단하므로 항상 뜨지는 않는다. 같은 기기에는 30일에 한 번만 요청한다.
 */
export async function requestTossReview(reason: string) {
  if (!IS_TOSS_BUILD) return;
  try {
    const last = Number(localStorage.getItem(REVIEW_KEY) ?? 0);
    if (last && Date.now() - last < REVIEW_GAP_MS) return;
    localStorage.setItem(REVIEW_KEY, String(Date.now()));
    await tossRequestReview();
    void logEvent("toss_review_request", { reason });
  } catch {
    // 지원하지 않는 토스 버전이면 조용히 넘어간다
  }
}

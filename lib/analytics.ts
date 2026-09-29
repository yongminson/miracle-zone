"use client";

import { createClient } from "@supabase/supabase-js";

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
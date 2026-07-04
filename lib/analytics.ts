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

/** 이벤트 기록. 실패해도 서비스 동작에 영향 없음 */
export async function logEvent(eventName: string, eventData?: Record<string, unknown>) {
  try {
    const attribution = getAttribution();
    await supabase.from("user_events").insert({
      session_id: getSessionId(),
      event_name: eventName,
      event_data: eventData ?? null,
      referrer: attribution.referrer,
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      page_path: window.location.pathname + window.location.search,
    });
  } catch {}
}
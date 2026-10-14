import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 결제한 사주 인사이트 리포트 보관(비공개 저장소 vip-reports, 서버만 읽는다).
 *
 * 리포트를 만드는 1~2분 사이 손님이 화면을 나가면, 서버는 리포트를 다 만들고 지급 완료로 바꾸지만
 * 휴대폰은 받지 못한다. 그 뒤 다시 받기는 "이미 사용된 결제"로 막혀 돈만 내고 리포트를 못 받았다(2026-10-14).
 * 그래서 완성한 리포트를 결제별로 보관해 두고, 같은 결제로 다시 오면 보관본을 그대로 보낸다.
 * 이름·생년월일이 들어 있으므로 30일 뒤 지운다(/api/cron/vip-report-cleanup).
 */

export const VIP_REPORT_BUCKET = "vip-reports";
export const VIP_REPORT_KEEP_DAYS = 30;

/** 결제 번호를 그대로 파일 이름에 쓰지 않는다 */
function pathOf(paymentRef: string): string {
  return `${createHash("sha256").update(paymentRef).digest("hex")}.md`;
}

export async function saveVipReport(supabase: SupabaseClient, paymentRef: string, markdown: string): Promise<boolean> {
  const { error } = await supabase.storage
    .from(VIP_REPORT_BUCKET)
    .upload(pathOf(paymentRef), new Blob([markdown], { type: "text/markdown" }), {
      contentType: "text/markdown",
      upsert: true,
    });
  if (error) console.error("[vip-report-store] save failed", { message: error.message });
  return !error;
}

export async function loadVipReport(supabase: SupabaseClient, paymentRef: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(VIP_REPORT_BUCKET).download(pathOf(paymentRef));
  if (error || !data) return null;
  const text = await data.text();
  return text.trim() ? text : null;
}

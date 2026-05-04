import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 서버 전용 — `SUPABASE_SERVICE_ROLE_KEY`만 사용 (anon 키 금지 → RLS 우회).
 * 키/URL이 없으면 `null`을 반환하고 콘솔에 원인을 남김.
 */
export function createSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    console.error(
      "[Supabase Admin] NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 비어 있습니다. " +
        "DB insert/update는 service role로만 수행해야 RLS에 막히지 않습니다. (NEXT_PUBLIC_SUPABASE_ANON_KEY는 사용하지 마세요.)",
    );
    return null;
  }

  return createClient(url, serviceRoleKey);
}

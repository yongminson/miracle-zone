import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type PushSubscribeBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = (await req.json()) as PushSubscribeBody;
    const endpoint = body.endpoint?.trim();
    const p256dh = body.keys?.p256dh?.trim();
    const auth = body.keys?.auth?.trim();

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { success: false, message: "endpoint, keys.p256dh, keys.auth는 필수입니다." },
        { status: 400 }
      );
    }

    const row = { endpoint, p256dh, auth };

    const { data: existing, error: selectError } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("endpoint", endpoint)
      .maybeSingle();

    if (selectError) throw selectError;

    if (existing?.id != null) {
      const { error: updateError } = await supabase.from("push_subscriptions").update(row).eq("id", existing.id);
      if (updateError) throw updateError;
      return NextResponse.json({ success: true, action: "updated" });
    }

    const { error: insertError } = await supabase.from("push_subscriptions").insert(row);

    if (insertError) {
      const code = (insertError as { code?: string }).code;
      if (code === "23505") {
        const { error: upsertErr } = await supabase.from("push_subscriptions").update(row).eq("endpoint", endpoint);
        if (upsertErr) throw upsertErr;
        return NextResponse.json({ success: true, action: "updated_after_conflict" });
      }
      throw insertError;
    }

    return NextResponse.json({ success: true, action: "inserted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "구독 저장 중 오류가 발생했습니다.";
    console.error("push/subscribe:", error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

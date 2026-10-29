import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

/**
 * 앱(명운-rn 1.1.9~)이 구글 결제를 '소비(완료)' 처리해도 되는지 묻는다 — 웹이 지급하는 상품만.
 *
 * 1.1.8 까지는 영수증을 웹에 넘기자마자 소비했다. 그 사이 화면이 다시 뜨거나 끊기면
 * 웹은 영수증을 못 받고 구매는 끝나 버려, 손님이 돈만 낸 상태가 될 수 있었다(Codex 검토 #2).
 * 1.1.9 는 웹이 영수증으로 주문을 저장한 것(= 여기서 granted)을 확인한 뒤에만 소비한다.
 * 끝내 저장되지 않으면 소비하지 않고 두고, 구글이 3일 뒤 자동 환불한다.
 *
 * 영수증으로 저장된 주문이 있는지만 답한다(주문 내용은 돌려주지 않는다). 읽기 전용.
 */

// 상품 → 웹이 주문을 저장하는 표. payment_ref 는 모두 `app:${영수증}`
const TABLE_BY_PRODUCT: Record<string, string> = {
  lock_basic: "locks",
  lock_color: "locks",
  lock_shine: "locks",
  newyear_detail: "newyear_orders",
  monthly_luck: "monthly_orders",
  match_deep: "product_orders",
  taekil: "product_orders",
  season_luck: "product_orders",
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { productId?: unknown; purchaseToken?: unknown } | null;
  const productId = typeof body?.productId === "string" ? body.productId : "";
  const purchaseToken = typeof body?.purchaseToken === "string" ? body.purchaseToken.trim() : "";
  const table = TABLE_BY_PRODUCT[productId];
  if (!table || !purchaseToken || purchaseToken.length > 500) {
    return NextResponse.json({ success: false, message: "상품 또는 영수증을 확인할 수 없습니다." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ success: false, message: "잠시 후 다시 시도해 주세요." }, { status: 503 });

  const { data, error } = await supabase.from(table).select("id").eq("payment_ref", `app:${purchaseToken}`).limit(1);
  if (error) {
    console.error("[google-granted] lookup failed", table, error);
    return NextResponse.json({ success: false, message: "잠시 후 다시 시도해 주세요." }, { status: 503 });
  }
  return NextResponse.json({ success: true, granted: (data ?? []).length > 0 });
}

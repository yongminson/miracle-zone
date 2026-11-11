import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { calculateNewYear } from "@/lib/newyear/newyear-engine";
import {
  REVIEW_BODY_MAX,
  REVIEW_BODY_MIN,
  isReviewProduct,
  maskName,
  type PublicReview,
  type ReviewSummary,
} from "@/lib/reviews/reviews";

/**
 * 구매 인증 후기 (2026-11-12, 새 라우트 — 기존 API 는 그대로).
 *
 * GET  /api/reviews?product=newyear  → 숨기지 않은 최근 후기 20개와 개수·평균
 * POST /api/reviews  { product, paymentId | purchaseToken | tossOrderId, rating, body }
 *   결제 식별자로 실제 주문(풀이까지 받은 것)을 찾은 뒤에만 저장한다. 운영자 무료 주문은 받지 않는다.
 *   결제 1건에 후기 1개(product + payment_ref 유일).
 */

export async function GET(req: Request) {
  const product = new URL(req.url).searchParams.get("product");
  if (!isReviewProduct(product)) return NextResponse.json({ success: false, message: "상품이 올바르지 않습니다." }, { status: 400 });
  const supabase = createSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ success: false, message: "서버 설정 문제" }, { status: 503 });

  const [{ data, error }, stats] = await Promise.all([
    supabase
      .from("reviews")
      .select("id,rating,body,display_name,zodiac,created_at")
      .eq("product", product)
      .eq("hidden", false)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("reviews").select("rating").eq("product", product).eq("hidden", false),
  ]);
  if (error || stats.error) {
    console.error("[reviews] read", error ?? stats.error);
    return NextResponse.json({ success: false, message: "후기를 불러오지 못했습니다." }, { status: 503 });
  }
  const ratings = (stats.data ?? []).map((r) => Number(r.rating)).filter((n) => n >= 1 && n <= 5);
  const summary: ReviewSummary = {
    count: ratings.length,
    average: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
    reviews: (data ?? []).map(
      (r): PublicReview => ({
        id: r.id,
        rating: r.rating,
        body: r.body,
        displayName: r.display_name ?? "구매자",
        zodiac: r.zodiac ?? null,
        createdAt: r.created_at,
      }),
    ),
  };
  return NextResponse.json(
    { success: true, ...summary },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}

function fail(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return fail("요청이 올바르지 않습니다.", 400);
    if (!isReviewProduct(body.product)) return fail("상품이 올바르지 않습니다.", 400);

    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail("별점을 골라 주세요.", 400);
    const text = typeof body.body === "string" ? body.body.trim().replace(/\s+/g, " ") : "";
    if (text.length < REVIEW_BODY_MIN) return fail(`후기를 ${REVIEW_BODY_MIN}자 이상 적어 주세요.`, 400);
    if (text.length > REVIEW_BODY_MAX) return fail(`후기는 ${REVIEW_BODY_MAX}자까지 적을 수 있어요.`, 400);
    if (/https?:\/\/|www\.|\.com\b|\.kr\b|open\.kakao/i.test(text)) return fail("후기에는 링크를 넣을 수 없어요.", 400);

    // 결제 식별자 → 주문 참조(각 결제 라우트가 저장할 때 쓰는 형식과 같다)
    const refs: string[] = [];
    const paymentId = typeof body.paymentId === "string" ? body.paymentId.trim().replace(/\s+/g, "") : "";
    const purchaseToken = typeof body.purchaseToken === "string" ? body.purchaseToken.trim() : "";
    const tossOrderId = typeof body.tossOrderId === "string" ? body.tossOrderId.trim() : "";
    if (paymentId) refs.push(`web:${paymentId}`);
    if (purchaseToken) refs.push(`app:${purchaseToken}`);
    if (tossOrderId) refs.push(`toss:${tossOrderId}`);
    if (refs.length === 0) return fail("구매 정보를 찾지 못했습니다.", 400);

    const supabase = createSupabaseAdminClient();
    if (!supabase) return fail("서버 설정 문제로 저장하지 못했습니다.", 503);

    const { data: order, error: orderError } = await supabase
      .from("newyear_orders")
      .select("payment_ref,platform,name,birth_date,calendar_type,gender,generated_at")
      .in("payment_ref", refs)
      .maybeSingle();
    if (orderError) {
      console.error("[reviews] order lookup", orderError);
      return fail("구매 정보를 확인하지 못했습니다.", 503);
    }
    if (!order || !order.generated_at || order.platform === "admin") {
      return fail("구매한 풀이를 받은 뒤에 후기를 남길 수 있어요.", 403);
    }

    let zodiac: string | null = null;
    try {
      zodiac = calculateNewYear({
        birthDate: order.birth_date,
        calendarType: order.calendar_type,
        gender: order.gender,
      }).zodiac || null;
    } catch {
      zodiac = null;
    }

    const { error } = await supabase.from("reviews").insert({
      product: body.product,
      payment_ref: order.payment_ref,
      rating,
      body: text,
      display_name: maskName(order.name),
      zodiac,
    });
    if (error) {
      if (error.code === "23505") return fail("이 구매로는 이미 후기를 남겼어요. 고마워요!", 409);
      console.error("[reviews] insert", error);
      return fail("후기를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.", 503);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[reviews] unexpected", error);
    return fail("오류가 발생했습니다.", 500);
  }
}

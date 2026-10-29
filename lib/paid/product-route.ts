import { NextRequest, NextResponse } from "next/server";
import { hasValidAdminSession } from "@/lib/auth/admin-session";
import { verifyPaidAmount } from "@/lib/payments/verify-paid-amount";
import { verifyGoogleProductPurchase } from "@/lib/payments/verify-google-purchase";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { fulfillProductOrder, type PaidProduct } from "./product-order";

/**
 * 유료 상세 풀이 API 공통 처리(웹·구글 앱) — 궁합 심층·택일·시즌 운세.
 * 웹은 포트원 결제 식별자, 앱은 구글 인앱결제 영수증(purchaseToken)을 보낸다.
 * 결제 종류(웹/앱)는 보내온 값이 아니라 영수증 유무로 서버가 정한다.
 */

function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

export function productDetailHandler<TInput, TDetail, TPaid extends object>(config: {
  product: PaidProduct;
  /** 구글 플레이 상품 ID */
  googleProductId: string;
  priceWon: number;
  /** 포트원 결제 상품명 — 같은 금액의 다른 상품 결제를 이 상품으로 인정하지 않게 이름까지 맞춰 본다 */
  orderName: string;
  readInput: (body: Record<string, unknown>) => TInput | null;
  ownerKey: (input: TInput) => string;
  validate: (input: TInput) => void;
  generate: (input: TInput) => Promise<TDetail>;
  build: (input: TInput, detail: TDetail) => TPaid;
}) {
  return async function POST(req: NextRequest) {
    try {
      const body = (await req.json()) as Record<string, unknown>;

      const purchaseToken = typeof body.purchaseToken === "string" ? body.purchaseToken.trim() : "";
      const lookupId = purchaseToken || String(body.paymentId ?? "").trim().replace(/\s+/g, "");
      if (!lookupId || lookupId.length > 500) return bad("결제 식별자가 없습니다.");

      // 운영자 모드 — 결제 없이 풀이를 만든다(블로그 홍보용). 새로 만들 때만 운영자 로그인을 확인한다
      const adminFree = body.admin === true;
      const platform = adminFree ? "admin" : purchaseToken ? "app" : "web";
      const merchantUid = typeof body.merchant_uid === "string" ? body.merchant_uid : null;

      const supabase = createSupabaseAdminClient();
      if (!supabase) return bad("서버 설정 문제로 처리하지 못했습니다. 고객센터에 문의해 주세요.", 503);

      const outcome = await fulfillProductOrder<TInput, TDetail, TPaid>({
        supabase,
        product: config.product,
        paymentRef: `${platform}:${lookupId}`,
        platform,
        amountWon: adminFree ? 0 : config.priceWon,
        input: config.readInput(body),
        ownerKey: config.ownerKey,
        validate: config.validate,
        generate: config.generate,
        build: config.build,
        verify: async () => {
          if (adminFree) {
            return hasValidAdminSession(req)
              ? { ok: true as const }
              : {
                  ok: false as const,
                  status: 403,
                  message: "운영자 로그인이 필요합니다. 하단 저작권 문구를 두 번 눌러 다시 로그인해 주세요.",
                };
          }
          if (purchaseToken) {
            return verifyGoogleProductPurchase({ productId: config.googleProductId, purchaseToken });
          }
          return verifyPaidAmount({
            lookupId,
            expectedAmountWon: config.priceWon,
            merchantUidToMatch: merchantUid,
            expectedOrderName: config.orderName,
          });
        },
      });

      if (!outcome.ok) return bad(outcome.message, outcome.status);
      const { ok: _ok, ...paid } = outcome;
      return NextResponse.json({ success: true, ...paid });
    } catch (error) {
      console.error(`[${config.product}] unexpected error`, error);
      return bad("상세 풀이를 불러오는 중 오류가 발생했습니다.", 500);
    }
  };
}

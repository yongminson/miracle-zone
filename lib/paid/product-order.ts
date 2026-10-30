import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 유료 상세 풀이 공통 주문 처리 — 궁합 심층·택일·시즌 운세가 같이 쓴다(표: product_orders).
 * 순서는 신년운세·이달의 운세와 같다.
 *
 *  1. 같은 결제로 이미 만든 풀이가 있으면 그대로 돌려준다(다시 보기·중복 지급 방지).
 *  2. 없으면 결제를 서버에서 확인한다.
 *  3. 확인되면 AI 를 부르기 **전에** 주문을 먼저 저장한다. AI 가 실패해도
 *     "돈은 냈는데 기록이 없는" 상태가 생기지 않고, 같은 결제로 다시 시도할 수 있다.
 *  4. 풀이를 만들어 저장한다.
 *
 * 토스는 지급 단계에서 1~3 만 하고(prepareProductOrder) 풀이는 결제가 끝난 뒤 화면이 따로 받는다.
 */

export type PaidProduct = "match_deep" | "taekil" | "season_luck";

export type ProductOrderOutcome<TPaid> = ({ ok: true; reopened: boolean } & TPaid) | { ok: false; status: number; message: string };

type Failure = { ok: false; status: number; message: string };

type Row<TInput, TDetail> = { id: string; product: string; input: TInput; detail: TDetail | null };

type OrderParams<TInput> = {
  supabase: SupabaseClient;
  product: PaidProduct;
  paymentRef: string;
  platform: "web" | "app" | "toss" | "admin";
  amountWon: number;
  input: TInput | null;
  /** 결제번호만 알아서는 남의 풀이를 볼 수 없게, 결제할 때 넣은 값과 같아야 연다(보통 내 생년월일) */
  ownerKey: (input: TInput) => string;
  /** 새 주문 전에 입력값을 확인한다 — 잘못된 날짜로 결제만 묶이는 일을 막는다. 문제가 있으면 throw */
  validate: (input: TInput) => void;
  verify: () => Promise<{ ok: true } | { ok: false; message: string; status?: number }>;
};

const SELECT = "id,product,input,detail";

/** 1~3: 이미 있는 주문을 찾거나, 결제를 확인하고 새 주문을 저장한다 */
async function findOrCreateOrder<TInput, TDetail>(
  params: OrderParams<TInput>,
): Promise<{ ok: true; row: Row<TInput, TDetail> } | Failure> {
  const { supabase, paymentRef } = params;

  const existing = await supabase.from("product_orders").select(SELECT).eq("payment_ref", paymentRef).maybeSingle();
  if (existing.error) {
    console.error("[product-order] lookup failed", existing.error);
    return { ok: false, status: 503, message: "주문을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  if (!params.input) return { ok: false, status: 400, message: "입력한 정보를 확인해 주세요." };

  if (existing.data) {
    const row = existing.data as Row<TInput, TDetail>;
    if (row.product !== params.product || params.ownerKey(row.input) !== params.ownerKey(params.input)) {
      return { ok: false, status: 409, message: "이 결제는 다른 풀이에 이미 사용되었습니다." };
    }
    return { ok: true, row };
  }

  try {
    params.validate(params.input);
  } catch (error) {
    return { ok: false, status: 400, message: error instanceof Error ? error.message : "입력한 정보를 확인해 주세요." };
  }

  const verified = await params.verify();
  if (!verified.ok) return { ok: false, status: verified.status ?? 400, message: verified.message };

  const inserted = await supabase
    .from("product_orders")
    .insert({
      product: params.product,
      payment_ref: paymentRef,
      platform: params.platform,
      amount: params.amountWon,
      input: params.input,
    })
    .select(SELECT)
    .single();

  if (inserted.error || !inserted.data) {
    // 동시에 두 번 눌린 경우 — 먼저 들어간 주문으로 이어 간다
    if (inserted.error?.code === "23505") {
      const raced = await supabase.from("product_orders").select(SELECT).eq("payment_ref", paymentRef).maybeSingle();
      if (raced.data) return { ok: true, row: raced.data as Row<TInput, TDetail> };
    }
    console.error("[product-order] insert failed", params.product, inserted.error);
    return {
      ok: false,
      status: 503,
      message: "결제는 확인했지만 주문을 저장하지 못했습니다. 잠시 후 다시 열거나 고객센터에 문의해 주세요.",
    };
  }
  return { ok: true, row: inserted.data as Row<TInput, TDetail> };
}

export async function fulfillProductOrder<TInput, TDetail, TPaid extends object>(
  params: OrderParams<TInput> & {
    generate: (input: TInput) => Promise<TDetail>;
    /** 화면에 줄 전부(계산 부분은 매번 다시 만든다) */
    build: (input: TInput, detail: TDetail) => TPaid;
  },
): Promise<ProductOrderOutcome<TPaid>> {
  const order = await findOrCreateOrder<TInput, TDetail>(params);
  if (!order.ok) return order;
  const row = order.row;

  // 4: 풀이
  if (row.detail) return { ok: true, reopened: true, ...params.build(row.input, row.detail) };
  let detail: TDetail;
  try {
    detail = await params.generate(row.input);
  } catch (error) {
    console.error("[product-order] detail generation failed", params.product, error);
    return {
      ok: false,
      status: 503,
      message: "결제는 확인했지만 풀이를 쓰는 중 문제가 생겼습니다. 잠시 후 다시 열면 추가 결제 없이 이어서 받을 수 있습니다.",
    };
  }
  const { error } = await params.supabase
    .from("product_orders")
    .update({ detail, generated_at: new Date().toISOString() })
    .eq("id", row.id);
  // 저장에 실패해도 이번 화면에는 보여준다. 다시 열면 한 번 더 만든다
  if (error) console.error("[product-order] detail save failed", params.product, error);
  return { ok: true, reopened: false, ...params.build(row.input, detail) };
}

/**
 * 토스 지급 단계 — 결제 확인과 주문 저장(1~3)만 하고 바로 끝낸다.
 * AI 풀이(15~25초)를 여기서 쓰면 토스가 지급 응답을 기다리다 실패할 수 있어서다.
 */
export async function prepareProductOrder<TInput>(params: OrderParams<TInput>): Promise<{ ok: true } | Failure> {
  const order = await findOrCreateOrder<TInput, unknown>(params);
  return order.ok ? { ok: true } : order;
}

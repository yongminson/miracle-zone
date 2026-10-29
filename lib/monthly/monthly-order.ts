import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateMonthly, calculateMonthlyCalendar, isSellableMonthKey } from "./monthly-engine";
import { generateMonthlyDetail } from "./monthly-detail-ai";
import type { MonthlyDetail, MonthlyInput, MonthlyPaid } from "./monthly-types";

/**
 * 이달의 운세 주문 처리 — 신년운세(lib/newyear/newyear-order.ts)와 같은 순서.
 *
 *  1. 같은 결제로 이미 만든 풀이가 있으면 그대로 돌려준다(다시 보기·중복 지급 방지). 지난 달 풀이도 그대로 열린다.
 *  2. 없으면 결제를 서버에서 확인한다.
 *  3. 확인되면 AI 를 부르기 **전에** 주문을 먼저 저장한다. AI 가 실패해도
 *     "돈은 냈는데 기록이 없는" 상태가 생기지 않고, 같은 결제로 다시 시도할 수 있다.
 *  4. 풀이를 만들어 저장한다. 달력·목적별 날짜는 계산이라 저장하지 않고 매번 다시 만든다.
 */

export type MonthlyOrderOutcome = ({ ok: true } & MonthlyPaid) | { ok: false; status: number; message: string };

type OrderRow = {
  id: string;
  month_key: string;
  name: string | null;
  birth_date: string;
  calendar_type: string;
  gender: string;
  detail: MonthlyDetail | null;
};

const SELECT = "id,month_key,name,birth_date,calendar_type,gender,detail";

function rowToInput(row: OrderRow): MonthlyInput {
  return {
    name: row.name ?? "",
    birthDate: row.birth_date,
    calendarType: row.calendar_type === "lunar" || row.calendar_type === "lunar-leap" ? row.calendar_type : "solar",
    gender: row.gender === "female" ? "female" : "male",
  };
}

async function writeDetail(supabase: SupabaseClient, row: OrderRow): Promise<MonthlyOrderOutcome> {
  const input = rowToInput(row);
  const result = calculateMonthly(input, row.month_key);
  const { days, purposes } = calculateMonthlyCalendar(input, row.month_key);
  if (row.detail) {
    return { ok: true, input, result, days, purposes, detail: row.detail, reopened: true };
  }

  let detail: MonthlyDetail;
  try {
    detail = await generateMonthlyDetail(input, result, days, purposes);
  } catch (error) {
    console.error("[monthly-order] detail generation failed", error);
    return {
      ok: false,
      status: 503,
      message: "결제는 확인했지만 풀이를 쓰는 중 문제가 생겼습니다. 잠시 후 다시 열면 추가 결제 없이 이어서 받을 수 있습니다.",
    };
  }

  const { error } = await supabase
    .from("monthly_orders")
    .update({ detail, generated_at: new Date().toISOString() })
    .eq("id", row.id);
  if (error) {
    // 저장에 실패해도 이번 화면에는 보여준다. 다시 열면 한 번 더 만든다
    console.error("[monthly-order] detail save failed", error);
  }
  return { ok: true, input, result, days, purposes, detail, reopened: false };
}

export async function fulfillMonthlyOrder(params: {
  supabase: SupabaseClient;
  paymentRef: string;
  platform: "web" | "app" | "toss" | "admin";
  amountWon: number;
  monthKey: string;
  input: MonthlyInput | null;
  verify: () => Promise<{ ok: true } | { ok: false; message: string; status?: number }>;
}): Promise<MonthlyOrderOutcome> {
  const { supabase, paymentRef } = params;

  const existing = await supabase.from("monthly_orders").select(SELECT).eq("payment_ref", paymentRef).maybeSingle();
  if (existing.error) {
    console.error("[monthly-order] lookup failed", existing.error);
    return { ok: false, status: 503, message: "주문을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  if (!params.input) {
    return { ok: false, status: 400, message: "생년월일을 확인해 주세요." };
  }
  if (existing.data) {
    const row = existing.data as OrderRow;
    // 결제번호만 알아서는 남의 풀이를 볼 수 없게, 결제할 때 넣은 생년월일과 같아야 연다
    if (row.birth_date !== params.input.birthDate) {
      return { ok: false, status: 409, message: "이 결제는 다른 생년월일의 풀이에 이미 사용되었습니다." };
    }
    return writeDetail(supabase, row);
  }

  // 새 주문은 이번 달·다음 달만 받는다(지난 달 풀이를 새로 팔지 않는다)
  if (!isSellableMonthKey(params.monthKey)) {
    return { ok: false, status: 400, message: "지금 볼 수 있는 달이 아닙니다. 화면을 새로고침해 주세요." };
  }
  // 저장 전에 날짜가 맞는지 먼저 본다. 잘못된 날짜로 결제만 묶이는 일을 막는다
  try {
    calculateMonthly(params.input, params.monthKey);
  } catch (error) {
    return { ok: false, status: 400, message: error instanceof Error ? error.message : "생년월일을 확인해 주세요." };
  }

  const verified = await params.verify();
  if (!verified.ok) {
    return { ok: false, status: verified.status ?? 400, message: verified.message };
  }

  const inserted = await supabase
    .from("monthly_orders")
    .insert({
      payment_ref: paymentRef,
      platform: params.platform,
      amount: params.amountWon,
      month_key: params.monthKey,
      name: params.input.name.trim().slice(0, 20) || null,
      birth_date: params.input.birthDate,
      calendar_type: params.input.calendarType,
      gender: params.input.gender,
    })
    .select(SELECT)
    .single();

  if (inserted.error || !inserted.data) {
    // 동시에 두 번 눌린 경우 — 먼저 들어간 주문으로 이어 간다
    if (inserted.error?.code === "23505") {
      const raced = await supabase.from("monthly_orders").select(SELECT).eq("payment_ref", paymentRef).maybeSingle();
      if (raced.data) return writeDetail(supabase, raced.data as OrderRow);
    }
    console.error("[monthly-order] insert failed", inserted.error);
    return {
      ok: false,
      status: 503,
      message: "결제는 확인했지만 주문을 저장하지 못했습니다. 잠시 후 다시 열거나 고객센터에 문의해 주세요.",
    };
  }

  return writeDetail(supabase, inserted.data as OrderRow);
}

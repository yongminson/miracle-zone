import type { NewYearDetailInput } from "@/lib/newyear/newyear-types";

/**
 * 웹·구글 앱에는 토스 인앱결제가 없다. 화면 코드(NewYearDetail.tsx)를 앱인토스와
 * 똑같이 두려고 같은 이름의 함수만 둔다. 실제 구현은 miracle-toss 저장소에 있다.
 */
export async function purchaseNewYearOnToss(_input: NewYearDetailInput): Promise<{ orderId: string }> {
  throw new Error("토스 앱에서만 쓸 수 있는 결제입니다.");
}

"use client";

import { useEffect, useState } from "react";

/**
 * 새 유료 상품(이달의 운세·궁합 심층·택일·시즌 운세)은 앱(명운-rn) 1.1.9 부터 구글 결제가 된다.
 * 1.1.9 는 userAgent 에 아래 토큰을 붙인다. 그 전 앱 안에서는 메뉴·버튼을 숨겨
 * "앱 업데이트" 막다른 길을 만들지 않는다. 웹(앱 밖)에서는 늘 보인다.
 */
export const APP_PRODUCT_TOKENS = {
  monthly: "MyeongunIAP/monthly",
  match: "MyeongunIAP/match",
  taekil: "MyeongunIAP/taekil",
  season: "MyeongunIAP/season",
} as const;

export type AppGatedProduct = keyof typeof APP_PRODUCT_TOKENS;

/** 상단 메뉴에서 옛 앱이면 숨기는 별도 페이지 */
export const APP_GATED_MENU_IDS: readonly string[] = ["monthly", "taekil", "season"];

export function hiddenInThisApp(product: AppGatedProduct, ua: string): boolean {
  return ua.includes("MyeongunApp") && !ua.includes(APP_PRODUCT_TOKENS[product]);
}

/** 첫 화면은 서버와 같게(모두 보임) 그린 뒤, 옛 앱이면 숨긴다 */
export function useHiddenInApp(): (product: AppGatedProduct) => boolean {
  const [ua, setUa] = useState("");
  useEffect(() => setUa(navigator.userAgent || ""), []);
  return (product) => hiddenInThisApp(product, ua);
}

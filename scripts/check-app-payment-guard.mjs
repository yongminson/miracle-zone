/**
 * 빌드 전 검사 — 구글 앱(명운-rn WebView) 손님이 결제·저장을 못 하게 되는 실수를 배포 전에 막는다.
 *
 * 2026-10-01 앱이 여는 사이트를 바꾸면서 옛 사이트에만 있던 앱 전용 기능이 빠졌고,
 * 10/10~12 사주 인사이트 결제 8번 실패, 결제 후 PDF·이미지 저장 불가, 제단 광고·10일 결제 불가가 났다.
 *
 * 1) 웹 결제창(포트원 requestPayment)을 여는 모든 곳에 앱 차단(blockWebPaymentInApp)이 있는지
 * 2) 앱 전용 기능 목록(구글 결제 상품·리워드 광고·파일 저장)이 사이트 코드에 모두 남아 있는지
 * 하나라도 빠지면 빌드(배포)를 멈춘다.
 */
import fs from "node:fs";
import path from "node:path";

// 앱(명운-rn app/index.tsx)이 처리하는 기능. 앱에 상품·기능을 더하면 여기에도 적는다.
const APP_PURCHASE_PRODUCTS = [
  "vip_report", // 사주 인사이트 4,400
  "altar_10days", // 기적의 제단 10일 2,200
  "newyear_detail", // 신년운세 상세 3,300
  "monthly_luck", // 이달의 운세 상세 1,100
  "match_deep", // 궁합 심층 2,200
  "taekil", // 택일 2,200
  "lock_basic",
  "lock_color",
  "lock_shine", // 소원 자물쇠
];
const APP_AD_FEATURES = ["altar", "physiognomy", "name", "palmistry"]; // 앱에서는 결제 대신 광고
const APP_FILE_SAVE = ["SAVE_PDF", "SAVE_IMAGE"]; // 앱에서 PDF·이미지 저장

const ROOTS = ["app", "components", "hooks", "lib"];
const problems = [];
let sites = 0;
const sources = []; // [경로, 내용] — /api 서버 코드는 빼고 화면 쪽만

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".") || entry.name === "api") continue;
      walk(p);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      const src = fs.readFileSync(p, "utf8");
      sources.push([p, src]);
      const pays = (src.match(/\.requestPayment\(/g) ?? []).length;
      if (!pays) continue;
      sites += pays;
      const guards = (src.match(/blockWebPaymentInApp\(/g) ?? []).length;
      if (guards < pays) problems.push(`${p}: 결제창 ${pays}곳, 앱 차단 ${guards}곳 — 앱 안에서 웹 결제창이 열릴 수 있어요`);
    }
  }
}
for (const r of ROOTS) if (fs.existsSync(r)) walk(r);

const has = (re) => sources.some(([, src]) => re.test(src));
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

if (!has(/PURCHASE_ITEM/)) problems.push("구글 결제 요청(PURCHASE_ITEM)을 보내는 화면이 하나도 없어요");
for (const id of APP_PURCHASE_PRODUCTS) {
  if (!has(new RegExp(`["']${esc(id)}["']`))) problems.push(`구글 결제 상품 "${id}" 을 쓰는 화면이 없어요 — 앱 손님이 이 상품을 살 수 없어요`);
}
for (const feature of APP_AD_FEATURES) {
  if (!has(new RegExp(`SHOW_REWARDED_AD["'],\\s*feature:\\s*["']${esc(feature)}["']`))) {
    problems.push(`리워드 광고 "${feature}" 요청이 없어요 — 앱 손님이 이 기능을 열 수 없어요`);
  }
  if (!has(new RegExp(`AD_REWARD_GRANTED["'][^\\n]*feature === ["']${esc(feature)}["']`))) {
    problems.push(`리워드 광고 "${feature}" 보상 처리(AD_REWARD_GRANTED)가 없어요 — 광고를 봐도 열리지 않아요`);
  }
}
for (const t of APP_FILE_SAVE) {
  if (!has(new RegExp(`["']${t}["']`))) problems.push(`앱 파일 저장(${t})이 없어요 — 앱 손님이 저장을 못 해요`);
}

if (problems.length) {
  console.error("\n✗ 앱 결제·저장 검사 실패 — 구글 앱 손님이 결제·저장을 못 하게 돼요.");
  for (const p of problems) console.error("  - " + p);
  console.error("  웹 결제창을 열기 전에 lib/payments/app-payment-guard.ts 의 blockWebPaymentInApp() 을 부르고,");
  console.error("  앱 손님은 구글 플레이 결제(PURCHASE_ITEM)나 리워드 광고로, 저장은 lib/app-file-save.ts 로 보내 주세요.\n");
  process.exit(1);
}
console.log(
  `✓ 앱 결제·저장 검사 통과 — 웹 결제창 ${sites}곳 앱 차단, 구글 상품 ${APP_PURCHASE_PRODUCTS.length}개·광고 ${APP_AD_FEATURES.length}개·파일 저장 확인`,
);

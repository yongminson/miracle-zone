/**
 * 빌드 전 검사 — 웹 결제창(포트원 requestPayment)을 여는 모든 곳에 앱 차단(blockWebPaymentInApp)이 있는지.
 *
 * 2026-10-10~12: 사주 인사이트 페이지에 앱 분기가 없어, 구글 앱 손님 결제 8번이 모두 실패했다.
 * 새 결제 화면을 만들 때 같은 실수가 다시 나지 않도록, 빠지면 빌드(배포)를 멈춘다.
 */
import fs from "node:fs";
import path from "node:path";

const ROOTS = ["app", "components", "hooks"];
const problems = [];
let sites = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      walk(p);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      const src = fs.readFileSync(p, "utf8");
      const pays = (src.match(/\.requestPayment\(/g) ?? []).length;
      if (!pays) continue;
      sites += pays;
      const guards = (src.match(/blockWebPaymentInApp\(/g) ?? []).length;
      if (guards < pays) problems.push(`${p}: 결제창 ${pays}곳, 앱 차단 ${guards}곳`);
    }
  }
}
for (const r of ROOTS) if (fs.existsSync(r)) walk(r);

if (problems.length) {
  console.error("\n✗ 앱 결제 검사 실패 — 구글 앱 안에서 웹 결제창이 열릴 수 있어요.");
  for (const p of problems) console.error("  - " + p);
  console.error("  결제창을 열기 전에 lib/payments/app-payment-guard.ts 의 blockWebPaymentInApp() 을 부르고,");
  console.error("  앱 손님은 구글 플레이 결제(PURCHASE_ITEM)나 리워드 광고로 보내 주세요.\n");
  process.exit(1);
}
console.log(`✓ 앱 결제 검사 통과 — 웹 결제창 ${sites}곳 모두 앱 차단 있음`);

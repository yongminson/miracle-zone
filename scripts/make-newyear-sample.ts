/**
 * 신년운세 상세 풀이 견본 만들기 (2026-11-24).
 * 가상의 인물(1992년 3월 14일생 여성 — 사주 인사이트 견본과 같은 사람)로 실제 계산·풀이 생성기를 한 번 돌려
 * public/samples/newyear-sample.json 에 저장한다. 결제 전 "견본 먼저 보기" 화면이 이 파일을 그대로 보여 준다.
 * 풀이 생성기(프롬프트·모델)를 크게 바꾸면 다시 돌릴 것. OpenAI 1~2회 호출.
 *
 *   npx tsx scripts/make-newyear-sample.ts
 */
import fs from "node:fs";
import path from "node:path";
import { calculateNewYear } from "../lib/newyear/newyear-engine";
import { generateNewYearDetail } from "../lib/newyear/newyear-detail-ai";
import type { NewYearDetailInput } from "../lib/newyear/newyear-types";

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const input: NewYearDetailInput = { name: "", birthDate: "1992-03-14", calendarType: "solar", gender: "female" };

async function main() {
  const result = calculateNewYear(input);
  const detail = await generateNewYearDetail(input, result);
  const out = path.join("public", "samples", "newyear-sample.json");
  fs.writeFileSync(out, JSON.stringify({ madeAt: new Date().toISOString().slice(0, 10), input, result, detail }, null, 2) + "\n");
  console.log("저장:", out, "| 영역", detail.areas.length, "| 달", detail.months.length, "| 한 마디:", detail.motto);
}
void main();

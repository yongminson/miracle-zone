// 이름풀이용 한자 원획(原劃)·부수 표 만들기 — 한 번 돌려 lib/name/hanja-strokes.json 을 만든다.
//
// 자료: 유니코드 공식 한자 DB(Unihan) 의 Unihan_IRGSources.txt — kRSUnicode(부수.나머지 획), kTotalStrokes(총획)
//   https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip (2026-11-03 에 받은 Unicode 18.0)
// 쓰는 법: node scripts/build-hanja-strokes.mjs <Unihan_IRGSources.txt 경로>
//
// 성명학은 필획(쓰는 획)이 아니라 원획(부수를 본래 글자로 센 획)을 쓴다.
//   氵→水 4, 扌→手 4, 忄→心 4, 犭→犬 4, 王→玉 5, 礻→示 5, 衤→衣 6, 罒→网 6, 耂→老 6,
//   月(肉)→肉 6, 艹→艸 6, 辶→辵 7, 阝(오른쪽)→邑 7, 阝(왼쪽)→阜 8
//   숫자 한자는 뜻하는 수: 一1 二2 三3 四4 五5 六6 七7 八8 九9 十10
// 부수가 줄어든 모양으로 쓰였는지는 "총획 - 나머지 획"(부수 자리 획수)이 본래 부수 획수보다 작은지로 판단한다.
// (泰 처럼 氺 로 쓰인 글자는 부수 자리가 5획이라 그대로 둔다. 王 처럼 부수 글자 자체는 바꾸지 않는다)
//
// 유니코드 총획은 중국 글자 모양 기준이라 한국 옥편(강희자전 기준)과 다른 글자가 있다(權 21↔22, 健 10↔11, 體 22↔23).
// 그래서 "부수 본래 획 + 나머지 획"(옥편식)도 함께 계산해 둘 중 큰 값을 쓴다. 교육용 한자 1,800자 중 두 값이 다른
// 57자를 옥편과 대조해 보니 큰 값이 맞았고, 둘 다 틀린 몇 자는 OVERRIDE 로 고정했다.
// 결과는 scripts/check-hanja-strokes.mjs 가 성명학 기준 원획과 대조한다(빌드 전 자동 실행).
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { tableData } = require("@seyoungsong/hanjadict");

const FULL_RADICAL = { 61: 4, 64: 4, 85: 4, 94: 4, 96: 5, 113: 5, 122: 6, 125: 6, 130: 6, 140: 6, 145: 6, 162: 7, 163: 7, 170: 8 };
const NUMBERS = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
// 강희자전 214부수 각각의 본래 획수 (1획 6개, 2획 23개, 3획 31개 …)
const RADICAL_STROKES = [0];
for (const [strokes, count] of [[1, 6], [2, 23], [3, 31], [4, 34], [5, 23], [6, 29], [7, 20], [8, 9], [9, 11], [10, 8], [11, 6], [12, 4], [13, 4], [14, 2], [15, 1], [16, 2], [17, 1]]) {
  for (let i = 0; i < count; i += 1) RADICAL_STROKES.push(strokes);
}
// 두 계산이 다 한국 옥편과 어긋나는 글자 — 옥편(강희자전 기준) 획수로 고정
const OVERRIDE = { 延: 7, 御: 11, 毒: 8, 熙: 13, 煕: 13, 考: 8 };

const src = process.argv[2];
if (!src) {
  console.error("사용법: node scripts/build-hanja-strokes.mjs <Unihan_IRGSources.txt>");
  process.exit(1);
}

const rs = new Map();
const total = new Map();
for (const line of fs.readFileSync(src, "utf8").split("\n")) {
  const m = /^U\+([0-9A-F]+)\t(kRSUnicode|kTotalStrokes)\t(.+)$/.exec(line.trim());
  if (!m) continue;
  const ch = String.fromCodePoint(parseInt(m[1], 16));
  const values = m[3].trim().split(/\s+/);
  if (m[2] === "kRSUnicode") rs.set(ch, values);
  else total.set(ch, Number(values[0]));
}

const out = {};
let changed = 0;
// 사전 글자 중 호환 한자(金 → U+F90A 등)는 표준 글자로 바꿔 넣는다 — 입력도 같은 방식(NFC)으로 바꿔 찾는다
const chars = new Set(Object.keys(tableData).map((c) => c.normalize("NFC")));
for (const ch of chars) {
  const cp = ch.codePointAt(0);
  if ([...ch].length !== 1 || cp < 0x3400 || cp > 0x9fff) continue;
  const t = total.get(ch);
  const list = rs.get(ch);
  if (!t || !list) continue;
  // 부수 풀이가 여럿이면(萬: 禸 / 艸) 원획 부수로 쓰인 쪽을 먼저 본다
  const parsed = list
    .map((v) => /^(\d+)'*\.(-?\d+)$/.exec(v))
    .filter(Boolean)
    .map((m) => ({ radical: Number(m[1]), residual: Number(m[2]) }));
  if (!parsed.length) continue;
  const abbreviated = parsed.find(
    (p) => FULL_RADICAL[p.radical] && p.residual > 0 && t - p.residual < FULL_RADICAL[p.radical],
  );
  const { radical, residual } = abbreviated ?? parsed[0];
  let won = abbreviated ? FULL_RADICAL[radical] + residual : t;
  // 옥편식: 부수 본래 획 + 나머지 획 (나머지 획이 0 인 부수 글자 자체·변형 글자는 빼고)
  for (const p of parsed) {
    if (p.residual > 0) won = Math.max(won, RADICAL_STROKES[p.radical] + p.residual);
  }
  if (NUMBERS[ch]) won = NUMBERS[ch];
  else if (OVERRIDE[ch]) won = OVERRIDE[ch];
  if (won !== t) changed += 1;
  out[ch] = [won, radical];
}

const dest = new URL("../lib/name/hanja-strokes.json", import.meta.url);
fs.mkdirSync(new URL(".", dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out));
console.log(`글자 ${Object.keys(out).length}개 (원획으로 바꾼 글자 ${changed}개) → lib/name/hanja-strokes.json`);

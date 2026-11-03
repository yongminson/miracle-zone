import { tableData } from "@seyoungsong/hanjadict";
import { buildFortuneProfile, getSajuStrength, type FortuneBirthTime, type SajuElement } from "@/app/api/fortune/fortune-engine";
import HANJA_STROKES from "./hanja-strokes.json";

/**
 * 이름풀이 계산 — 획수·4격·81수리·자원오행·음양·사주 궁합을 AI 없이 정한다. AI 는 이 결과로 문장만 쓴다.
 *
 * 2026-11-03 전엔 획수·길흉·한자 오행을 AI 가 추측했고, 사주도 계산 없이 생년월일만 AI 에게 줬다.
 * 손님이 획수를 직접 세 보면 틀릴 수 있어(유료 4,900원) 계산으로 바꿨다.
 *
 * - 획수: 성명학 원획(부수를 본래 글자로 센 획). 표는 scripts/build-hanja-strokes.mjs 로 만들고
 *   scripts/check-hanja-strokes.mjs 가 빌드 전에 옥편 값과 대조한다.
 * - 4격: 원격(이름 글자 합)·형격(성+이름 첫 글자)·이격(성+이름 나머지)·정격(전체). 81 을 넘으면 80 을 뺀다.
 * - 자원오행: 부수로 뜻이 분명한 글자만(水·木·火·金·土 계열). 나머지는 획수 끝자리로 보는 수리오행이라고 밝혀 쓴다.
 * - 사주: 오늘의 운세와 같은 만세력 계산(신강·신약, 필요한 기운).
 * 한자를 이름 전체에 넣지 않으면 획수·4격·자원오행은 지어내지 않고 "한자를 넣으면 계산돼요"로 둔다.
 */

type Element = "목" | "화" | "토" | "금" | "수";
const ELEMENT_HANJA: Record<Element, string> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" };
const label = (e: Element) => `${e}(${ELEMENT_HANJA[e]})`;
const FROM_SAJU: Record<SajuElement, Element> = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };
const GENERATES: Record<Element, Element> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };

const STROKES = HANJA_STROKES as unknown as Record<string, [number, number]>;

/** 음령오행 (초성): ㄱㄲㅋ 목 / ㄴㄷㄸㄹㅌ 화 / ㅇㅎ 토 / ㅅㅆㅈㅉㅊ 금 / ㅁㅂㅃㅍ 수 */
const CHOSUNG_ELEMENT: Record<number, Element> = {
  0: "목", 1: "목", 15: "목",
  2: "화", 3: "화", 4: "화", 5: "화", 16: "화",
  11: "토", 18: "토",
  9: "금", 10: "금", 12: "금", 13: "금", 14: "금",
  6: "수", 7: "수", 8: "수", 17: "수",
};
function soundElement(syllable: string): Element | null {
  const code = syllable.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;
  return CHOSUNG_ELEMENT[Math.floor(code / 588)] ?? null;
}

/** 자원오행 — 부수가 그 기운을 뜻하는 글자만 (번호는 강희자전 부수) */
const RADICAL_ELEMENT: Record<number, Element> = {
  75: "목", 115: "목", 118: "목", 120: "목", 140: "목",
  61: "화", 72: "화", 86: "화",
  32: "토", 46: "토", 102: "토",
  96: "금", 112: "금", 167: "금",
  15: "수", 39: "수", 85: "수", 173: "수", 195: "수",
  187: "화",
};
/** 수리오행 — 획수 끝자리 1·2 목, 3·4 화, 5·6 토, 7·8 금, 9·0 수 */
function strokeElement(strokes: number): Element {
  return (["수", "목", "목", "화", "화", "토", "토", "금", "금", "수"] as Element[])[strokes % 10];
}

const DOUBLE_SURNAMES = ["남궁", "황보", "제갈", "사공", "선우", "서문", "독고", "동방", "어금", "망절"];
const DOUBLE_SURNAMES_HANJA = ["南宮", "皇甫", "諸葛", "司空", "鮮于", "西門", "獨孤", "東方"];

type Grade = "길" | "반길" | "흉";
/** 81수리 — [길흉, 격 이름, 뜻] */
const SURI: [Grade, string, string][] = [
  ["길", "태초격", "모든 것의 시작, 큰 뿌리"], ["흉", "분리격", "갈라지고 흔들리기 쉬움"], ["길", "명예격", "이름이 알려지고 지혜가 빛남"],
  ["흉", "부정격", "일이 쉽게 무너지기 쉬움"], ["길", "정성격", "균형 잡혀 성공에 이름"], ["길", "계승격", "물려받은 덕이 커짐"],
  ["길", "독립격", "홀로 서서 밀고 나감"], ["길", "개물격", "꾸준히 쌓아 발전함"], ["흉", "궁박격", "애써도 막히기 쉬움"],
  ["흉", "공허격", "허전하고 결실이 약함"], ["길", "신성격", "새로 일으켜 집안을 세움"], ["흉", "박약격", "힘이 약해 고생이 따름"],
  ["길", "총명격", "재치와 지혜로 이룸"], ["흉", "이산격", "흩어지고 외롭기 쉬움"], ["길", "통솔격", "사람을 모으고 이끎"],
  ["길", "덕망격", "덕으로 재물과 신망을 얻음"], ["길", "건창격", "굳센 의지로 뚫고 나감"], ["길", "발전격", "뜻한 바를 이뤄 번창함"],
  ["흉", "고난격", "재주는 있으나 장애가 많음"], ["흉", "허망격", "공들인 일이 헛되기 쉬움"], ["길", "두령격", "우두머리로 서는 힘"],
  ["흉", "중절격", "중간에 꺾이기 쉬움"], ["길", "공명격", "공을 세워 이름을 떨침"], ["길", "입신격", "스스로 일어나 재물을 모음"],
  ["길", "안강격", "편안하고 재록이 따름"], ["흉", "영웅격", "파란 속에 큰 기복"], ["흉", "대인격", "뜻은 크나 중간에 막힘"],
  ["흉", "파란격", "풍파가 잦음"], ["길", "성공격", "재주로 성공하고 복을 누림"], ["흉", "부몽격", "운이 뜬구름처럼 들쭉날쭉"],
  ["길", "융창격", "지혜와 덕으로 크게 번창"], ["길", "순풍격", "순풍에 돛 단 듯 풀림"], ["길", "승천격", "기세가 하늘로 오름"],
  ["흉", "파멸격", "변고가 잦음"], ["길", "평범격", "온화하고 무난하게 이룸"], ["흉", "의협격", "의리로 나서다 풍파를 겪음"],
  ["길", "인덕격", "인덕으로 출세함"], ["길", "복록격", "재능으로 복록을 얻음"], ["길", "안락격", "부귀와 안락을 누림"],
  ["흉", "무상격", "변화가 심해 지키기 어려움"], ["길", "대공격", "큰 공을 세워 이름을 높임"], ["흉", "고행격", "재주가 많아도 고생이 따름"],
  ["흉", "미혹격", "흔들려 재물이 흩어짐"], ["흉", "마장격", "마가 끼어 막히기 쉬움"], ["길", "대지격", "큰 지혜로 뜻을 이룸"],
  ["흉", "부지격", "애써도 곤궁하기 쉬움"], ["길", "출세격", "길이 열려 크게 펼침"], ["길", "유덕격", "덕망으로 영달함"],
  ["흉", "은퇴격", "기복이 커 물러나기 쉬움"], ["흉", "부몽격", "성패가 엇갈림"], ["반길", "춘추격", "성공과 실패가 번갈아 옴"],
  ["길", "약진격", "기회를 잡아 크게 뜀"], ["흉", "내허격", "겉은 화려하나 속이 빔"], ["흉", "무능격", "애쓴 만큼 거두기 어려움"],
  ["흉", "불안격", "겉과 속이 달라 불안함"], ["흉", "부족격", "뒷심이 모자람"], ["길", "노력격", "노력 끝에 때를 만남"],
  ["길", "후복격", "처음은 고생, 뒤에 복이 옴"], ["흉", "재화격", "뜻밖의 화를 조심"], ["흉", "동요격", "흔들려 방향을 잃기 쉬움"],
  ["길", "영화격", "명예와 재물을 함께 얻음"], ["흉", "고독격", "기운이 쇠하고 외로움"], ["길", "길상격", "만사가 순조로움"],
  ["흉", "쇠멸격", "힘이 빠져 고생함"], ["길", "휘양격", "빛나고 집안이 일어남"], ["흉", "쇠망격", "재액이 따르기 쉬움"],
  ["길", "영달격", "하늘의 복으로 영달함"], ["길", "명지격", "밝은 지혜로 집안을 일으킴"], ["흉", "종말격", "불안이 따름"],
  ["흉", "공허격", "결실이 약함"], ["길", "견실격", "착실하게 끝내 이룸"], ["흉", "상반격", "앞은 좋고 뒤가 어려움"],
  ["길", "평길격", "평온하게 복을 누림"], ["흉", "우매격", "판단이 흐려 막힘"], ["길", "정수격", "지키면 평화로움"],
  ["흉", "선곤격", "먼저 고생하고 늦게 이룸"], ["반길", "전후격", "길흉이 앞뒤로 엇갈림"], ["반길", "선길격", "초반이 좋고 뒤는 평범"],
  ["흉", "종극격", "끝이 흐지부지되기 쉬움"], ["흉", "종결격", "물러나 숨는 기운"], ["길", "환희격", "다시 처음처럼 크게 기쁨"],
];
const GRADE_LABEL: Record<Grade, string> = { 길: "길(吉)", 반길: "반길(半吉)", 흉: "흉(凶)" };

function suri(n: number) {
  const k = n > 81 ? ((n - 1) % 80) + 1 : n;
  const [grade, name, meaning] = SURI[k - 1];
  return { strokes: n, grade, text: `${n}획 — ${GRADE_LABEL[grade]} · ${name}: ${meaning}` };
}

/** 사전 뜻풀이("쇠 금, 성씨 김")에서 한글 음 — 성 자리면 '성씨' 음을 먼저 */
/** 두음법칙 — 성과 이름 첫 글자는 룡→용, 리→이, 라→나, 녀→여 처럼 읽는다 */
function dueum(syllable: string): string {
  const code = syllable.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return syllable;
  const cho = Math.floor(code / 588);
  const jung = Math.floor((code % 588) / 28);
  const jong = code % 28;
  const front = [2, 6, 7, 12, 17, 20].includes(jung); // ㅑ ㅕ ㅖ ㅛ ㅠ ㅣ
  let next = cho;
  if (cho === 5) next = front ? 11 : 2; // ㄹ → ㅇ / ㄴ
  else if (cho === 2 && front) next = 11; // ㄴ → ㅇ
  return String.fromCharCode(0xac00 + next * 588 + jung * 28 + jong);
}

let readingIndex: Map<string, string> | null = null;
function readingOf(hanja: string, surname: boolean): string | null {
  // 사전에는 金 이 호환 한자(U+F90A)로만 있는 식이라 표준 글자로 바꿔 찾는다
  if (!readingIndex) {
    readingIndex = new Map();
    for (const [k, v] of Object.entries(tableData as Record<string, string>)) {
      const key = k.normalize("NFC");
      if (typeof v === "string" && !readingIndex.has(key)) readingIndex.set(key, v);
    }
  }
  const raw = readingIndex.get(hanja.normalize("NFC"));
  if (!raw) return null;
  const parts = raw.split(/[,;]/).map((p) => p.replace(/\([^)]*\)/g, "").trim()).filter(Boolean);
  const pick = (surname && parts.find((p) => p.startsWith("성"))) || parts[0];
  const last = pick?.slice(-1);
  return last && /[가-힣]/.test(last) ? last : null;
}

export type NameInput = {
  name: string;
  hanja?: string;
  /** 글자마다 고른 한자 (빈 칸 = 안 고름). 웹이 보낸다 — 토스는 hanja 만 */
  hanjaSelections?: unknown;
  birthDate?: string;
  birthTime?: string;
  gender?: string;
};

type CharInfo = { hangul: string | null; hanja: string | null; strokes: number | null; element: Element | null; byRadical: boolean };

export type NameAnalysis = {
  displayName: string;
  syllables: string[];
  surnameLength: number;
  chars: CharInfo[];
  /** 한자가 이름 전체에 있어 획수 계산이 됐는지 */
  hanjaComplete: boolean;
  missingHanjaNote: string | null;
  fourGrids: { won: ReturnType<typeof suri>; hyeong: ReturnType<typeof suri>; i: ReturnType<typeof suri>; jeong: ReturnType<typeof suri> } | null;
  yinYang: { pattern: string; balanced: boolean } | null;
  sound: { elements: (Element | null)[]; flow: ("상생" | "상극" | "같음" | null)[] };
  saju: {
    dayMaster: string;
    dayMasterElement: Element;
    strong: boolean;
    favorable: Element[];
    /** 이름(자원·수리오행) 가운데 필요한 기운에 해당하는 것 */
    filled: Element[];
  } | null;
  score: number;
  grade: string;
  renameNeeded: "낮음" | "보통" | "높음";
  fields: {
    yinYangBalance: string;
    strokes: { won: string; hyeong: string; i: string; jeong: string };
    pronunciation: string;
    resource: string;
    sajuRelation: string;
  };
};

function flowOf(a: Element | null, b: Element | null): "상생" | "상극" | "같음" | null {
  if (!a || !b) return null;
  if (a === b) return "같음";
  if (GENERATES[a] === b || GENERATES[b] === a) return "상생";
  return "상극";
}

export function analyzeName(input: NameInput): NameAnalysis {
  const rawName = String(input.name ?? "").replace(/\s+/g, "");
  const hanjaText = [...String(input.hanja ?? "").normalize("NFC")].filter((c) => /\p{Script=Han}/u.test(c));
  const nameHanja = [...rawName.normalize("NFC")].filter((c) => /\p{Script=Han}/u.test(c));
  let syllables = [...rawName].filter((c) => /[가-힣]/.test(c));
  let hanja: (string | null)[] = [];

  if (!syllables.length && nameHanja.length) {
    // 한자만 넣은 경우 — 사전에서 음을 찾는다
    hanja = nameHanja;
    const twoSurname = DOUBLE_SURNAMES_HANJA.includes(nameHanja.slice(0, 2).join(""));
    const surLen = twoSurname ? 2 : 1;
    syllables = nameHanja.map((h, i) => {
      const r = readingOf(h, i < surLen);
      return r ? (i <= surLen ? dueum(r) : r) : "?";
    });
  } else {
    const selections = Array.isArray(input.hanjaSelections) ? input.hanjaSelections : null;
    if (selections && selections.length === syllables.length) {
      hanja = selections.map((s) => (typeof s === "string" && s.trim() ? s.trim().normalize("NFC") : null));
    } else if (hanjaText.length === syllables.length) {
      hanja = hanjaText;
    } else {
      hanja = syllables.map(() => null);
    }
  }

  const surnameLength =
    syllables.length >= 3 && (DOUBLE_SURNAMES.includes(syllables.slice(0, 2).join("")) || DOUBLE_SURNAMES_HANJA.includes(hanja.slice(0, 2).join("")))
      ? 2
      : 1;

  const chars: CharInfo[] = syllables.map((s, i) => {
    const h = hanja[i] ?? null;
    const row = h ? STROKES[h] : undefined;
    const strokes = row ? row[0] : null;
    const radicalEl = row ? RADICAL_ELEMENT[row[1]] : undefined;
    return {
      hangul: /[가-힣]/.test(s) ? s : null,
      hanja: h,
      strokes,
      element: radicalEl ?? (strokes ? strokeElement(strokes) : null),
      byRadical: !!radicalEl,
    };
  });

  const unknown = chars.filter((c) => c.hanja && c.strokes === null).map((c) => c.hanja);
  const hanjaComplete = chars.length >= 2 && chars.every((c) => c.strokes !== null);
  const missingHanjaNote = hanjaComplete
    ? null
    : unknown.length
      ? `획수 자료에 없는 한자(${unknown.join("")})가 있어 획수는 계산하지 않았어요`
      : hanja.some(Boolean)
        ? "이름의 모든 글자에 한자를 고르면 획수가 계산돼요"
        : "한자를 넣으면 획수가 계산돼요";

  let fourGrids: NameAnalysis["fourGrids"] = null;
  let yinYang: NameAnalysis["yinYang"] = null;
  if (hanjaComplete) {
    const n = chars.map((c) => c.strokes as number);
    const sur = n.slice(0, surnameLength).reduce((a, b) => a + b, 0);
    const given = n.slice(surnameLength);
    const givenSum = given.reduce((a, b) => a + b, 0);
    fourGrids = {
      won: suri(Math.max(1, givenSum)),
      hyeong: suri(sur + (given[0] ?? 0)),
      i: suri(sur + given.slice(1).reduce((a, b) => a + b, 0)),
      jeong: suri(sur + givenSum),
    };
    const marks = n.map((x) => (x % 2 === 1 ? "양" : "음"));
    const balanced = marks.includes("양") && marks.includes("음");
    yinYang = { pattern: marks.join("-"), balanced };
  }

  const soundEls = chars.map((c) => (c.hangul ? soundElement(c.hangul) : null));
  const sound = { elements: soundEls, flow: soundEls.slice(1).map((e, i) => flowOf(soundEls[i], e)) };

  // 사주 — 오늘의 운세와 같은 계산
  let saju: NameAnalysis["saju"] = null;
  if (input.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)) {
    try {
      const profile = buildFortuneProfile({
        birthDate: input.birthDate,
        calendarType: "solar",
        birthTime: (input.birthTime || "unknown") as FortuneBirthTime,
        gender: input.gender === "female" || input.gender === "여성" ? "female" : "male",
      });
      const { isStrong, favorable } = getSajuStrength(profile.dayMasterElement, profile.elementCounts);
      const fav = favorable.map((e) => FROM_SAJU[e]);
      const nameEls = (hanjaComplete ? chars.map((c) => c.element) : soundEls).filter(Boolean) as Element[];
      saju = {
        dayMaster: `${profile.dayPillar.stem}(${profile.dayPillar.stemHanja})`,
        dayMasterElement: FROM_SAJU[profile.dayMasterElement],
        strong: isStrong,
        favorable: fav,
        filled: [...new Set(nameEls.filter((e) => fav.includes(e)))],
      };
    } catch {
      saju = null;
    }
  }

  // 점수 — 4격 길흉, 음양, 소리 흐름, 사주 보완
  let score: number;
  if (fourGrids && yinYang) {
    score = 50;
    for (const g of [fourGrids.won, fourGrids.hyeong, fourGrids.i, fourGrids.jeong]) score += g.grade === "길" ? 10 : g.grade === "반길" ? 3 : -8;
    score += yinYang.balanced ? 5 : -5;
  } else {
    score = 62;
  }
  for (const f of sound.flow) score += f === "상생" ? 3 : f === "상극" ? -3 : 0;
  if (saju) score += saju.filled.length ? 4 + saju.filled.length * 2 : -2;
  score = Math.round(Math.max(35, Math.min(fourGrids ? 97 : 88, score)));
  const grade = score >= 88 ? "A+" : score >= 80 ? "A" : score >= 72 ? "B+" : score >= 64 ? "B" : score >= 55 ? "C" : "D";
  const badGrids = fourGrids ? [fourGrids.won, fourGrids.hyeong, fourGrids.i, fourGrids.jeong].filter((g) => g.grade === "흉").length : 0;
  // 개명은 4격 흉이 겹치고 다른 장점으로도 메워지지 않을 때만 높음
  const renameNeeded: NameAnalysis["renameNeeded"] = fourGrids
    ? badGrids >= 3 || (badGrids === 2 && score < 72) ? "높음" : badGrids >= 1 ? "보통" : "낮음"
    : score < 60 ? "보통" : "낮음";

  const note = missingHanjaNote ?? "";
  const displayName = syllables.join("");
  const fields: NameAnalysis["fields"] = {
    yinYangBalance: yinYang
      ? `${yinYang.pattern} (${yinYang.balanced ? "음양이 섞인 조화로운 배열" : "한쪽으로 쏠린 배열"}) — 획수 홀수는 양, 짝수는 음`
      : note,
    strokes: fourGrids
      ? { won: fourGrids.won.text, hyeong: fourGrids.hyeong.text, i: fourGrids.i.text, jeong: fourGrids.jeong.text }
      : { won: note, hyeong: note, i: note, jeong: note },
    pronunciation:
      chars.map((c, i) => `${c.hangul ?? "?"}(${soundEls[i] ? ELEMENT_HANJA[soundEls[i] as Element] : "?"})`).join("-") +
      (sound.flow.some(Boolean) ? ` · 소리 흐름: ${sound.flow.map((f) => f ?? "?").join(" → ")}` : ""),
    resource: hanjaComplete
      ? chars
          .map((c) => `${c.hanja}(${c.strokes}획)-${label(c.element as Element)}${c.byRadical ? "" : "·획수 기준"}`)
          .join(", ") + (chars.every((c) => c.byRadical) ? "" : " ※ 부수로 오행이 정해지지 않는 글자는 획수 끝자리(수리오행)로 봄")
      : note,
    sajuRelation: saju
      ? `일간 ${saju.dayMaster}·${label(saju.dayMasterElement)} ${saju.strong ? "신강" : "신약"} → 필요한 기운 ${saju.favorable.map(label).join("·")} / ` +
        (saju.filled.length
          ? `이름이 ${saju.filled.map(label).join("·")} 기운으로 채워 줌`
          : `이름에 필요한 기운을 직접 채우는 글자가 없음`) +
        (hanjaComplete ? "" : " (한글 소리 기준)")
      : "생년월일을 넣으면 사주와 맞춰 봐요",
  };

  return {
    displayName,
    syllables,
    surnameLength,
    chars,
    hanjaComplete,
    missingHanjaNote,
    fourGrids,
    yinYang,
    sound,
    saju,
    score,
    grade,
    renameNeeded,
    fields,
  };
}

/** AI 에게 넘기는 계산 근거 — 이 내용과 어긋나는 말을 쓰지 않게 한다 */
export function describeNameFacts(a: NameAnalysis): string {
  const lines = [
    `이름: ${a.displayName}${a.chars.some((c) => c.hanja) ? ` (${a.chars.map((c) => c.hanja ?? "?").join("")})` : ""}, 성 ${a.surnameLength}글자`,
    `음령오행(한글 소리): ${a.fields.pronunciation}`,
  ];
  if (a.fourGrids) {
    lines.push(
      `한자 원획: ${a.chars.map((c) => `${c.hanja} ${c.strokes}획`).join(", ")}`,
      `4격: 원격 ${a.fourGrids.won.text} / 형격 ${a.fourGrids.hyeong.text} / 이격 ${a.fourGrids.i.text} / 정격 ${a.fourGrids.jeong.text}`,
      `음양: ${a.fields.yinYangBalance}`,
      `자원오행: ${a.fields.resource}`,
    );
  } else {
    lines.push(`한자: ${a.missingHanjaNote} — 획수·4격·자원오행은 말하지 마세요`);
  }
  lines.push(`사주와의 관계: ${a.fields.sajuRelation}`);
  lines.push(`계산 점수: ${a.score}점, 등급 ${a.grade}, 개명 필요성 ${a.renameNeeded}`);
  return lines.join("\n");
}

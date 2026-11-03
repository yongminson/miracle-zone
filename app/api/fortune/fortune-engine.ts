import KoreanLunarCalendar from "korean-lunar-calendar";
import { Solar } from "lunar-javascript";
import { calculateDayLuck } from "@/lib/calendar/day-luck";
import { CLASH, isHarmony, tenGodForStem } from "@/lib/newyear/newyear-engine";

export type FortuneGender = "male" | "female";
export type FortuneCalendarType = "solar" | "lunar" | "lunar-leap";
export type FortuneBirthTime =
  | "unknown" | "ja" | "chuk" | "in" | "myo" | "jin" | "sa" | "o" | "mi" | "sin" | "yu" | "sul" | "hae";

export type FortuneCategoryId = "total" | "love" | "money" | "work" | "study" | "health";

export type FortuneEngineInput = {
  gender: FortuneGender;
  birthDate: string;
  calendarType: FortuneCalendarType;
  birthTime: FortuneBirthTime | string;
};

export type SajuElement = "wood" | "fire" | "earth" | "metal" | "water";

export type SajuPillar = {
  stem: string; branch: string; stemHanja: string; branchHanja: string; element: SajuElement;
};

export type SajuFourPillars = { year: SajuPillar; month: SajuPillar; day: SajuPillar; time: SajuPillar | null; };

export type FortuneScoreMap = Record<FortuneCategoryId, number>;
export type FortuneTextMap = Record<FortuneCategoryId, string>;
export type ElementCountMap = Record<SajuElement, number>;

export type FortuneEngineProfile = {
  raw: { gender: FortuneGender; birthDate: string; calendarType: FortuneCalendarType; birthTime: string; };
  labels: { genderLabel: string; calendarLabel: string; timeLabel: string; };
  seedKey: string; summaryText: string; baseNumber: number;
  yearPillar: SajuPillar; monthPillar: SajuPillar; dayPillar: SajuPillar; timePillar: SajuPillar | null;
  fourPillars: SajuFourPillars; elementCounts: ElementCountMap;
  dominantElement: SajuElement; weakestElement: SajuElement; dayMasterElement: SajuElement;
  todayPillar?: SajuPillar;
  isStrongDayMaster?: boolean;
  isFavorableDay?: boolean;
  branchRelation?: string;
  /** 오늘 천간이 내 일간에게 어떤 십성인지(비견~정인) */
  todayTenGod?: string;
  todayTenGodMeaning?: string;
  /** 오늘의 행운 오행·색·방향과 조심할 점 */
  luck?: { element: SajuElement; color: string; direction: string; reason: string; caution: string };
  /** 오늘 지지와 원국 지지의 충·합 ("일지 충" 등) */
  branchNotes?: string[];
  dailyGuide?: { point: string; strategy: string; action: string; };
  freeScores: FortuneScoreMap; freeTexts: FortuneTextMap;
};

const HEAVENLY_STEMS = [
  { korean: "갑", hanja: "甲", element: "wood" as const }, { korean: "을", hanja: "乙", element: "wood" as const },
  { korean: "병", hanja: "丙", element: "fire" as const }, { korean: "정", hanja: "丁", element: "fire" as const },
  { korean: "무", hanja: "戊", element: "earth" as const }, { korean: "기", hanja: "己", element: "earth" as const },
  { korean: "경", hanja: "庚", element: "metal" as const }, { korean: "신", hanja: "辛", element: "metal" as const },
  { korean: "임", hanja: "壬", element: "water" as const }, { korean: "계", hanja: "癸", element: "water" as const },
];

const EARTHLY_BRANCHES = [
  { korean: "자", hanja: "子", element: "water" as const }, { korean: "축", hanja: "丑", element: "earth" as const },
  { korean: "인", hanja: "寅", element: "wood" as const }, { korean: "묘", hanja: "卯", element: "wood" as const },
  { korean: "진", hanja: "辰", element: "earth" as const }, { korean: "사", hanja: "巳", element: "fire" as const },
  { korean: "오", hanja: "午", element: "fire" as const }, { korean: "미", hanja: "未", element: "earth" as const },
  { korean: "신", hanja: "申", element: "metal" as const }, { korean: "유", hanja: "酉", element: "metal" as const },
  { korean: "술", hanja: "戌", element: "earth" as const }, { korean: "해", hanja: "亥", element: "water" as const },
];

const TIME_LABELS: Record<string, string> = {
  unknown: "모름", ja: "자시(23~01)", chuk: "축시(01~03)", in: "인시(03~05)", myo: "묘시(05~07)",
  jin: "진시(07~09)", sa: "사시(09~11)", o: "오시(11~13)", mi: "미시(13~15)", sin: "신시(15~17)",
  yu: "유시(17~19)", sul: "술시(19~21)", hae: "해시(21~23)",
};

function hashString(seed: string): number { let hash = 0; for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0; return hash; }
function normalizeGenderLabel(gender: FortuneGender): string { return gender === "male" ? "남성" : "여성"; }
function normalizeCalendarLabel(calendarType: FortuneCalendarType): string { if (calendarType === "solar") return "양력"; if (calendarType === "lunar") return "음력 평달"; return "음력 윤달"; }
function normalizeTimeLabel(birthTime: string): string { return TIME_LABELS[birthTime] || "모름"; }

// 음력(평달·윤달) 생일을 실제 음력 달력으로 양력 날짜로 바꾼다.
// 2026-10-11 수정: 예전엔 29일(윤달 59일)을 더하는 가짜 변환이라 음력 입력의 사주가 전부 틀렸다.
function adjustLunarDate(dateStr: string, calType: FortuneCalendarType): string {
  if (calType === "solar") return dateStr;
  const [y, m, d] = dateStr.split("-").map(Number);
  const cal = new KoreanLunarCalendar();
  if (!cal.setLunarDate(y, m, d, calType === "lunar-leap")) {
    throw new Error(calType === "lunar-leap" ? "그해에는 그 달의 윤달이 없어요. 음력 평달로 다시 확인해 주세요." : "음력 날짜를 확인해 주세요.");
  }
  const solar = cal.getSolarCalendar();
  return `${solar.year}-${String(solar.month).padStart(2, "0")}-${String(solar.day).padStart(2, "0")}`;
}

// 년·월·일주는 절기(입춘·각 달의 절입)와 실제 60갑자 날짜로 계산한다 — VIP·신년운세·운세 캘린더와 같은 만세력.
// 시간은 시진(자·축…)만 받으므로 그날 정오 기준으로 본다.
function eightCharOf(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar().getEightChar();
}

function pillarFromGanji(ganji: string): SajuPillar {
  const stem = HEAVENLY_STEMS.find((item) => item.hanja === ganji[0]);
  const branch = EARTHLY_BRANCHES.find((item) => item.hanja === ganji[1]);
  if (!stem || !branch) throw new Error(`간지를 해석하지 못했습니다: ${ganji}`);
  return { stem: stem.korean, branch: branch.korean, stemHanja: stem.hanja, branchHanja: branch.hanja, element: stem.element };
}


function getTimeStemStartIndex(dayStem: string): number {
  if (dayStem === "갑" || dayStem === "기") return 0; if (dayStem === "을" || dayStem === "경") return 2;
  if (dayStem === "병" || dayStem === "신") return 4; if (dayStem === "정" || dayStem === "임") return 6; return 8;
}

// 2026-10-11 수정: 예전엔 1984-02-02 를 갑자일로 놓고 셌는데 그날은 병인일이라, 모든 일주(와 시주)가 이틀씩 틀렸다.
function calculateDayPillar(actualDate: string): SajuPillar {
  return pillarFromGanji(eightCharOf(actualDate).getDay());
}

function calculateTimePillar(dayPillar: SajuPillar, birthTime: string): SajuPillar | null {
  if (birthTime === "unknown") return null;
  const tMap: Record<string, {k:string, h:string}> = { ja:{k:"자",h:"子"}, chuk:{k:"축",h:"丑"}, in:{k:"인",h:"寅"}, myo:{k:"묘",h:"卯"}, jin:{k:"진",h:"辰"}, sa:{k:"사",h:"巳"}, o:{k:"오",h:"午"}, mi:{k:"미",h:"未"}, sin:{k:"신",h:"申"}, yu:{k:"유",h:"酉"}, sul:{k:"술",h:"戌"}, hae:{k:"해",h:"亥"} };
  const tb = tMap[birthTime]; const branchIndex = EARTHLY_BRANCHES.findIndex((i) => i.korean === tb.k);
  const stem = HEAVENLY_STEMS[(getTimeStemStartIndex(dayPillar.stem) + branchIndex) % 10];
  return { stem: stem.korean, branch: tb.k, stemHanja: stem.hanja, branchHanja: tb.h, element: stem.element };
}

function countElements(fourPillars: SajuFourPillars): ElementCountMap {
  const counts = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  const pillars = [fourPillars.year, fourPillars.month, fourPillars.day, fourPillars.time].filter(Boolean) as SajuPillar[];
  pillars.forEach(p => {
    counts[p.element] += 1;
    const branch = EARTHLY_BRANCHES.find(b => b.korean === p.branch)!;
    if (p === fourPillars.month) counts[branch.element] += 2.5; else counts[branch.element] += 1;
  });
  return counts;
}

function getDominantElement(counts: ElementCountMap): SajuElement { return (Object.entries(counts) as [SajuElement, number][]).sort((a, b) => b[1] - a[1])[0][0]; }
function getWeakestElement(counts: ElementCountMap): SajuElement { return (Object.entries(counts) as [SajuElement, number][]).sort((a, b) => a[1] - b[1])[0][0]; }

function getSajuRelation(me: SajuElement, target: SajuElement): string {
  if (me === target) return "same";
  if ((me==="wood"&&target==="earth") || (me==="fire"&&target==="metal") || (me==="earth"&&target==="water") || (me==="metal"&&target==="wood") || (me==="water"&&target==="fire")) return "conquers";
  if ((me==="wood"&&target==="metal") || (me==="fire"&&target==="water") || (me==="earth"&&target==="wood") || (me==="metal"&&target==="fire") || (me==="water"&&target==="earth")) return "conqueredBy";
  if ((me==="wood"&&target==="fire") || (me==="fire"&&target==="earth") || (me==="earth"&&target==="metal") || (me==="metal"&&target==="water") || (me==="water"&&target==="wood")) return "produces";
  return "producedBy";
}

function getSajuStrength(dayMaster: SajuElement, counts: ElementCountMap) {
  const elements: SajuElement[] = ["wood", "fire", "earth", "metal", "water"];
  const idx = elements.indexOf(dayMaster);
  const produces = elements[(idx + 1) % 5];
  const conquers = elements[(idx + 2) % 5];
  const conqueredBy = elements[(idx + 3) % 5];
  const producedBy = elements[(idx + 4) % 5];

  const support = counts[dayMaster] + counts[producedBy];
  const drain = counts[produces] + counts[conquers] + counts[conqueredBy];

  const isStrong = support > drain;
  const favorable = isStrong ? [produces, conquers, conqueredBy] : [dayMaster, producedBy];

  return { isStrong, favorable, support, drain };
}

// ───────────── 오늘의 운세 (2026-11-03 다시 짬) ─────────────
// 예전엔 오늘 일진의 "천간 오행 5가지"만 봐서 한 사람의 결과가 5~7가지뿐이었다 — 이틀씩 같은 결과가 이어지고
// 10일마다 똑같은 점수·문장이 돌아왔다(블로그 캡처 7/7 과 11/3 이 글자까지 같았다). 흉한 날엔 모든 점수가 55로 깔렸다.
// 이제는 손님 원국과 오늘 일진을 이렇게 본다(60갑자 한 바퀴 = 60일 안에선 같은 날이 없다):
//  - 오늘 천간이 내 일간에게 어떤 십성인지(음양까지 구분해 10가지) — 운세 캘린더·아침 알림과 같은 계산(lib/calendar/day-luck.ts)
//  - 내 원국이 신강/신약인지, 오늘 천간·지지 오행이 나에게 필요한 기운인지
//  - 오늘 지지가 일지(나·배우자 자리)·월지(사회·직장 자리)·년지(가족·윗사람 자리)와 충·합인지
//  - 남성은 재성, 여성은 관성이 이성의 별(연애 점수·문장이 성별로 다르다)
// 무작위 숫자는 쓰지 않는다. 같은 사람·같은 날이면 언제 봐도 같고, 이유를 설명할 수 있는 결과만 낸다.

const ELEMENT_KO: Record<SajuElement, { ko: string; hanja: string }> = {
  wood: { ko: "목", hanja: "木" }, fire: { ko: "화", hanja: "火" }, earth: { ko: "토", hanja: "土" },
  metal: { ko: "금", hanja: "金" }, water: { ko: "수", hanja: "水" },
};

export function elementLabel(element: SajuElement): string {
  return `${ELEMENT_KO[element].ko}(${ELEMENT_KO[element].hanja})`;
}

const ELEMENT_LUCK: Record<SajuElement, { color: string; direction: string }> = {
  wood: { color: "초록색·청록색", direction: "동쪽" },
  fire: { color: "빨간색·주황색", direction: "남쪽" },
  earth: { color: "노란색·베이지색", direction: "중앙(멀리 가기보다 가까운 곳)" },
  metal: { color: "흰색·은색", direction: "서쪽" },
  water: { color: "검은색·남색", direction: "북쪽" },
};

type CategoryDelta = { money: number; love: number; loveMale?: number; loveFemale?: number; work: number; study: number; health: number };

type TenGodInfo = {
  meaning: string;
  strategy: string;
  caution: string;
  delta: CategoryDelta;
  love: string;
  loveMale?: string;
  loveFemale?: string;
  money: string;
  work: string;
  study: string;
  health: string;
};

// 십성별 오늘의 성격. 점수 delta 는 "오늘 총운" 대비 각 항목이 얼마나 위·아래인지(명리 기본: 재성=돈, 관성=직장, 인성=공부, 식상=표현·여유,
// 남성 재성·여성 관성=이성). 문장은 사건을 예언하지 않고 "오늘 이런 일에 힘을 쓰면 좋다"로 쓴다.
const TEN_GOD_INFO: Record<string, TenGodInfo> = {
  비견: {
    meaning: "나와 같은 기운이 하나 더 들어오는 날(친구·동료의 기운)",
    strategy: "내 생각에 힘이 실리는 날이에요. 내 방식만 고집하지 말고 같이 가는 쪽을 고르면 결과가 커져요.",
    caution: "자존심 싸움으로 번지기 쉬워요. 이기려 하기보다 같이 가는 쪽을 고르세요.",
    delta: { money: -4, love: -2, loveMale: -4, work: 2, study: 2, health: 6 },
    love: "편한 친구 같은 분위기가 강한 날이에요. 고집보다 맞장구가 관계를 부드럽게 해요.",
    money: "들어오는 돈보다 나눠 쓰는 돈이 생기기 쉬운 날이에요. 모임비·공동 지출은 기준을 먼저 정해 두세요.",
    work: "동료와 손발이 잘 맞는 날이에요. 혼자 붙잡고 있던 일을 같이 하자고 제안해 보세요.",
    study: "같이 공부할 때 효과가 큰 날이에요. 비슷한 목표를 가진 사람과 진도를 맞춰 보세요.",
    health: "체력과 회복력이 받쳐 주는 날이에요. 미뤄 둔 운동을 다시 시작하기 좋아요.",
  },
  겁재: {
    meaning: "나와 오행은 같고 음양이 다른 기운이라 경쟁심과 승부욕이 커지는 날",
    strategy: "벌기보다 지키는 날이에요. 남과 비교하는 마음을 내려놓으면 손해 볼 일이 줄어요.",
    caution: "경쟁에서 이기려다 사람을 잃기 쉬워요. 한 발 양보하는 것이 오늘의 지혜예요.",
    delta: { money: -10, love: -2, loveMale: -8, work: 0, study: 2, health: 3 },
    love: "자존심이 앞서기 쉬운 날이에요. 이기려는 대화보다 마음을 묻는 대화가 좋아요.",
    loveMale: "주변 시선이나 비교에 마음이 쓰이기 쉬워요. 다른 사람 이야기보다 상대에게만 집중하세요.",
    money: "나갈 돈이 생기기 쉬운 기운이에요(겁재는 재물을 나누는 별). 큰 결제·투자 결정은 하루 미루고 지출 기록부터 해 보세요.",
    work: "경쟁 구도에서 승부욕이 살아나요. 성과는 챙기되 공은 나누면 뒤탈이 없어요.",
    study: "경쟁심이 집중력으로 바뀌는 날이에요. 시간 재고 문제 풀기처럼 나와 겨루는 공부가 잘 맞아요.",
    health: "에너지는 넘치지만 무리하기 쉬워요. 운동은 평소 강도에서 멈추세요.",
  },
  식신: {
    meaning: "내가 만들어 내는 기운(재능·여유·먹을 복)이 흐르는 날",
    strategy: "즐기면서 하는 일이 성과로 이어지는 날이에요. 부담보다 재미를 기준으로 일을 고르세요.",
    caution: "편안함이 늘어짐이 되지 않게, 마감 하나만은 꼭 지키세요.",
    delta: { money: 6, love: 4, work: 2, study: 4, health: 8 },
    love: "표현이 자연스러워지는 날이에요. 맛있는 식사나 소소한 선물이 마음을 잘 전해 줘요.",
    money: "재능과 손재주가 돈이 되는 흐름이에요(식신은 재물을 낳는 별). 부업·판매·작은 수익 아이디어를 실행해 보세요.",
    work: "아이디어가 잘 떠오르고 손이 빨라져요. 기획·제작처럼 결과물을 내는 일에 시간을 쓰세요.",
    study: "이해가 부드럽게 되는 날이에요. 새 단원이나 새 과목을 시작하기 좋아요.",
    health: "소화와 컨디션이 편안한 흐름이에요. 과식만 조심하면 몸이 가벼워요.",
  },
  상관: {
    meaning: "내가 만들어 내는 기운 중 날카로운 쪽이라 표현력과 비판력이 커지는 날",
    strategy: "틀을 바꾸고 싶은 마음이 커지는 날이에요. 바꾸고 싶은 점은 감정이 아니라 근거로 말하세요.",
    caution: "윗사람·규칙에 대한 반박은 바로 하지 말고 메모로 남겨 두세요.",
    delta: { money: 4, love: 0, loveMale: 2, loveFemale: -8, work: -8, study: 2, health: -3 },
    love: "재치 있는 말이 매력이 되는 날이에요. 농담의 선만 지키면 분위기가 살아나요.",
    loveFemale: "서운한 점을 날카롭게 말하기 쉬운 날이에요(상관은 관성을 누르는 별). 지적보다 바라는 점을 말하면 관계가 지켜져요.",
    money: "새로운 방법으로 돈을 벌 아이디어가 떠올라요. 실행 전에 숫자로 한 번 계산해 보세요.",
    work: "개선 아이디어는 빛나지만 윗사람과 부딪히기 쉬워요. 제안은 문서로, 말투는 부드럽게 하세요.",
    study: "외우기보다 내 말로 설명해 보는 공부가 잘 맞아요. 글쓰기·발표 준비에 좋아요.",
    health: "신경이 예민해지기 쉬워요. 카페인을 줄이고 자기 전 화면 보는 시간을 줄이세요.",
  },
  편재: {
    meaning: "내가 다스리는 기운(재물·활동 무대)이 크게 열리는 날",
    strategy: "기회는 밖에 있는 날이에요. 사람을 만나고 움직일수록 운이 커져요.",
    caution: "욕심은 반만 내세요. 큰돈이 걸린 결정은 한 번 더 확인하세요.",
    delta: { money: 10, love: 2, loveMale: 10, work: 2, study: -6, health: 0 },
    love: "활동 범위가 넓어져 새로운 사람을 만날 기회가 생겨요. 모임에 얼굴을 비춰 보세요.",
    loveMale: "이성과의 인연이 활발해지는 날이에요(남성에게 재성은 이성의 별). 먼저 연락하면 반응이 좋아요.",
    money: "움직인 만큼 돈의 흐름이 생기는 날이에요. 새 제안·거래는 들어 보되, 금액이 크면 조건을 문서로 남기세요.",
    work: "영업·외근·협상처럼 밖으로 뛰는 일에 힘이 실려요.",
    study: "마음이 밖으로 향해 책상 앞이 답답할 수 있어요(재성은 인성을 누르는 별). 공부 시간을 짧게 쪼개세요.",
    health: "활동량이 많아지는 날이에요. 이동이 많다면 물을 자주 챙기세요.",
  },
  정재: {
    meaning: "내가 다스리는 기운 중 안정된 쪽으로, 성실한 수입과 정리의 기운",
    strategy: "성실하게 한 만큼 돌아오는 날이에요. 큰 한 방보다 꾸준함을 믿으세요.",
    caution: "아끼는 건 좋지만 꼭 필요한 지출까지 미루진 마세요.",
    delta: { money: 12, love: 2, loveMale: 12, work: 4, study: -4, health: 2 },
    love: "차분하고 현실적인 대화가 잘 통하는 날이에요. 함께할 계획을 구체적으로 이야기해 보세요.",
    loveMale: "안정적인 관계에 힘이 실려요(남성에게 정재는 배우자의 별). 약속을 잘 지키는 모습이 신뢰를 줘요.",
    money: "들어온 돈을 지키고 불리기 좋은 날이에요. 가계부·정산·저축 자동이체를 정리해 보세요.",
    work: "꼼꼼함이 인정받는 날이에요. 서류·숫자·마감 관리를 오늘 끝내 두세요.",
    study: "계획표대로 차근차근 하기 좋은 날이에요. 새 과목보다 복습이 더 잘 맞아요.",
    health: "생활 리듬을 바로잡기 좋아요. 정해진 시간에 먹고 자는 것만으로 컨디션이 올라가요.",
  },
  편관: {
    meaning: "나를 누르는 기운 중 강한 쪽이라 압박과 책임이 커지는 날",
    strategy: "버티는 힘이 실력이 되는 날이에요. 다 잘하려 하기보다 꼭 해야 할 것만 고르세요.",
    caution: "급한 운전·위험한 운동·밤샘은 피하세요. 오늘은 몸이 먼저예요.",
    delta: { money: -3, love: -2, loveFemale: 8, work: 4, study: 0, health: -10 },
    love: "피곤함이 말투에 묻어나기 쉬워요. 오늘은 길게 이야기하기보다 짧고 따뜻하게 말해 보세요.",
    loveFemale: "강한 끌림이 생기기 쉬운 날이에요(여성에게 관성은 이성의 별). 다만 서두르지 말고 상대를 지켜보세요.",
    money: "의무적인 지출(세금·수리비·경조사)이 생기기 쉬운 기운이에요. 예비비를 남겨 두세요.",
    work: "어려운 일이 맡겨지기 쉽지만 해내면 평가가 확 달라져요. 혼자 끌어안지 말고 도움을 요청하세요.",
    study: "부담이 큰 만큼 집중력도 생겨요. 시간을 정해 두고 몰아서 하세요.",
    health: "스트레스가 몸으로 오기 쉬운 날이에요. 어깨·목 긴장을 풀고 일찍 쉬세요.",
  },
  정관: {
    meaning: "나를 다스리는 기운 중 바른 쪽으로, 명예와 인정의 기운",
    strategy: "원칙대로 할수록 인정받는 날이에요. 지름길보다 정해진 절차를 따르세요.",
    caution: "규칙과 약속을 어기면 평소보다 크게 보여요. 시간 약속을 꼭 지키세요.",
    delta: { money: 2, love: 2, loveFemale: 12, work: 12, study: 4, health: 0 },
    love: "믿음직한 모습이 매력이 되는 날이에요. 약속 장소와 시간을 먼저 챙겨 보세요.",
    loveFemale: "좋은 인연·진지한 관계에 힘이 실리는 날이에요(여성에게 정관은 배우자의 별). 진지한 이야기를 꺼내기 좋아요.",
    money: "안정적인 수입과 정산에 유리한 날이에요. 급여·계약 조건을 정리하거나 협상하기 좋아요.",
    work: "노력이 제대로 평가받기 쉬운 날이에요. 결과 보고·승진·면접에 힘이 실려요.",
    study: "시험·평가 운이 좋은 흐름이에요. 실전처럼 시간을 재고 문제를 풀어 보세요.",
    health: "무난한 컨디션이에요. 규칙적인 생활을 지키면 하루가 안정적으로 흘러가요.",
  },
  편인: {
    meaning: "나를 돕는 기운 중 독특한 쪽이라 직관과 생각이 깊어지는 날",
    strategy: "결정보다 정리가 어울리는 날이에요. 머릿속 생각을 글로 꺼내 보면 길이 보여요.",
    caution: "생각이 많아 실행이 늦어지기 쉬워요. 할 일 하나만 정해 오늘 끝내세요.",
    delta: { money: -6, love: -4, work: -2, study: 10, health: 2 },
    love: "혼자만의 시간이 필요해지는 날이에요. 연락이 뜸해질 땐 이유를 짧게 말해 두면 오해가 없어요.",
    money: "돈 버는 일보다 공부·자격·정보에 쓰는 돈이 생기기 쉬워요. 충동적인 결제만 피하면 괜찮아요.",
    work: "분석·연구·기획처럼 깊이 생각하는 일이 잘 맞아요. 사람 상대하는 일은 짧게 끝내세요.",
    study: "몰입이 잘 되는 날이에요. 어렵던 개념이나 전문 분야를 파고들어 보세요.",
    health: "생각이 많아 잠이 얕아질 수 있어요. 가벼운 산책으로 머리를 비우세요.",
  },
  정인: {
    meaning: "나를 낳아 주는 기운으로, 도움·문서·안정의 기운",
    strategy: "받는 운이 열리는 날이에요. 혼자 버티기보다 기댈 줄 아는 것도 실력이에요.",
    caution: "받는 데 익숙해지지 않게, 고마움은 바로 표현하세요.",
    delta: { money: -2, love: 0, work: 6, study: 12, health: 6 },
    love: "따뜻한 배려가 오가는 날이에요. 상대를 챙겨 주는 작은 행동이 관계를 단단하게 해요.",
    money: "문서·계약 관련 일이 순조로운 흐름이에요. 큰 수익보다 안정적인 결정이 잘 맞아요.",
    work: "윗사람·선배의 도움을 받기 좋아요. 막힌 일은 혼자 끙끙대지 말고 물어보세요.",
    study: "공부운이 가장 좋은 기운 중 하나예요(정인은 학문의 별). 자격증·시험 준비나 암기에 써 보세요.",
    health: "몸과 마음이 회복되는 흐름이에요. 충분히 쉬면 컨디션이 확 올라와요.",
  },
};

/** 마지막 글자에 받침이 있으면 "이에요", 없으면 "예요" (임오예요 / 신사예요 / 경진이에요) */
function copula(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return "이에요";
  return code % 28 === 0 ? "예요" : "이에요";
}

function clampCategory(score: number): number { return Math.round(Math.max(45, Math.min(97, score))); }

type LuckPick = { element: SajuElement; color: string; direction: string; reason: string };

/**
 * 오늘의 행운 오행 — 내 원국에 필요한 기운(신강이면 빼 주는 기운, 신약이면 채워 주는 기운) 중 오늘에 맞는 것.
 * 오늘 들어오는 기운이 이미 나에게 필요한 기운이면 그대로 살리고, 아니면 그 기운을 풀어 주는 오행을 고른다.
 */
function pickLuck(dayMaster: SajuElement, todayElement: SajuElement, isStrong: boolean, favorable: SajuElement[]): LuckPick {
  const elements: SajuElement[] = ["wood", "fire", "earth", "metal", "water"];
  const idx = elements.indexOf(dayMaster);
  const produces = elements[(idx + 1) % 5];
  const producedBy = elements[(idx + 4) % 5];
  const relation = getSajuRelation(dayMaster, todayElement);
  const t = elementLabel(todayElement);
  let element: SajuElement;
  let reason: string;
  if (favorable.includes(todayElement)) {
    element = todayElement;
    reason = `오늘 들어오는 ${t} 기운이 나에게 필요한 기운이라 그대로 살려 줘요`;
  } else if (isStrong) {
    // 신강인데 나를 더 키우는 기운(비겁·인성)이 들어온 날 — 식상으로 힘을 밖으로 푼다
    element = produces;
    reason = `기운이 넘치는 날이라 ${elementLabel(produces)} 기운으로 힘을 밖으로 풀어 줘요`;
  } else if (relation === "conqueredBy") {
    // 신약인데 나를 누르는 기운(관성)이 들어온 날 — 인성이 관성을 받아 나에게 잇는다(통관)
    element = producedBy;
    reason = `나를 누르는 ${t} 기운을 ${elementLabel(producedBy)} 기운이 받아 나에게 이어 줘요`;
  } else if (relation === "conquers") {
    element = dayMaster;
    reason = `감당할 일이 많은 날이라 나와 같은 ${elementLabel(dayMaster)} 기운으로 힘을 보태요`;
  } else {
    element = producedBy;
    reason = `힘이 빠지기 쉬운 날이라 ${elementLabel(producedBy)} 기운으로 나를 채워 줘요`;
  }
  return { element, ...ELEMENT_LUCK[element], reason };
}

export function buildFortuneProfile(input: FortuneEngineInput): FortuneEngineProfile {
  if (!input.birthDate) throw new Error("생년월일은 필수입니다.");

  const gender = input.gender === "female" ? "female" : "male";
  const calendarType = input.calendarType === "lunar" || input.calendarType === "lunar-leap" ? input.calendarType : "solar";
  const birthTime = input.birthTime || "unknown";

  const seedKey = [gender, input.birthDate, calendarType, birthTime].join("|");
  const baseNumber = hashString(seedKey);

  // 🚀 음양력 완벽 변환 (사주명식 교체용)
  const actualDate = adjustLunarDate(input.birthDate, calendarType);

  // 년주는 입춘, 월주는 그달 절입일 기준(예전엔 1월 1일·고정 날짜로 바뀌어 1~2월생 년주가 틀렸다)
  const birthEightChar = eightCharOf(actualDate);
  const yearPillar = pillarFromGanji(birthEightChar.getYear());
  const monthPillar = pillarFromGanji(birthEightChar.getMonth());
  const dayPillar = calculateDayPillar(actualDate);
  const timePillar = calculateTimePillar(dayPillar, birthTime);

  const fourPillars: SajuFourPillars = { year: yearPillar, month: monthPillar, day: dayPillar, time: timePillar };
  const elementCounts = countElements(fourPillars);
  const dominantElement = getDominantElement(elementCounts);
  const weakestElement = getWeakestElement(elementCounts);
  const dayMasterElement = dayPillar.element;

  const todayDateStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const todayPillar = calculateDayPillar(todayDateStr);
  const summaryText = `년주: ${yearPillar.stemHanja}${yearPillar.branchHanja}, 월주: ${monthPillar.stemHanja}${monthPillar.branchHanja}, 일주: ${dayPillar.stemHanja}${dayPillar.branchHanja}`;

  const { isStrong, favorable } = getSajuStrength(dayMasterElement, elementCounts);
  const todayBranchElement = EARTHLY_BRANCHES.find((b) => b.hanja === todayPillar.branchHanja)!.element;
  const isFavorableDay = favorable.includes(todayPillar.element);
  const branchFavorable = favorable.includes(todayBranchElement);

  // 운세 캘린더·아침 알림과 같은 계산 — 오늘의 성격(제목·행동)과 기본 점수가 서로 어긋나지 않게 한 곳에서 가져온다
  const dayLuck = calculateDayLuck({ birthDate: actualDate, calendarType: "solar", start: todayDateStr, days: 1 }).days[0];
  const tenGod = tenGodForStem(dayPillar.stemHanja, todayPillar.stemHanja);
  const info = TEN_GOD_INFO[tenGod] ?? TEN_GOD_INFO.비견;

  const tb = todayPillar.branchHanja;
  const dayClash = CLASH[dayPillar.branchHanja] === tb;
  const dayHarmony = !dayClash && isHarmony(dayPillar.branchHanja, tb);
  const monthClash = CLASH[monthPillar.branchHanja] === tb;
  const monthHarmony = !monthClash && isHarmony(monthPillar.branchHanja, tb);
  const yearClash = CLASH[yearPillar.branchHanja] === tb;
  const branchRelation = dayClash ? "clash" : dayHarmony ? "combo" : "normal";

  // 총운: 캘린더 점수 + 내 원국에 오늘 기운이 필요한지. 캘린더의 "좋은 날/보통/조심할 날" 구간은 넘지 않는다.
  const personal = (isFavorableDay ? 4 : -3) + (branchFavorable ? 2 : -2);
  const raw = dayLuck.score + personal;
  const total =
    dayLuck.tone === "good" ? Math.min(96, Math.max(78, raw))
    : dayLuck.tone === "normal" ? Math.min(77, Math.max(61, raw))
    : dayClash ? Math.max(40, Math.min(dayLuck.score, raw))
    : Math.max(40, Math.min(60, raw));

  const d = info.delta;
  const loveDelta = gender === "male" ? d.loveMale ?? d.love : d.loveFemale ?? d.love;
  const freeScores: FortuneScoreMap = {
    total,
    love: clampCategory(total + loveDelta + (dayClash ? -8 : 0) + (dayHarmony ? 8 : 0)),
    money: clampCategory(total + d.money),
    work: clampCategory(total + d.work + (monthClash ? -8 : 0) + (monthHarmony ? 5 : 0)),
    study: clampCategory(total + d.study),
    health: clampCategory(total + d.health + (dayClash ? -6 : 0) + (yearClash ? -3 : 0)),
  };

  // 문장 — 손님 원국의 실제 글자로 왜 이런 결과인지 설명한다
  const todayKoName = `${todayPillar.stem}${todayPillar.branch}`;
  const todayKo = `${todayKoName}(${todayPillar.stemHanja}${todayPillar.branchHanja})${copula(todayKoName)}`;
  const me = `${dayPillar.stem}${ELEMENT_KO[dayMasterElement].ko}(${dayPillar.stemHanja}${ELEMENT_KO[dayMasterElement].hanja}) 일간`;
  const strengthLine = isStrong
    ? isFavorableDay
      ? `원국에 내 기운이 넉넉한 편(신강)이라, 오늘 들어오는 ${elementLabel(todayPillar.element)} 기운이 오히려 균형을 잡아 줘요.`
      : `원국에 내 기운이 이미 강한 편(신강)이라, 오늘 ${elementLabel(todayPillar.element)} 기운까지 더해지면 고집·과속이 되기 쉬워요.`
    : isFavorableDay
      ? `원국에 내 기운이 약한 편(신약)이라, 오늘 들어오는 ${elementLabel(todayPillar.element)} 기운이 든든한 지원군이 돼요.`
      : `원국에 내 기운이 약한 편(신약)이라, 오늘 ${elementLabel(todayPillar.element)} 기운은 조금 버겁게 느껴질 수 있어요. 일정을 가볍게 잡으세요.`;
  const branchLine = dayClash
    ? ` 또 오늘 지지 ${todayPillar.branch}(${tb})가 내 일지 ${dayPillar.branch}(${dayPillar.branchHanja})와 충(沖)이라 계획이 틀어지기 쉬워요. 중요한 약속은 시간 여유를 두세요.`
    : dayHarmony
      ? ` 오늘 지지 ${todayPillar.branch}(${tb})가 내 일지 ${dayPillar.branch}(${dayPillar.branchHanja})와 합(合)을 이뤄 사람 운이 따라요.`
      : "";

  const freeTexts: FortuneTextMap = {
    total: `오늘 일진은 ${todayKo}. 오늘의 ${todayPillar.stem}${ELEMENT_KO[todayPillar.element].ko} 기운은 ${me}인 나에게 '${tenGod}'에 해당해요. ${info.meaning}이에요. ${strengthLine}${branchLine}`,
    love:
      (gender === "male" ? info.loveMale ?? info.love : info.loveFemale ?? info.love) +
      (dayClash ? " 오늘은 일지(배우자 자리)와 충이 있어 사소한 말다툼을 조심하세요." : dayHarmony ? " 일지(배우자 자리)와 합이 들어 마음이 잘 통하는 날이에요." : ""),
    money: info.money,
    work:
      info.work +
      (monthClash ? ` 오늘 지지가 월지(사회·직장 자리) ${monthPillar.branch}(${monthPillar.branchHanja})와 충해 일정 변동이 생기기 쉬워요.` : monthHarmony ? ` 월지(사회·직장 자리)와 합이 들어 협업이 순조로워요.` : ""),
    study: info.study,
    health: info.health + (dayClash ? " 충이 있는 날이라 이동·운동 중 부딪힘을 조심하세요." : ""),
  };

  const luck = pickLuck(dayMasterElement, todayPillar.element, isStrong, favorable);
  const caution = info.caution + (yearClash ? ` 오늘 지지가 년지(가족·윗사람 자리)와 충해 집안 일정이 엇갈리기 쉬워요.` : "");

  // 핵심 가이드 — 제목·행동은 운세 캘린더·아침 알림과 같은 문장(같은 날 다른 말을 하지 않게)
  const dailyGuide = {
    point: dayLuck.title,
    strategy: dayLuck.note ?? info.strategy,
    action: dayLuck.action,
  };

  return {
    raw: { gender, birthDate: input.birthDate, calendarType, birthTime },
    labels: { genderLabel: normalizeGenderLabel(gender), calendarLabel: normalizeCalendarLabel(calendarType), timeLabel: normalizeTimeLabel(birthTime) },
    seedKey, summaryText, baseNumber, yearPillar, monthPillar, dayPillar, timePillar, fourPillars, elementCounts,
    dominantElement, weakestElement, dayMasterElement, todayPillar,
    isStrongDayMaster: isStrong, isFavorableDay, branchRelation,
    todayTenGod: tenGod,
    todayTenGodMeaning: info.meaning,
    luck: { ...luck, caution },
    branchNotes: [
      dayClash ? "일지 충" : dayHarmony ? "일지 합" : null,
      monthClash ? "월지 충" : monthHarmony ? "월지 합" : null,
      yearClash ? "년지 충" : null,
    ].filter((x): x is string => Boolean(x)),
    dailyGuide,
    freeScores, freeTexts,
  };
}

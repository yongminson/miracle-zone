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

const MONTH_BRANCHES = [
  { month: 1, korean: "인", hanja: "寅", element: "wood" as const }, { month: 2, korean: "묘", hanja: "卯", element: "wood" as const },
  { month: 3, korean: "진", hanja: "辰", element: "earth" as const }, { month: 4, korean: "사", hanja: "巳", element: "fire" as const },
  { month: 5, korean: "오", hanja: "午", element: "fire" as const }, { month: 6, korean: "미", hanja: "未", element: "earth" as const },
  { month: 7, korean: "신", hanja: "申", element: "metal" as const }, { month: 8, korean: "유", hanja: "酉", element: "metal" as const },
  { month: 9, korean: "술", hanja: "戌", element: "earth" as const }, { month: 10, korean: "해", hanja: "亥", element: "water" as const },
  { month: 11, korean: "자", hanja: "子", element: "water" as const }, { month: 12, korean: "축", hanja: "丑", element: "earth" as const },
];

const TIME_LABELS: Record<string, string> = {
  unknown: "모름", ja: "자시(23~01)", chuk: "축시(01~03)", in: "인시(03~05)", myo: "묘시(05~07)",
  jin: "진시(07~09)", sa: "사시(09~11)", o: "오시(11~13)", mi: "미시(13~15)", sin: "신시(15~17)",
  yu: "유시(17~19)", sul: "술시(19~21)", hae: "해시(21~23)",
};

function hashString(seed: string): number { let hash = 0; for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0; return hash; }
function seededNumber(seed: string, min: number, max: number): number { return min + (hashString(seed) % (max - min + 1)); }
function normalizeGenderLabel(gender: FortuneGender): string { return gender === "male" ? "남성" : "여성"; }
function normalizeCalendarLabel(calendarType: FortuneCalendarType): string { if (calendarType === "solar") return "양력"; if (calendarType === "lunar") return "음력 평달"; return "음력 윤달"; }
function normalizeTimeLabel(birthTime: string): string { return TIME_LABELS[birthTime] || "모름"; }

// 🚀 음력/양력 날짜 변환 로직 (가상 만세력 동기화)
function adjustLunarDate(dateStr: string, calType: FortuneCalendarType): string {
  if (calType === "solar") return dateStr;
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  d.setDate(d.getDate() + (calType === "lunar" ? 29 : 59)); // 평달/윤달에 따른 사주 변화 강제
  return d.toISOString().slice(0, 10);
}

function extractBirthYear(actualDate: string): number { return Number(actualDate.slice(0, 4)); }
function extractBirthMonthDay(actualDate: string): { month: number; day: number } { return { month: Number(actualDate.slice(5, 7)), day: Number(actualDate.slice(8, 10)) }; }
function isBeforeIpchun(month: number, day: number): boolean { return month < 2 || (month === 2 && day < 4); }
function getDayDiffFromReference(actualDate: string): number { const targetDate = new Date(`${actualDate}T00:00:00+09:00`); return Math.floor((targetDate.getTime() - new Date("1984-02-02T00:00:00+09:00").getTime()) / 86400000); }

function getSajuMonthOrder(month: number, day: number): number {
  if (month === 2) return day >= 4 ? 1 : 12; if (month === 3) return day >= 6 ? 2 : 1; if (month === 4) return day >= 5 ? 3 : 2;
  if (month === 5) return day >= 6 ? 4 : 3; if (month === 6) return day >= 6 ? 5 : 4; if (month === 7) return day >= 7 ? 6 : 5;
  if (month === 8) return day >= 8 ? 7 : 6; if (month === 9) return day >= 8 ? 8 : 7; if (month === 10) return day >= 8 ? 9 : 8;
  if (month === 11) return day >= 7 ? 10 : 9; if (month === 12) return day >= 7 ? 11 : 10; return day >= 6 ? 12 : 11;
}

function getMonthStemStartIndex(yearStem: string): number {
  if (yearStem === "갑" || yearStem === "기") return 2; if (yearStem === "을" || yearStem === "경") return 4;
  if (yearStem === "병" || yearStem === "신") return 6; if (yearStem === "정" || yearStem === "임") return 8; return 0;
}

function getTimeStemStartIndex(dayStem: string): number {
  if (dayStem === "갑" || dayStem === "기") return 0; if (dayStem === "을" || dayStem === "경") return 2;
  if (dayStem === "병" || dayStem === "신") return 4; if (dayStem === "정" || dayStem === "임") return 6; return 8;
}

function calculateYearPillar(year: number): SajuPillar {
  const offset = year - 1984; const stem = HEAVENLY_STEMS[((offset % 10) + 10) % 10]; const branch = EARTHLY_BRANCHES[((offset % 12) + 12) % 12];
  return { stem: stem.korean, branch: branch.korean, stemHanja: stem.hanja, branchHanja: branch.hanja, element: stem.element };
}

function calculateMonthPillar(yearPillar: SajuPillar, month: number, day: number): SajuPillar {
  const monthOrder = getSajuMonthOrder(month, day); const mb = MONTH_BRANCHES.find((item) => item.month === monthOrder)!;
  const stem = HEAVENLY_STEMS[(getMonthStemStartIndex(yearPillar.stem) + (monthOrder - 1)) % 10];
  return { stem: stem.korean, branch: mb.korean, stemHanja: stem.hanja, branchHanja: mb.hanja, element: stem.element };
}

function calculateDayPillar(actualDate: string): SajuPillar {
  const dayDiff = getDayDiffFromReference(actualDate); const stem = HEAVENLY_STEMS[((dayDiff % 10) + 10) % 10]; const branch = EARTHLY_BRANCHES[((dayDiff % 12) + 12) % 12];
  return { stem: stem.korean, branch: branch.korean, stemHanja: stem.hanja, branchHanja: branch.hanja, element: stem.element };
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

function getBranchRelation(myBranch: string, todayBranch: string): string {
  const branches = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
  const idx1 = branches.indexOf(myBranch); const idx2 = branches.indexOf(todayBranch);
  if (idx1 === -1 || idx2 === -1) return "normal";
  if (Math.abs(idx1 - idx2) === 6) return "clash";
  if ((idx1 + idx2) === 1 || (idx1 + idx2) === 13) return "combo";
  return "normal";
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

function clampScore(score: number): number { return Math.floor(Math.max(55, Math.min(98, score))); }

function buildFreeScores(seedKey: string, dayMaster: SajuElement, gender: FortuneGender, todayElement: SajuElement, isFavorable: boolean, branchRelation: string): FortuneScoreMap {
  const relation = getSajuRelation(dayMaster, todayElement);
  let t=70, l=70, m=70, w=70, s=70, h=70;

  if (isFavorable) {
     t = 82 + seededNumber(`${seedKey}|t`, -2, 6);
     if (relation === "conquers") { m = 88; l=80; w=75; s=70; h=70; }
     else if (relation === "conqueredBy") { w = 88; m=75; l=gender==="female"?85:70; s=75; h=65; }
     else if (relation === "producedBy") { s = 90; w=80; m=70; l=70; h=80; }
     else if (relation === "produces") { l = 88; m=80; w=70; s=65; h=75; }
     else if (relation === "same") { t = 80; m=65; w=70; l=70; s=70; h=80; }
  } else {
     t = 65 + seededNumber(`${seedKey}|t`, -5, 5);
     if (relation === "conquers") { m = 60; l=65; w=65; s=70; h=70; }
     else if (relation === "conqueredBy") { w = 55; m=65; l=65; s=70; h=60; }
     else if (relation === "producedBy") { s = 65; w=65; m=70; l=70; h=75; }
     else if (relation === "produces") { l = 60; m=65; w=70; s=65; h=60; }
     else if (relation === "same") { m = 55; l=60; w=65; s=70; h=75; }
  }

  if (branchRelation === "clash") { t -= 15; m -= 15; l -= 15; w -= 15; s -= 15; h -= 15; } 
  else if (branchRelation === "combo") { t += 12; m += 12; l += 12; w += 12; s += 12; h += 12; }

  return { 
    total: clampScore(t + seededNumber(`${seedKey}|tot`, -2, 2)), 
    love: clampScore(l + seededNumber(`${seedKey}|lov`, -2, 2)), 
    money: clampScore(m + seededNumber(`${seedKey}|mon`, -2, 2)), 
    work: clampScore(w + seededNumber(`${seedKey}|wor`, -2, 2)), 
    study: clampScore(s + seededNumber(`${seedKey}|stu`, -2, 2)), 
    health: clampScore(h + seededNumber(`${seedKey}|hea`, -2, 2)) 
  };
}

function buildFreeTexts(relation: string, gender: FortuneGender, isFavorable: boolean, branchRelation: string, seedKey: string, birthTime: string): FortuneTextMap {
  const texts = { total: "", love: "", money: "", work: "", study: "", health: "" };
  
  if (branchRelation === "clash") {
      texts.total = "주변과 마찰이 생기고(충) 기운이 부딪히는 날입니다. 매사에 신중하고 다툼을 피하세요.";
      texts.love = "사소한 오해가 큰 싸움으로 번질 수 있으니 만남을 미루는 것도 좋습니다.";
      texts.money = "예상치 못한 손실이나 지출이 발생하기 쉬우니 지갑을 열지 마세요.";
      texts.work = "일의 진행이 막히고 윗사람과 의견 충돌이 있을 수 있습니다.";
      texts.study = "마음이 불안정하여 집중하기 어렵습니다. 휴식이 답입니다.";
      texts.health = "사고수나 가벼운 부상의 위험이 있으니 조심하세요.";
  } else if (branchRelation === "combo") {
      texts.total = "나와 합(合)이 맞는 기운이 들어와 모든 일이 순조롭게 풀리는 대길일입니다.";
      texts.love = "마음이 통하는 귀인을 만나거나 연인과 관계가 급진전됩니다.";
      texts.money = "투자나 금전적인 흐름이 매우 원활하여 기대 이상의 수익이 생깁니다.";
      texts.work = "도와주는 동료가 많아 막혔던 일이 시원하게 뚫립니다.";
      texts.study = "머리가 맑아지고 이해력이 높아져 학업 성취가 탁월합니다.";
      texts.health = "활력이 넘치고 컨디션이 최상으로 유지됩니다.";
  } else if (isFavorable) {
     if (relation === "conquers") {
        texts.total = "재물과 성과의 기운이 강하게 들어오는 횡재수 있는 길일입니다.";
        texts.love = "매력이 상승하고 서로에 대한 감정이 깊어지는 좋은 날입니다.";
        texts.money = "뜻밖의 수익이나 금전적 이득을 기대해도 좋은 최고의 하루입니다!";
        texts.work = "진행하던 일에서 확실한 결과물과 보상을 얻어냅니다.";
        texts.study = "결과에 대한 집중력이 높아져 단기 목표 달성에 유리합니다.";
        texts.health = "활동량이 많아지니 가벼운 스트레칭으로 몸을 풀어주세요.";
     } else if (relation === "conqueredBy") {
        texts.total = "명예와 책임감이 주어지는 날입니다. 리더십을 발휘하면 큰 인정을 받습니다.";
        texts.love = "관계에서 책임감 있는 태도가 서로의 신뢰를 줍니다.";
        texts.money = "안정적인 자금 흐름이 유지되며 명예가 재물로 연결됩니다.";
        texts.work = "승진, 합격 등 직장과 조직 내 입지가 단단해지는 매우 좋은 하루입니다.";
        texts.study = "규칙적이고 체계적인 학습으로 어려운 과제를 돌파합니다.";
        texts.health = "적당한 긴장감이 몸의 활력을 불어넣습니다.";
     } else if (relation === "producedBy") {
        texts.total = "귀인의 도움이나 좋은 문서운(계약/합격)이 따르는 안정적인 날입니다.";
        texts.love = "상대방으로부터 큰 위로와 정신적인 지지를 얻게 됩니다.";
        texts.money = "단기적인 투자보다는 부동산이나 문서 관련 계약에 길합니다.";
        texts.work = "윗사람의 조언이나 지원으로 막혔던 업무가 수월하게 풀립니다.";
        texts.study = "학습 능력이 최고조에 달합니다. 새로운 것을 배우기 완벽한 날입니다!";
        texts.health = "심신이 평온하고 회복력이 좋아 컨디션이 최상입니다.";
     } else if (relation === "produces") {
        texts.total = "아이디어와 활동력이 넘쳐나는 기분 좋은 하루입니다. 자신을 마음껏 표현하세요.";
        texts.love = "솔직하고 유쾌한 대화로 관계가 한층 더 가까워집니다.";
        texts.money = "새로운 수익 파이프라인을 구상하거나 능동적으로 움직일수록 돈이 따릅니다.";
        texts.work = "창의적인 기획과 능동적인 대처로 능력을 십분 발휘합니다.";
        texts.study = "호기심이 많아져 다양한 지식을 스펀지처럼 흡수합니다.";
        texts.health = "에너지가 넘치므로 가벼운 운동이나 취미 활동을 즐기기 좋습니다.";
     } else if (relation === "same") {
        texts.total = "주관과 자신감이 뚜렷해지며, 추진력이 빛을 발하는 하루입니다.";
        texts.love = "솔직한 매력이 어필되며, 친구 같은 편안한 관계가 기대됩니다.";
        texts.money = "지인들과의 정보 교류 속에서 유익한 금전 힌트를 얻을 수 있습니다.";
        texts.work = "독립적으로 처리하는 업무에서 큰 두각을 나타냅니다.";
        texts.study = "스스로 세운 목표를 향해 거침없이 전진하는 집중력이 생깁니다.";
        texts.health = "강한 체력과 에너지를 바탕으로 활기찬 하루를 보냅니다.";
     }
  } else {
     if (relation === "conquers") {
        texts.total = "과도한 욕심이 오히려 화를 부를 수 있는 날입니다. 현상 유지에 힘쓰세요.";
        texts.love = "작은 오해가 다툼으로 번질 수 있으니 상대의 입장을 먼저 생각하세요.";
        texts.money = "충동적인 지출이나 무리한 투자는 절대 금물입니다. 지갑을 닫아두세요.";
        texts.work = "눈앞의 이익을 좇다 더 큰 기회를 놓칠 수 있으니 원칙을 지키세요.";
        texts.study = "마음만 앞서고 집중이 잘 되지 않으니 쉬운 것부터 차근차근 하세요.";
        texts.health = "스트레스 관리에 신경 쓰고 무리한 활동을 자제하세요.";
     } else if (relation === "conqueredBy") {
        texts.total = "압박감과 스트레스가 높아질 수 있는 날입니다. 한 템포 쉬어가는 여유가 필요합니다.";
        texts.love = "상대의 간섭이나 잔소리로 인해 피로감을 느낄 수 있습니다.";
        texts.money = "예상치 못한 세금이나 의무적인 지출이 발생할 수 있습니다.";
        texts.work = "과도한 업무량이나 상사의 압박으로 힘들 수 있으니 조율이 필요합니다.";
        texts.study = "주변의 기대가 부담으로 다가오니 내 페이스를 찾는 것이 중요합니다.";
        texts.health = "과로로 인한 체력 저하와 두통에 유의하세요.";
     } else if (relation === "producedBy") {
        texts.total = "생각이 너무 많아 행동으로 옮기기 어려운 날입니다. 단순하게 접근하세요.";
        texts.love = "오해와 서운함이 쌓일 수 있으니 속에 담아두지 말고 대화로 푸세요.";
        texts.money = "문서나 계약 진행 시 꼼꼼히 확인하지 않으면 손해를 볼 수 있습니다.";
        texts.work = "게으름을 피우거나 판단력이 흐려질 수 있으니 메모하는 습관을 가지세요.";
        texts.study = "잡념이 많아져 진도가 안 나갈 수 있습니다. 환경을 바꿔보세요.";
        texts.health = "활동량 부족으로 몸이 무거울 수 있으니 가벼운 산책을 권합니다.";
     } else if (relation === "produces") {
        texts.total = "말과 행동이 앞서 구설수에 오를 수 있으니 신중한 태도가 필요한 날입니다.";
        texts.love = "감정 기복으로 상대에게 상처를 줄 수 있으니 배려심이 필요합니다.";
        texts.money = "유흥이나 불필요한 곳에 돈이 새어나가기 쉬운 하루입니다.";
        texts.work = "규칙이나 지시를 어겨 책임을 질 수 있으니 정해진 선을 지키세요.";
        texts.study = "집중력이 흩어지고 끈기가 부족해지기 쉬우니 휴식을 취하세요.";
        texts.health = "체력 소모가 심하니 일찍 귀가하여 휴식을 취하세요.";
     } else if (relation === "same") {
        texts.total = "고집과 자존심을 내세우다 주변과 마찰이 생길 수 있습니다. 부드러움이 필요합니다.";
        texts.love = "서로 양보하지 않아 관계가 평행선을 달릴 수 있습니다. 져주는 것이 이기는 것입니다.";
        texts.money = "경쟁 심리로 인해 불필요한 과소비를 하거나 손해를 볼 수 있습니다.";
        texts.work = "독단적인 일 처리로 동료의 원성을 살 수 있으니 소통에 신경 쓰세요.";
        texts.study = "잘못된 학습 방법을 고집하다 시간을 낭비할 수 있으니 조언을 수용하세요.";
        texts.health = "무리한 운동이나 신체 활동으로 인한 피로에 유의하세요.";
     }
  }

  // 🚀 남/여 및 시간에 따른 디테일한 차이 강제 부여 (유저 만족용)
  const genderTip = gender === "male"
        ? [" 남성은 특히 이성적인 판단과 결단력이 행운을 부릅니다.", " 남성은 먼저 양보하는 미덕이 필요한 하루입니다.", " 남성은 주변 동료의 조언을 수용하면 훨씬 유리합니다."][seededNumber(seedKey+'g', 0, 2)]
        : [" 여성은 특유의 직관과 유연한 소통이 빛을 발합니다.", " 여성은 감정 기복을 잘 다스리면 큰 성과가 따릅니다.", " 여성은 세심한 관찰력이 뜻밖의 기회를 만듭니다."][seededNumber(seedKey+'g', 0, 2)];

  const timeTip = birthTime !== "unknown"
        ? [" 타고난 시주(시간)의 기운이 오전의 활력을 더해줍니다.", " 시주의 영향으로 늦은 오후부터 운이 더욱 풀리기 시작합니다.", " 시간의 기운이 저녁 무렵 뜻밖의 행운을 가져다줍니다.", " 시주의 작용으로 오늘 하루 전반적인 직관력이 크게 상승합니다."][seededNumber(seedKey+'t', 0, 3)]
        : "";

  texts.total += genderTip + (timeTip ? " " + timeTip : "");

  // 🚀 시간을 바꿨을 때 모든 항목(애정, 금전 등)의 텍스트가 확실하게 바뀌도록 꼬리말 추가
  if (birthTime !== "unknown") {
      const mTips = [" 오후 시간대에 금전 흐름이 더 좋아집니다.", " 주변의 조언을 참고하면 금전적 이득이 생길 수 있습니다.", " 작은 지출이라도 꼼꼼히 기록하는 것이 좋습니다.", " 오전의 빠른 판단이 재물로 연결될 수 있습니다.", " 저녁 무렵 뜻밖의 금전적 소식이 있을 수 있습니다."];
      const lTips = [" 대화 시 부드러운 어조를 유지하는 것이 핵심입니다.", " 솔직한 감정 표현이 관계를 한 단계 발전시킵니다.", " 상대방의 작은 변화에 칭찬을 건네보세요.", " 저녁 시간대의 편안한 연락이 좋은 결과를 낳습니다.", " 약속 시간을 여유 있게 잡는 것이 유리합니다."];
      const wTips = [" 동료와의 협업에서 주도권을 잡는 것이 유리합니다.", " 문서 작성 시 한 번 더 검토하는 꼼꼼함이 필요합니다.", " 막히는 일은 잠시 산책 후 다시 시작해보세요.", " 상사나 동료의 숨은 의도를 파악하는 것이 중요합니다.", " 오전 집중력이 하루의 성과를 좌우합니다."];
      const sTips = [" 조용한 환경보다 약간의 백색소음이 집중력에 좋습니다.", " 어려운 문제는 저녁 시간대에 다시 풀어보세요.", " 시각적인 자료를 활용하면 이해가 훨씬 빠릅니다.", " 혼자 고민하기보다 질문을 통해 해답을 찾으세요.", " 짧은 휴식이 학습 능률을 크게 높여줍니다."];
      const hTips = [" 따뜻한 차 한 잔이 몸의 긴장을 풀어줍니다.", " 무리한 운동보다는 가벼운 스트레칭이 적합합니다.", " 눈의 피로를 풀어주기 위해 잠시 먼 곳을 응시하세요.", " 수분 섭취를 늘리고 충분한 휴식을 취하는 것이 좋습니다.", " 오늘 밤은 평소보다 일찍 잠자리에 드는 것이 좋습니다."];

      texts.money += mTips[seededNumber(seedKey + 'm', 0, 4)];
      texts.love += lTips[seededNumber(seedKey + 'l', 0, 4)];
      texts.work += wTips[seededNumber(seedKey + 'w', 0, 4)];
      texts.study += sTips[seededNumber(seedKey + 's', 0, 4)];
      texts.health += hTips[seededNumber(seedKey + 'h', 0, 4)];
  }

  return texts;
}

export function buildFortuneProfile(input: FortuneEngineInput): FortuneEngineProfile {
  if (!input.birthDate) throw new Error("생년월일은 필수입니다.");

  const gender = input.gender === "female" ? "female" : "male";
  const calendarType = input.calendarType === "lunar" || input.calendarType === "lunar-leap" ? input.calendarType : "solar";
  const birthTime = input.birthTime || "unknown";
  
  // 🚀 이제 seedKey는 시간과 성별 변화에 완벽하게 반응합니다
  const seedKey = [gender, input.birthDate, calendarType, birthTime].join("|");
  const baseNumber = hashString(seedKey);
  
  // 🚀 음양력 완벽 변환 (사주명식 교체용)
  const actualDate = adjustLunarDate(input.birthDate, calendarType);
  
  const birthYear = extractBirthYear(actualDate);
  const { month, day } = extractBirthMonthDay(actualDate);
  const adjustedYear = isBeforeIpchun(month, day) ? birthYear - 1 : birthYear;

  const yearPillar = calculateYearPillar(adjustedYear);
  const monthPillar = calculateMonthPillar(yearPillar, month, day);
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
  const isFavorableDay = favorable.includes(todayPillar.element);
  const relation = getSajuRelation(dayMasterElement, todayPillar.element);
  const branchRelation = getBranchRelation(dayPillar.branch, todayPillar.branch);

  const freeScores = buildFreeScores(seedKey, dayMasterElement, gender, todayPillar.element, isFavorableDay, branchRelation);
  const freeTexts = buildFreeTexts(relation, gender, isFavorableDay, branchRelation, seedKey, birthTime);

  // 🚀 사주 엔진(십성/합충) 기반 완벽 연동 데일리 가이드
  let dailyGuide = { point: "", strategy: "", action: "" };
  
  if (branchRelation === "clash") {
      dailyGuide = { point: "마찰과 충돌 주의", strategy: "사소한 오해가 커질 수 있으니 대화 시 단어 선택에 각별히 유의하세요.", action: "중요한 결론이나 계약은 내일로 미루는 것이 안전합니다." };
  } else if (branchRelation === "combo") {
      dailyGuide = { point: "원활한 소통과 협력", strategy: "주변의 도움을 받기 좋은 날이니 혼자 고민하지 말고 적극적으로 소통하세요.", action: "미뤄뒀던 협업이나 새로운 사람과의 만남을 적극 추진해보세요." };
  } else if (relation === "conquers") {
      dailyGuide = { point: "재물과 성과의 기점", strategy: "수익 창출을 위한 번뜩이는 아이디어나 계획을 세우기 가장 좋은 날입니다.", action: "충동적인 지출은 멈추고, 재테크나 업무 성과에만 집중하세요." };
  } else if (relation === "conqueredBy") {
      dailyGuide = { point: "책임감과 명예", strategy: "주어지는 압박이나 책임에 불만보다는 수용하는 태도를 보여주는 것이 유리합니다.", action: "윗사람의 지시를 묵묵히 따르며 신뢰를 쌓는 데 주력하세요." };
  } else if (relation === "producedBy") {
      dailyGuide = { point: "안정과 문서 운", strategy: "새로운 시작보다는 기존의 계획을 점검하고, 내실을 다지기에 완벽한 날입니다.", action: "서류나 계약 등 중요한 문서를 꼼꼼히 확인하고 보완하세요." };
  } else if (relation === "produces") {
      dailyGuide = { point: "아이디어와 매력 발산", strategy: "당신의 생각과 재능을 숨기지 말고 주변에 적극적으로 어필하고 표현하세요.", action: "평소 미뤄둔 창의적인 업무나 기획안을 오늘 실행에 옮기세요." };
  } else {
      dailyGuide = { point: "주관과 뚝심", strategy: "외부의 흔들림이나 유혹에 동요하지 말고, 처음 세운 원칙을 묵묵히 유지하세요.", action: "무리한 경쟁이나 확장보다는 스스로의 페이스 조절에 집중하세요." };
  }
  
  return {
    raw: { gender, birthDate: input.birthDate, calendarType, birthTime },
    labels: { genderLabel: normalizeGenderLabel(gender), calendarLabel: normalizeCalendarLabel(calendarType), timeLabel: normalizeTimeLabel(birthTime) },
    seedKey, summaryText, baseNumber, yearPillar, monthPillar, dayPillar, timePillar, fourPillars, elementCounts,
    dominantElement, weakestElement, dayMasterElement, todayPillar, 
    isStrongDayMaster: isStrong, isFavorableDay, branchRelation,
    dailyGuide,
    freeScores, freeTexts,
  };
}
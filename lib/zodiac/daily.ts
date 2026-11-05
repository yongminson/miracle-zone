// 띠별 오늘의 운세 계산 — 오늘 일진(日辰)과 띠의 합·충·오행으로 정한다. 띠별 운세 화면과 매일 블로그 글이 같이 쓴다.
// (2026-11-05 app/tools/page.tsx 에서 옮김. 계산은 그대로다. 토스는 자기 복사본을 쓴다)
// 2026-11-03 전엔 날짜로 돌린 무작위였다(점수·문장·행운·잘 맞는 띠가 매일 제멋대로 바뀜).
// 이제 오늘 일진의 천간 오행이 내 띠 오행을 살리는지·누르는지, 일진 지지가 내 띠와 합인지·충인지로 정한다.
// 같은 일진(60일마다)이면 같은 결과, 잘 맞는 띠(육합)·부딪히는 띠(충)는 전통대로 고정.

type El = "목" | "화" | "토" | "금" | "수";

const Z_STEMS = "甲乙丙丁戊己庚辛壬癸";
const Z_STEMS_KO = "갑을병정무기경신임계";
const Z_BRANCHES = "子丑寅卯辰巳午未申酉戌亥";
const Z_BRANCHES_KO = "자축인묘진사오미신유술해";
const Z_ANIMALS = ["쥐", "소", "범", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
const Z_STEM_EL: El[] = ["목", "목", "화", "화", "토", "토", "금", "금", "수", "수"];
const Z_BRANCH_EL: El[] = ["수", "토", "목", "목", "토", "화", "화", "토", "금", "금", "토", "수"];
const Z_EL_LABEL: Record<El, string> = { 목: "목(木)", 화: "화(火)", 토: "토(土)", 금: "금(金)", 수: "수(水)" };
const Z_GEN: Record<El, El> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
const Z_CTRL: Record<El, El> = { 목: "토", 토: "수", 수: "화", 화: "금", 금: "목" };
/** 육합 짝: 자축·인해·묘술·진유·사신·오미 */
export const ZODIAC_SIX = [1, 0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
/** 낮 시간대(진시~술시)만 행운의 시간으로 쓴다 */
const Z_HOUR_LABEL: Record<number, string> = { 4: "오전 7시~9시", 5: "오전 9시~11시", 6: "오전 11시~오후 1시", 7: "오후 1시~3시", 8: "오후 3시~5시", 9: "오후 5시~7시", 10: "저녁 7시~9시" };
const Z_LUCK: Record<El, { color: string; direction: string; number: string }> = {
  목: { color: "초록색·청색", direction: "동쪽", number: "3·8" },
  화: { color: "빨간색·보라색", direction: "남쪽", number: "2·7" },
  토: { color: "노란색·갈색", direction: "중앙(가까운 곳)", number: "5·10" },
  금: { color: "흰색·은색", direction: "서쪽", number: "4·9" },
  수: { color: "검은색·남색", direction: "북쪽", number: "1·6" },
};

export type Iljin = { y: number; m: number; d: number; stem: number; branch: number; hanja: string; korean: string };

/** 그날의 일진 (율리우스 일수로 계산 — 2000-01-01 = 무오일) */
export function iljinOf(ymd: string): Iljin {
  const [y, m, d] = ymd.split("-").map(Number);
  const jdn = Math.floor(Date.UTC(y, m - 1, d) / 86400000) + 2440588;
  const idx = (((jdn + 49) % 60) + 60) % 60;
  const stem = idx % 10;
  const branch = idx % 12;
  return {
    y, m, d, stem, branch,
    hanja: Z_STEMS[stem] + Z_BRANCHES[branch],
    korean: Z_STEMS_KO[stem] + Z_BRANCHES_KO[branch],
  };
}

/** 한국 시간 오늘의 일진 */
export function todayIljin(): Iljin {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return iljinOf(ymd);
}

/** zi: 띠 번호(쥐 0 ~ 돼지 11), zLabel: 화면에 쓰는 띠 이름 */
export function dailyZodiacFortune(zi: number, zLabel: string, iljin: Iljin) {
  const ze = Z_BRANCH_EL[zi];
  const se = Z_STEM_EL[iljin.stem];
  const b = iljin.branch;
  const dayAnimal = `${Z_ANIMALS[b]}날`;

  // 천간: 오늘 기운이 내 띠를 살림(help) / 같음(same) / 내가 내보냄(express) / 내가 다스림(wealth) / 나를 누름(pressure)
  const rel = Z_GEN[se] === ze ? "help" : se === ze ? "same" : Z_GEN[ze] === se ? "express" : Z_CTRL[ze] === se ? "wealth" : "pressure";
  // 지지: 육합 / 삼합 / 같은 띠 / 충 / 없음
  const br = ZODIAC_SIX[zi] === b ? "six" : b === zi ? "self" : (b + 6) % 12 === zi ? "clash" : b % 4 === zi % 4 ? "tri" : "none";

  const base = { help: 77, same: 72, express: 70, wealth: 74, pressure: 63 }[rel];
  const branchDelta = { six: 10, tri: 7, self: 3, clash: -15, none: 0 }[br];
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));
  const total = clamp(base + branchDelta, 40, 95);
  const love = clamp(total + (br === "six" ? 6 : br === "tri" ? 3 : br === "clash" ? -6 : 0) + (rel === "express" ? 4 : rel === "pressure" ? -2 : 0), 40, 97);
  const wealth = clamp(total + (rel === "wealth" ? 9 : rel === "same" ? -5 : rel === "express" ? 3 : 0), 40, 97);
  const work = clamp(total + (rel === "pressure" || rel === "help" ? 5 : rel === "express" ? 2 : 0) + (br === "clash" ? -4 : 0), 40, 97);

  const seLabel = Z_EL_LABEL[se];
  const stemMsg = {
    help: `오늘 일진의 ${seLabel} 기운이 ${zLabel}의 ${Z_EL_LABEL[ze]} 기운을 살려 주는 날입니다. 도움을 청하면 손을 내미는 사람이 있고, 공부·문서 일이 잘 풀립니다.`,
    same: `오늘은 ${zLabel}와 같은 ${seLabel} 기운이 들어오는 날입니다. 뜻 맞는 사람과 힘을 합치기 좋지만, 경쟁과 지출도 함께 늘어납니다.`,
    express: `${zLabel}의 기운이 오늘 일진의 ${seLabel} 쪽으로 흘러나가는 날입니다. 말과 아이디어가 잘 통하니 먼저 제안하되, 체력 소모는 조심하십시오.`,
    wealth: `${zLabel}가 오늘 일진의 ${seLabel} 기운을 다스리는 형국이라 재물 흐름이 손에 잡히는 날입니다. 계산이 빨라지니 정리·거래에 유리합니다.`,
    pressure: `오늘 일진의 ${seLabel} 기운이 ${zLabel}를 누르는 날입니다. 책임과 눈치가 늘어나니 앞에 나서기보다 맡은 일을 꼼꼼히 마무리하십시오.`,
  }[rel];
  const branchMsg = {
    six: `${dayAnimal}은 ${zLabel}와 육합(六合)을 이루어 사람 사이의 일이 술술 풀립니다.`,
    tri: `${dayAnimal}은 ${zLabel}와 삼합(三合)으로 손발이 맞아, 함께하는 일에 힘이 실립니다.`,
    self: `${zLabel} 자신의 날이라 존재감이 커지니, 고집만 조금 내려놓으면 좋습니다.`,
    clash: `${rel === "pressure" ? "" : "다만 "}${dayAnimal}은 ${zLabel}와 정면으로 부딪히는 충(沖)의 날이니, 이동·계약·큰 결정은 한 번 더 확인하십시오.`,
    none: `일진과 띠 사이에 걸리는 것이 없어 흐름은 평탄합니다.`,
  }[br];

  // 행운의 기운: 나를 살리는 기운을 채우고, 누르는 날엔 사이를 이어 주는 기운(통관)으로
  const generatorOf = (el: El) => (Object.keys(Z_GEN) as El[]).find((k) => Z_GEN[k] === el) as El;
  const luckyEl = { help: se, same: Z_GEN[ze], express: generatorOf(ze), wealth: ze, pressure: Z_GEN[se] }[rel];
  const luck = Z_LUCK[luckyEl];
  // 행운의 시간: 내 띠와 합이 드는 낮 시간 중 오늘 일진과 부딪히지 않는 때
  const hourCands = [ZODIAC_SIX[zi], ...[0, 4, 8].map((k) => (zi % 4) + k).filter((x) => x !== zi)];
  const hour = hourCands.find((h) => Z_HOUR_LABEL[h] && (h + 6) % 12 !== b) ?? hourCands.find((h) => Z_HOUR_LABEL[h]);

  return {
    total, love, wealth, work,
    relation: br,
    message: `${stemMsg} ${branchMsg}`,
    color: luck.color,
    direction: luck.direction,
    time: hour !== undefined ? Z_HOUR_LABEL[hour] : "오후 1시~3시",
    number: luck.number,
    luckyEl: Z_EL_LABEL[luckyEl],
    iljin,
  };
}

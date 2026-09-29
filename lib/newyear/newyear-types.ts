/**
 * 신년운세 결과 형태. 화면(웹·앱인토스)은 이 파일만 가져다 쓴다.
 * 계산 엔진은 명운 서버(/api/newyear)에만 있고, 앱인토스에는 계산 라이브러리가 없다.
 */

export type NewYearCalendarType = "solar" | "lunar" | "lunar-leap";
export type NewYearGender = "male" | "female";

export type NewYearFlag = {
  kind: "samjae" | "clash" | "own" | "harmony";
  tone: "good" | "caution" | "neutral";
  title: string;
  text: string;
};

export type NewYearMonth = {
  /** 양력 월 */
  month: number;
  ganjiKorean: string;
  tenGod: string;
  score: number;
  line: string;
  tag: "good" | "caution" | null;
};

export type NewYearResult = {
  year: number;
  yearGanjiKorean: string;
  yearNickname: string;
  zodiac: string;
  dayMaster: { korean: string; hanja: string; element: string };
  tenGod: string;
  title: string;
  keyword: string;
  summary: string;
  advice: string;
  score: number;
  flags: NewYearFlag[];
  months: NewYearMonth[];
  bestMonths: number[];
  cautionMonths: number[];
};

/** 상세 풀이(유료) — 웹·앱 가격. 토스는 공급가 3,000원(판매가 3,300원)으로 등록한다 */
export const NEWYEAR_DETAIL_PRICE_WON = 3_300;
/** 구글 플레이·앱인토스 상품 키 */
export const NEWYEAR_DETAIL_PRODUCT_ID = "newyear_detail";

export type NewYearDetailArea = {
  key: "money" | "love" | "work" | "health";
  label: string;
  summary: string;
  doThis: string;
  avoid: string;
};

export type NewYearDetailMonth = {
  month: number;
  focus: string;
  doThis: string;
  avoid: string;
};

export type NewYearDetail = {
  overview: string;
  areas: NewYearDetailArea[];
  months: NewYearDetailMonth[];
  motto: string;
};

/** 결제한 사람의 입력값. 결제 1건에 한 사람만 묶인다 */
export type NewYearDetailInput = {
  name: string;
  birthDate: string;
  calendarType: NewYearCalendarType;
  gender: NewYearGender;
};

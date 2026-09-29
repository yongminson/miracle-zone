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

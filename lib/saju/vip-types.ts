/** VIP PDF / API 공통 타입 */

export type VipGender = "male" | "female";
export type VipCalendarType = "solar" | "lunar" | "lunar-leap";

export type VipMingpaCalendarSlice = {
  year: number;
  month: number;
  day: number;
  intercalation?: boolean;
};

export type VipGapjaPillar = {
  /** 예: "병인" */
  pillarKo: string;
  cheonganIndex: number;
  ganjiIndex: number;
};

export type VipMingpaJson = {
  gender: VipGender;
  calendarType: VipCalendarType;
  birthTimeRaw?: string | null;
  solarDate: VipMingpaCalendarSlice;
  lunarDate: VipMingpaCalendarSlice;
  fourPillars: {
    year: VipGapjaPillar;
    month: VipGapjaPillar;
    day: VipGapjaPillar;
    hour: VipGapjaPillar | null;
  };
  /** 일간 한글 천간 한 글자 — 십성 계산의 기준 */
  dayMasterStemKo: string | null;
  sipSeongByPillar: Record<string, unknown> | null;
  daeunOutline: unknown[] | null;
  libraryMeta: { source: "korean-lunar-calendar"; version: string };
  todoNotes: string[];
};

export type VipAiReportPage = {
  pageNumber: number;
  title: string;
  markdown: string;
};

export type VipAiReportPayload = {
  overview: string;
  wealth: string;
  careerLove: string;
  yearlyStrategy: string;
  pages: VipAiReportPage[];
};

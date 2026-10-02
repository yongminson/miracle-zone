/**
 * 날마다의 흐름(운세 캘린더) 결과 형태. 화면(웹·앱인토스)은 이 파일만 가져다 쓴다.
 * 계산은 명운 서버(/api/calendar)에서만 한다.
 */

export type DayLuckTone = "good" | "normal" | "caution";

export type DayLuck = {
  /** YYYY-MM-DD (한국 시간) */
  date: string;
  /** 월·화·수… */
  weekday: string;
  ganjiKorean: string;
  tenGod: string;
  score: number;
  tone: DayLuckTone;
  /** "공식적인 일에 힘이 실리는 날" 같은 그날의 성격 */
  title: string;
  /** 그날 해 볼 만한 행동 한 가지 */
  action: string;
  /** 일지와 충·합이 있을 때만 붙는 한 줄 */
  note: string | null;
};

export type DayLuckRange = {
  days: DayLuck[];
  /** 기간 안에서 가장 힘이 실리는 날 */
  best: string | null;
  /** 기간 안에서 가장 조심할 날(조심할 날이 없으면 null) */
  caution: string | null;
};

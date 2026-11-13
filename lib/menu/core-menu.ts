/**
 * 메뉴 정리 (2026-11-14, 오너 결정).
 * 최근 30일 사용·매출을 보고 상단 메뉴에는 핵심만 둔다. 나머지는 "전체" 버튼 안에 그대로 있고
 * 페이지 주소도 그대로다(검색·앱·토스 영향 없음). 점신 메인(아이콘 9개)처럼 고르기 쉽게.
 *
 * 30일 근거: 신년운세 방문 563·결과 90 / 오늘의 운세 결과 75 / 사주 인사이트 매출 대부분(15건) /
 * 궁합 결과 50 / 로또 매주 재방문 / 만세력은 검색어("만세력 무료")·경쟁사 공통 메뉴.
 * 손금 7·제단 12·좋은 날 14·손없는날 16·MBTI 17·시험 19·띠별 31·이달 35 은 "전체" 안으로.
 */

/** 상단 메뉴에 늘 보이는 메뉴(이 순서로) */
export const CORE_MENU_IDS = ["fortune", "newyear", "vip", "match", "together", "lotto", "manse"] as const;

export function isCoreMenu(id: string): boolean {
  return (CORE_MENU_IDS as readonly string[]).includes(id);
}

/** 시즌 메뉴 — 이 날(한국 시간)부터 메뉴에서 숨긴다. 페이지는 그대로 열린다 */
const SEASON_END: Record<string, string> = {
  season: "2026-11-20", // 시험 합격운: 수능(2026-11-19) 다음 날
};

export function isSeasonOver(id: string, now = new Date()): boolean {
  const end = SEASON_END[id];
  if (!end) return false;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);
  return today >= end;
}

/** 핵심 메뉴를 앞으로, 나머지는 원래 순서대로 */
export function sortCoreFirst<T extends { id: string }>(items: T[]): T[] {
  const core = CORE_MENU_IDS.map((id) => items.find((item) => item.id === id)).filter((x): x is T => !!x);
  return [...core, ...items.filter((item) => !isCoreMenu(item.id))];
}

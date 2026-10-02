/**
 * 웹·구글 앱에는 앱인토스 SDK 가 없다. lib/analytics.ts 를 앱인토스와 똑같이 두려고
 * 같은 이름의 빈 함수만 둔다. 실제 구현은 miracle-toss 저장소의 같은 파일에 있다.
 */

export async function tossLog(
  _kind: "screen" | "click",
  _params: { log_name: string } & Record<string, string | number | boolean>,
): Promise<void> {}

export async function tossRequestReview(): Promise<void> {}

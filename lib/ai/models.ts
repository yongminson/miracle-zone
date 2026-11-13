/**
 * OpenAI 모델·호출 설정 한곳 모음 (2026-11-14).
 *
 * gpt-4o·gpt-4o-mini·gpt-4.1·gpt-4.1-mini 는 2027-01-14 API 종료(OpenAI 공식 deprecations, 2026-10-14 발표).
 * 새 모델(gpt-6 계열)은 생각하는 모델이라 예전 설정을 그대로 받지 않는다 — 실제 호출로 확인(2026-11-14):
 *   - max_tokens                    → 400 오류. max_completion_tokens 를 써야 한다(생각하는 토큰도 여기서 빠진다)
 *   - temperature(1 이 아닌 값)      → reasoning_effort "none" 일 때만 된다. low 이상이면 400 오류
 *   - seed, response_format json_object, 이미지 입력(image_url) → 된다
 * 그래서 모든 호출은 이 파일의 aiOptions() 로 설정을 만든다. 모델은 Vercel 환경변수로도 바꿀 수 있다.
 */

/** 무료 기능(관상·궁합·꿈해몽 등) — 빠르고 싼 모델 (입력 $0.10·출력 $0.50 / 100만 토큰) */
export const FREE_MODEL = process.env.AI_FREE_MODEL?.trim() || "gpt-6-luna";
/** 유료 풀이(신년·이달·궁합 심층·좋은 날·시험·사주 인사이트) — 글을 더 잘 쓰는 모델 (입력 $1·출력 $5) */
export const PAID_MODEL = process.env.AI_PAID_MODEL?.trim() || "gpt-6.1-terra";

export type AiEffort = "none" | "low" | "medium";

/**
 * 예전 { temperature, max_tokens } 대신 넣는 설정.
 * answerTokens: 답 글자에 필요한 만큼(예전 max_tokens 값). 생각하는 토큰 몫을 더해 한도를 잡는다.
 * temperature 는 effort "none" 일 때만 보낸다(다른 단계에서는 모델이 거부한다).
 */
export function aiOptions(answerTokens: number, effort: AiEffort = "low", temperature?: number) {
  const thinking = effort === "none" ? 0 : effort === "low" ? 2_000 : 6_000;
  return {
    max_completion_tokens: answerTokens + thinking,
    reasoning_effort: effort,
    ...(effort === "none" && typeof temperature === "number" ? { temperature } : {}),
  };
}

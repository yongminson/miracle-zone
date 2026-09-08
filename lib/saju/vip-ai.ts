import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { VipMingpaJson, VipAiReportPayload } from "./vip-types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
});

export function buildVipReportSystemPrompt(): string {
  return `당신은 사용자가 입력한 생년월일 정보로 자기이해를 돕는 콘텐츠 작성자입니다.
반드시 유효한 JSON 한 개만 출력하세요. 마크다운 펜스나 설명 문구는 금지입니다.

중요 제한:
- 입력 JSON에 null, TODO 또는 누락된 값은 계산하거나 추측하지 마세요.
- 시주, 십성, 대운 순역행, 대운 시작 나이, 10년 단위 대운 배열, 용신, 미래 사건을 만들어내지 마세요.
- 제공된 연주·월주·일주는 현재 달력 변환 결과이며 절기·야자시·진태양시 보정이 완료된 정밀 만세력이라고 표현하지 마세요.
- 건강·재정·법률·진로·관계의 결과나 시기를 단정하지 말고 자기점검 질문과 일반적인 실천 제안만 제공하세요.
- 부적, 길방, 용신 처방이나 효능을 제안하지 마세요.

스키마:
{
  "overview": "string — 입력 정보와 계산 범위, 성향 관찰 요약",
  "wealth": "string — 소비·저축 습관을 돌아보는 일반 질문과 실천 제안",
  "careerLove": "string — 일·관계에서 활용할 자기점검 질문",
  "yearlyStrategy": "string — 지금부터 적용할 수 있는 비예측적 실천 계획",
  "pages": [
    { "pageNumber": 3, "title": "string", "markdown": "string" },
    ... 반드시 pageNumber 3부터 14까지 12개 요소 (총 12개 페이지 분량 본문)
  ]
}

각 pages[].markdown 은 해당 페이지에 들어갈 본문으로, 소제목은 ## 로 시작하는 마크다운을 허용합니다.
명리 용어를 쓰더라도 계산된 입력 범위 안에서만 설명하고, 결과는 참고용 자기이해 콘텐츠임을 분명히 하세요.`;
}

export function buildVipReportUserPrompt(mingpa: VipMingpaJson): string {
  return `아래 JSON은 현재 구현된 달력 변환 결과입니다. null, TODO, 누락된 필드는 절대 추론하거나 일반론으로 채우지 말고 계산 범위의 한계로 명시하세요.

${JSON.stringify(mingpa, null, 2)}

"명운 사주 인사이트 리포트"를 스키마에 맞게 작성하세요. pages 배열은 표지·목차가 아닌 본문 페이지(3~14페이지)에 대응하며, 예측 대신 자기이해 질문과 실행 가능한 일반 가이드를 제공합니다.`;
}

/** OpenAI로 사주 인사이트 리포트 JSON 생성 (실패 시 null) */
export async function fetchVipReportOpenAi(mingpa: VipMingpaJson): Promise<VipAiReportPayload | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.VIP_REPORT_OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildVipReportSystemPrompt() },
        { role: "user", content: buildVipReportUserPrompt(mingpa) },
      ],
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;
    return JSON.parse(raw) as VipAiReportPayload;
  } catch {
    return null;
  }
}

/** Gemini로 사주 인사이트 리포트 JSON 생성 (실패 시 null) — OPENAI 미설정 시 보조 */
export async function fetchVipReportGemini(mingpa: VipMingpaJson): Promise<VipAiReportPayload | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  try {
    const genAI = new GoogleGenerativeAI(key);
    const modelName = process.env.VIP_REPORT_GEMINI_MODEL ?? "gemini-2.0-flash";
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
    const prompt = `${buildVipReportSystemPrompt()}\n\n${buildVipReportUserPrompt(mingpa)}`;
    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    if (!raw) return null;
    return JSON.parse(raw) as VipAiReportPayload;
  } catch {
    return null;
  }
}

export function buildPlaceholderVipReport(_mingpa: VipMingpaJson): VipAiReportPayload {
  const titles = [
    "입력 정보와 계산 범위",
    "연주·월주·일주 요약",
    "성향을 돌아보는 질문",
    "일과 성장의 자기점검",
    "관계와 소통의 자기점검",
    "생활 균형 돌아보기",
    "강점 활용 아이디어",
    "주의할 습관 점검",
    "선택 기준 정리",
    "작은 실천 계획",
    "기록과 회고 가이드",
    "요약 및 이용 안내",
  ];
  return {
    overview: "AI 리포트 생성 전입니다. 관리자 키 설정 후 다시 요청하면 본문이 채워집니다.",
    wealth: "(플레이스홀더)",
    careerLove: "(플레이스홀더)",
    yearlyStrategy: "(플레이스홀더)",
    pages: titles.map((title, i) => ({
      pageNumber: i + 3,
      title,
      markdown: `## ${title}\n\n_사주 인사이트 리포트 본문이 여기에 렌더링됩니다._`,
    })),
  };
}

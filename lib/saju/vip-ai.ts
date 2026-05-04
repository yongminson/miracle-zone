import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { VipMingpaJson, VipAiReportPayload } from "./vip-types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
});

export function buildVipReportSystemPrompt(): string {
  return `당신은 한국 전통 명리 프리미엄 리포트 전문가입니다.
반드시 유효한 JSON 한 개만 출력하세요. 마크다운 펜스나 설명 문구는 금지입니다.

스키마:
{
  "overview": "string — 총평·성향 핵심 (길게)",
  "wealth": "string — 재물·재테크 흐름",
  "careerLove": "string — 직업·관계",
  "yearlyStrategy": "string — 향후 수년 전략 요약",
  "pages": [
    { "pageNumber": 3, "title": "string", "markdown": "string" },
    ... 반드시 pageNumber 3부터 14까지 12개 요소 (총 12개 페이지 분량 본문)
  ]
}

각 pages[].markdown 은 해당 페이지에 들어갈 본문으로, 소제목은 ## 로 시작하는 마크다운을 허용합니다.
명리 용어는 정확히 쓰되 과장된 금전 약속은 피합니다.`;
}

export function buildVipReportUserPrompt(mingpa: VipMingpaJson): string {
  return `아래 JSON은 만세력 라이브러리로 산출한 명식 뼈대입니다. 시주·십성·대운 일부는 미완성 필드가 있을 수 있습니다 — 있는 정보만 근거로 서술하고, 부족하면 보수적으로 일반론을 덧붙이세요.

${JSON.stringify(mingpa, null, 2)}

14페이지 분량의 심층 리포트를 스키마에 맞게 작성하세요. pages 배열은 표지·목차가 아닌 본문 페이지(3~14페이지)에 대응합니다.`;
}

/** OpenAI로 VIP 리포트 JSON 생성 (실패 시 null) */
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

/** Gemini로 VIP 리포트 JSON 생성 (실패 시 null) — OPENAI 미설정 시 보조 */
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
    "총평과 성격 구조",
    "오행 균형과 신강·신약",
    "재물운 심층 분석",
    "사업·직장 적성",
    "인간관계와 귀인",
    "연애·결혼운 흐름",
    "건강 주의 체질",
    "학업·자기계발",
    "대운 개요",
    "세운 전략 (올해)",
    "향후 3년 로드맵",
    "실천 체크리스트",
  ];
  return {
    overview: "AI 리포트 생성 전입니다. 관리자 키 설정 후 다시 요청하면 본문이 채워집니다.",
    wealth: "(플레이스홀더)",
    careerLove: "(플레이스홀더)",
    yearlyStrategy: "(플레이스홀더)",
    pages: titles.map((title, i) => ({
      pageNumber: i + 3,
      title,
      markdown: `## ${title}\n\n_VIP 리포트 본문이 여기에 렌더링됩니다._`,
    })),
  };
}

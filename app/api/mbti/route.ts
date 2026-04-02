import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

const RESPONSE_FORMAT = `
{
  "mbti": "ENFP",
  "title": "당신은 열정적인 스파크형!",
  "summary": "입력하신 행동 패턴을 분석한 결과입니다.",
  "details": "구체적인 성향 및 심리 분석 (3~4문장)",
  "goodMatch": "INTJ, INFJ",
  "badMatch": "ISTJ, ESTJ",
  "actionGuide": "이런 점을 주의하거나 활용해보세요 (1줄)"
}
🚨 반드시 위 JSON 형식으로만 답변하세요.
`;

const SYSTEM_PROMPT = `당신은 사람의 행동, 생각, 상황 대처 방식을 보고 MBTI 성격 유형을 정확하게 유추하는 최고급 심리 분석 전문가입니다.
사용자가 입력한 일상 이야기나 성격을 분석하여 가장 일치하는 MBTI를 유추해내세요.`;

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "API 키가 없습니다." }, { status: 500 });

  try {
    const { mbtiText } = await request.json();
    if (!mbtiText) return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT + RESPONSE_FORMAT },
        { role: "user", content: `사용자의 이야기: "${mbtiText}"\n이 사람의 MBTI를 분석해줘.` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return NextResponse.json({ error: "AI 응답이 없습니다." }, { status: 500 });

    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch (error: any) {
    return NextResponse.json({ error: `서버 에러: ${error.message}` }, { status: 500 });
  }
}
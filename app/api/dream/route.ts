import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

const RESPONSE_FORMAT = `
{
  "type": "길몽 또는 흉몽 또는 일반몽 또는 태몽",
  "score": 85, 
  "summary": "꿈의 전반적인 의미 1줄 요약",
  "details": "꿈에 대한 상세한 해몽 및 심리 분석 (3~4문장)",
  "actionGuide": "이 꿈을 꾼 후 해야 할 행동 지침 1줄 (예: 당장 로또를 사세요, 오늘 하루는 말을 조심하세요 등)"
}
🚨 [주의] score는 0부터 100 사이의 숫자입니다. 반드시 JSON 형식으로 출력하세요.
`;

const SYSTEM_PROMPT = `당신은 최고급 철학관 원장이자, 꿈의 상징을 완벽하게 분석하는 해몽 전문가입니다.
사용자가 입력한 꿈의 내용을 분석하여, 이것이 재물운/행운을 부르는 '길몽'인지, 조심해야 할 '흉몽'인지 명확하게 구분하세요.
반드시 JSON 포맷으로 응답해야 합니다.`;

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "API 키가 설정되지 않았습니다." }, { status: 500 });

  try {
    const body = await request.json();
    const { dreamText } = body;
    if (!dreamText) return NextResponse.json({ error: "꿈 내용을 입력해주세요." }, { status: 400 });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT + RESPONSE_FORMAT },
        { role: "user", content: `사용자의 꿈 내용: "${dreamText}"\n이 꿈을 해몽해줘.` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7, 
      max_tokens: 1500,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return NextResponse.json({ error: "AI 응답이 없습니다." }, { status: 500 });

    const parsed = JSON.parse(content) as Record<string, unknown>;

    const title = `${String(dreamText).slice(0, 20)}... 꿈 해몽, 길몽일까 흉몽일까?`;

    const { data: insertedData, error: insertError } = await supabase
      .from("dreams")
      .insert({ title })
      .select("id")
      .single();

    if (insertError) {
      console.error("Dream DB insert error:", insertError);
      return NextResponse.json({ error: `DB 저장 실패: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json({ ...parsed, db_id: insertedData.id });
  } catch (error: any) {
    console.error("Dream API Error:", error);
    return NextResponse.json({ error: `서버 에러 발생: ${error.message}` }, { status: 500 });
  }
}
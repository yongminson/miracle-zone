import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

const CHOSUNG_TO_OHAENG: Record<number, string> = {
  0: "목(木)", 1: "목(木)", 15: "목(木)",
  2: "화(火)", 3: "화(火)", 4: "화(火)", 5: "화(火)", 16: "화(火)",
  11: "토(土)", 18: "토(土)",
  9: "금(金)", 10: "금(金)", 12: "금(金)", 13: "금(金)", 14: "금(金)",
  6: "수(水)", 7: "수(水)", 8: "수(水)", 17: "수(水)",
};

function getEumryeongOhaeng(name: string): string {
  const hangulOnly = name.replace(/[^\uAC00-\uD7A3]/g, "");
  if (!hangulOnly) return "계산 불가 (한자만 입력됨)";
  const ohaengList: string[] = [];
  for (const char of hangulOnly) {
    const code = char.charCodeAt(0);
    if (code < 0xac00 || code > 0xd7a3) continue;
    const chosungIndex = Math.floor((code - 0xac00) / 588);
    const ohaeng = CHOSUNG_TO_OHAENG[chosungIndex];
    if (ohaeng) ohaengList.push(ohaeng);
  }
  return ohaengList.length ? ohaengList.join(", ") : "계산 불가";
}

const RESPONSE_FORMAT = `
{
  "freeSummary": "이름의 전반적인 기운에 대한 1줄 요약",
  "freeWeakness": "이 이름의 가장 치명적인 단점 1줄 (팩트폭력)",
  "premiumReport": {
    "basisBox": {
      "pronunciation": "음령오행 요약 (예: 손(金)-용(土)-민(水))",
      "resource": "자원오행 요약 (★반드시 글자별 1:1 매칭 명시. 예: 孫-목(木), 龍-토(土), 民-수(水))",
      "sajuRelation": "사주와의 관계 요약"
    },
    "coreEnergy": "핵심 기운 및 파동 분석 (3~4문장)",
    "nameFlow": "음양오행 심층 분석 (3~4문장)",
    "sajuFit": "사주와 이름의 궁합 (3~4문장)",
    "lifeCycle": "인생 총운 (3~4문장)"
  }
}
🚨 [절대 경고] premiumReport 안의 coreEnergy, nameFlow, sajuFit, lifeCycle 4개의 키는 화면을 그리는 필수 데이터입니다. 무조건 100% 빠짐없이 출력하세요.
`;

const SYSTEM_PROMPT_BASE = `당신은 최고급 철학관 원장이자, 타협 없이 팩트폭력을 날리는 정통 성명학 전문가입니다.

[분석 원칙 - ★한문(자원오행) 절대 우선 및 불변의 법칙★]
1. 자원오행 불변의 법칙: 한자(예: 孫龍民)가 입력되었다면, 한글 이름이 있든 없든 **각 한자의 자원오행(목화토금수)은 무조건 똑같은 오행으로 영구 고정**하여 평가하세요. 상황이나 맥락에 따라 같은 한자의 오행을 다르게 유추하면 절대 안 됩니다.
2. 한글 유추 필수: 사용자가 한자만 입력하여 음령오행이 [계산 불가]로 들어왔다면, 한자의 대표 한국어 발음을 스스로 유추(예: 孫龍民 -> 손용민)하여 음령오행을 계산한 뒤 풀이에 똑같이 반영하세요.
3. 한자 뜻 중심 분석: 분석의 90% 이상은 반드시 '한자의 고유한 뜻과 자원오행'을 중심으로 진행하세요.
4. 획수 연산 금지: 숫자 연산(예: 총 31획)을 절대 하지 마세요.
5. 압축된 팩트폭력: 중간에 응답이 끊기지 않도록 각 프리미엄 항목은 딱 3~4문장으로 압축하여 뼈를 때리는 팩트만 전달하세요.
6. 🚨 [가장 중요]: 각 프리미엄 항목(coreEnergy, nameFlow, sajuFit, lifeCycle) 풀이 중, 가장 뼈를 때리는 핵심 팩트 딱 1문장을 반드시 특수문자 【 와 】 로 감싸세요.
`;

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "API 키 오류" }, { status: 500 });

  try {
    const body = await request.json();
    const { name, hanja, birthDate, birthTime, gender } = body;
    if (!name) return NextResponse.json({ error: "이름 필수" }, { status: 400 });

    let finalName = name;
    let finalHanja = hanja || "";

    // 사용자가 孫龍民 처럼 한자만 덩그러니 쳤을 때, 데이터 꼬임 방지
    const isAllHanja = /^[\u4e00-\u9fa5]+$/.test(name.replace(/\s+/g, ""));
    if (isAllHanja && !hanja) {
        finalHanja = name.trim();
        finalName = "미입력(한자만 입력됨)";
    }

    const calculatedOhang = getEumryeongOhaeng(finalName);
    
    // AI에게 넘어가는 최종 지시문
    const userPrompt = `성별: ${gender}, 생일: ${birthDate || "모름"}, 시간: ${birthTime}. 
    한글이름: ${finalName}, 한자이름: ${finalHanja}. 
    백엔드 계산 음령오행: [${calculatedOhang}]. 
    위 정보를 바탕으로 철저한 '한자(자원오행)' 중심의 분석을 JSON으로 반환해.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT_BASE + RESPONSE_FORMAT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0, 
      seed: 1004,     
      max_tokens: 2500,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("응답 없음");

    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json({ error: "이름 풀이 중 오류 발생" }, { status: 500 });
  }
}
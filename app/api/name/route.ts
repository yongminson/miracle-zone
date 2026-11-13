import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { PAID_MODEL, aiOptions } from "@/lib/ai/models";
import { analyzeName, describeNameFacts } from "@/lib/name/name-engine";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

// 2026-11-03: 획수·4격 길흉·자원오행·음양·등급·점수·사주 관계는 lib/name/name-engine.ts 가 계산한다.
// 예전엔 AI 가 추측해서 손님이 획수를 세 보면 틀릴 수 있었다. AI 는 계산 결과로 문장만 쓴다.
// 요청·응답 형식은 그대로(토스 미니앱도 이 경로를 부른다). 웹은 글자별 한자(hanjaSelections)를 더 보낸다.
const RESPONSE_FORMAT = `
{
  "freeSummary": "이름의 전반적인 기운에 대한 1줄 요약",
  "freeWeakness": "이 이름의 가장 치명적인 단점 1줄 (팩트폭력)",
  "gradeReason": "등급 판정 이유 한줄 요약 (계산 근거의 4격·사주 관계를 근거로)",
  "careers": ["적성 직업1", "적성 직업2", "적성 직업3"],
  "renameReason": "개명 필요성 이유 한줄 (계산된 개명 필요성과 같은 방향으로)",
  "premiumReport": {
    "coreEnergy": "핵심 기운 및 파동 분석 (3~4문장)",
    "nameFlow": "음양오행 심층 분석 (3~4문장)",
    "sajuFit": "사주와 이름의 궁합 (3~4문장)",
    "lifeCycle": "인생 총운 (3~4문장)"
  }
}
🚨 [절대 경고] premiumReport 안의 coreEnergy, nameFlow, sajuFit, lifeCycle 4개의 키는 화면을 그리는 필수 데이터입니다. 무조건 100% 빠짐없이 출력하세요.
`;

const SYSTEM_PROMPT_BASE = `당신은 최고급 철학관 원장이자, 타협 없이 팩트폭력을 날리는 정통 성명학 전문가입니다.

[분석 원칙]
1. 획수·4격(원·형·이·정) 길흉·자원오행·음양·사주 관계·점수·등급은 서버가 이미 계산했습니다. [계산 근거]의 숫자와 판정을 그대로 따르고, 다른 숫자나 다른 오행을 절대 지어내지 마세요.
2. [계산 근거]에 한자가 없다고 되어 있으면 획수·4격·자원오행 이야기는 하지 말고, 한글 소리(음령오행)와 사주 관계로만 풀이하세요.
3. 한자가 있으면 한자의 고유한 뜻을 풀이에 녹이세요.
4. 오행 관계는 이 표만 따르세요. 상생: 목→화→토→금→수→목. 상극: 목→토, 토→수, 수→화, 화→금, 금→목.
5. 압축된 팩트폭력: 각 프리미엄 항목은 딱 3~4문장으로 압축하여 뼈를 때리는 팩트만 전달하세요.
6. 🚨 [가장 중요]: 각 프리미엄 항목(coreEnergy, nameFlow, sajuFit, lifeCycle) 풀이 중, 가장 뼈를 때리는 핵심 팩트 딱 1문장을 반드시 특수문자 【 와 】 로 감싸세요.
`;

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "API 키 오류" }, { status: 500 });

  try {
    const body = await request.json();
    const { name, hanja, hanjaSelections, birthDate, birthTime, gender } = body;
    if (!name) return NextResponse.json({ error: "이름 필수" }, { status: 400 });

    const analysis = analyzeName({ name, hanja, hanjaSelections, birthDate, birthTime, gender });

    const userPrompt = `성별: ${gender}, 생일: ${birthDate || "모름"}, 시간: ${birthTime}.

[계산 근거 — 이 내용과 어긋나는 말을 하지 마세요]
${describeNameFacts(analysis)}

위 계산을 바탕으로 JSON 을 반환해.`;

    const completion = await openai.chat.completions.create({
      model: PAID_MODEL, // 4o 는 2027-01-14 종료
      messages: [
        { role: "system", content: SYSTEM_PROMPT_BASE + RESPONSE_FORMAT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      seed: 1004,
      ...aiOptions(2500, "none", 0),
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("응답 없음");

    const parsed = JSON.parse(content);
    // 계산으로 정한 값은 AI 답과 상관없이 덮어쓴다
    parsed.nameGrade = analysis.grade;
    parsed.nameScore = analysis.score;
    parsed.yinYangBalance = analysis.fields.yinYangBalance;
    parsed.strokes = analysis.fields.strokes;
    parsed.renameNeeded = analysis.renameNeeded;
    parsed.premiumReport = {
      ...(parsed.premiumReport ?? {}),
      basisBox: {
        pronunciation: analysis.fields.pronunciation,
        resource: analysis.fields.resource,
        sajuRelation: analysis.fields.sajuRelation,
      },
    };
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("[name] 이름 풀이 실패", error);
    return NextResponse.json({ error: "이름 풀이 중 오류 발생" }, { status: 500 });
  }
}

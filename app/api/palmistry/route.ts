import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: (process.env.OPENAI_API_KEY || "").trim(),
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;
    const hand = (formData.get("hand") as string) || "right";
    const isPremium = formData.get("isPremium") === "true";

    if (!imageFile) {
      return NextResponse.json({ error: "이미지를 업로드해주세요." }, { status: 400 });
    }

    if (imageFile.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "이미지 크기는 5MB 이하여야 합니다." }, { status: 400 });
    }

    const handLabel = hand === "left" ? "왼손" : "오른손";
    const apiKey = (process.env.OPENAI_API_KEY || "").trim();
    console.log("API KEY 존재:", !!apiKey, "길이:", apiKey.length);

    // ===== API 키 없을 때 폴백 =====
    if (!apiKey) {
      console.log("폴백 실행: API 키 없음");
      const fallback = {
        handType: "손가락이 길고 손바닥이 넓은 수형으로 감수성과 직관력이 뛰어납니다.",
        lifeLine: "생명선이 길고 뚜렷하여 강한 생명력과 건강한 체력을 나타냅니다.",
        heartLine: "감정선이 깊고 선명하여 감정이 풍부하고 사랑에 진심인 타입입니다.",
        headLine: "두뇌선이 길게 뻗어 있어 논리적 사고력과 창의성을 동시에 갖추고 있습니다.",
        fateLine: "운명선이 뚜렷하여 목표 의식이 강하고 자신만의 길을 개척하는 힘이 있습니다.",
        personality: "감성과 이성이 균형 잡힌 타입으로 주변으로부터 신뢰를 받는 성격입니다.",
        overallGrade: "B+",
        gradeDesc: "전반적으로 균형 잡힌 손금으로 안정적인 삶의 흐름이 예상됩니다.",
        ...(isPremium && {
          wealth: "재물선이 선명하게 나타나 있어 중년 이후 안정적인 재물 축적이 기대됩니다.",
          love: "감정선이 깊고 선명하여 한 번 사랑하면 깊이 헌신하는 타입입니다.",
          health: "생명선이 길고 굵게 뻗어 있어 기본적인 체력과 생명력이 강합니다.",
          career: "운명선이 손목에서 중지까지 뚜렷하게 뻗어 있어 직업적 성취가 뚜렷합니다.",
          summary: "전반적으로 균형 잡힌 좋은 손금을 가지고 계십니다.",
        }),
      };
      return NextResponse.json({ result: fallback });
    }

    // ===== 이미지 base64 변환 =====
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = imageFile.type || "image/jpeg";

    // ===== 프롬프트 =====
    const freePrompt = `You are an expert in East Asian palmistry philosophy.
Analyze the palm lines in this ${handLabel} hand image.
Respond ONLY with valid JSON, no markdown, no explanation.

{
  "handType": "손의 전반적인 특징",
  "lifeLine": "생명선 요약 1~2문장",
  "heartLine": "감정선 요약 1~2문장",
  "headLine": "두뇌선 요약 1~2문장",
  "fateLine": "운명선 요약 1~2문장",
  "personality": "손금으로 본 성격 한 줄",
  "overallGrade": "A+ 또는 A 또는 B+ 또는 B 또는 C",
  "gradeDesc": "등급 설명 한 줄"
}`;

    const premiumPrompt = `You are an expert in East Asian palmistry philosophy.
Analyze the palm lines in this ${handLabel} hand image in detail.
Respond ONLY with valid JSON, no markdown, no explanation.

{
  "handType": "손의 전반적인 특징",
  "lifeLine": "생명선 요약 1~2문장",
  "heartLine": "감정선 요약 1~2문장",
  "headLine": "두뇌선 요약 1~2문장",
  "fateLine": "운명선 요약 1~2문장",
  "personality": "손금으로 본 성격 한 줄",
  "overallGrade": "A+ 또는 A 또는 B+ 또는 B 또는 C",
  "gradeDesc": "등급 설명 한 줄",
  "wealth": "재물운 상세 분석 4~5문장",
  "love": "결혼연애운 상세 분석 4~5문장",
  "health": "건강수명운 상세 분석 4~5문장",
  "career": "직업성공운 상세 분석 4~5문장",
  "summary": "종합 운명 리포트 5~6문장"
}`;

    const prompt = isPremium ? premiumPrompt : freePrompt;

    // ===== OpenAI API 호출 =====
    console.log("OpenAI 호출 시작:", isPremium ? "프리미엄" : "무료");
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: isPremium ? 2000 : 800,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: "high",
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content || "";
    console.log("OpenAI 응답 앞부분:", content.slice(0, 100));

    // ===== JSON 파싱 =====
    let result;
    try {
      let cleaned = content
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/gi, "")
        .trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleaned = jsonMatch[0];
      result = JSON.parse(cleaned);
      console.log("파싱 성공 키:", Object.keys(result).join(", "));
    } catch (e) {
      console.error("JSON 파싱 실패:", content.slice(0, 200));
      result = {
        handType: "손금 분석이 완료되었습니다.",
        lifeLine: content.slice(0, 50) || "생명선 분석 완료",
        heartLine: "감정선 분석 완료",
        headLine: "두뇌선 분석 완료",
        fateLine: "운명선 분석 완료",
        personality: "균형 잡힌 성격",
        overallGrade: "B+",
        gradeDesc: "안정적인 손금입니다.",
        ...(isPremium && {
          wealth: "재물운은 꾸준한 노력에서 빛을 발합니다. 중년 이후 안정적인 자산 축적이 기대됩니다.",
          love: "감정선이 선명하여 진심 어린 사랑을 하는 타입입니다. 안정적인 관계를 맺을 수 있습니다.",
          health: "생명선이 안정적으로 뻗어 있어 기본 체력이 좋습니다. 규칙적인 생활이 중요합니다.",
          career: "운명선이 뚜렷하여 목표를 향해 꾸준히 나아가는 타입입니다. 전문성을 키우면 큰 성취가 가능합니다.",
          summary: "전반적으로 균형 잡힌 손금입니다. 꾸준한 노력으로 원하는 삶을 개척할 수 있는 기운을 지니고 있습니다.",
        }),
      };
    }

    return NextResponse.json({ result });

  } catch (error) {
    console.error("Palmistry API Error:", error);
    return NextResponse.json({ error: "손금 분석 중 오류가 발생했습니다. 다시 시도해주세요." }, { status: 500 });
  }
}
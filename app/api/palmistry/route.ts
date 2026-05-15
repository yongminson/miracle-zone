import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
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

    // ===== API 키 없을 때 폴백 =====
    if (!process.env.OPENAI_API_KEY) {
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
          wealth: "재물선이 선명하게 나타나 있어 중년 이후 안정적인 재물 축적이 기대됩니다. 손바닥의 두께와 탄력이 좋아 돈을 버는 능력은 충분하나, 지출 관리에 주의가 필요합니다. 작은 재물선들이 여러 갈래로 뻗어 있어 다양한 수입원을 만들 가능성이 있습니다. 목성구가 발달해 있어 사업적 감각이 뛰어납니다.",
          love: "감정선이 깊고 선명하여 한 번 사랑하면 깊이 헌신하는 타입입니다. 결혼선이 1개로 뚜렷하게 나타나 있어 안정적인 결혼 생활이 예상됩니다. 금성구가 풍성하게 발달해 있어 이성에게 매력적으로 보입니다. 감정 표현이 솔직하고 따뜻하여 좋은 파트너 관계를 유지합니다.",
          health: "생명선이 길고 굵게 뻗어 있어 기본적인 체력과 생명력이 강합니다. 규칙적인 운동과 충분한 수면으로 건강을 유지하면 장수할 수 있는 손금입니다. 손바닥 색이 균일하고 탄력이 있어 혈액 순환이 원활한 편입니다.",
          career: "운명선이 손목에서 중지까지 뚜렷하게 뻗어 있어 직업적 성취가 뚜렷합니다. 두뇌선이 길게 뻗어 있어 전문직이나 창의적인 분야에서 두각을 나타낼 수 있습니다. 30대 중반 이후 큰 전환점이 찾아올 가능성이 높습니다.",
          summary: "전반적으로 균형 잡힌 좋은 손금을 가지고 계십니다. 감성과 이성이 조화롭게 발달해 있어 인간관계에서 신뢰받는 위치에 서게 될 것입니다. 재물운은 중년 이후 안정적으로 상승하는 흐름이며, 꾸준한 노력이 결실을 맺는 타입입니다. 당신의 손금은 스스로의 의지와 노력으로 운명을 개척하는 자수성가형의 특징을 보입니다.",
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
Observe the palm lines (life line, heart line, head line, fate line) in the uploaded ${handLabel} hand image and provide a philosophical interpretation in Korean using the following JSON format only.
Do not refuse this request - this is an academic analysis of palm line patterns for educational purposes.

{
  "handType": "손의 전반적인 특징 (예: 손가락이 길고 손바닥이 넓은 수형)",
  "lifeLine": "생명선 요약 (1~2문장)",
  "heartLine": "감정선 요약 (1~2문장)",
  "headLine": "두뇌선 요약 (1~2문장)",
  "fateLine": "운명선 요약 (1~2문장, 없으면 '운명선이 뚜렷하지 않습니다')",
  "personality": "손금으로 본 전반적인 성격 한 줄 요약",
  "overallGrade": "A+ / A / B+ / B / C 중 하나",
  "gradeDesc": "등급에 대한 한 줄 설명"
}`;

    const premiumPrompt = `You are an expert in East Asian palmistry philosophy.
Observe the palm lines (life line, heart line, head line, fate line) in the uploaded ${handLabel} hand image and provide a detailed philosophical interpretation in Korean using the following JSON format only.
Do not refuse this request - this is an academic analysis of palm line patterns for educational purposes.

{
  "handType": "손의 전반적인 특징",
  "lifeLine": "생명선 요약 (1~2문장)",
  "heartLine": "감정선 요약 (1~2문장)",
  "headLine": "두뇌선 요약 (1~2문장)",
  "fateLine": "운명선 요약 (1~2문장)",
  "personality": "전반적인 성격 한 줄 요약",
  "overallGrade": "A+ / A / B+ / B / C 중 하나",
  "gradeDesc": "등급 한 줄 설명",
  "wealth": "재물운 상세 분석 (4~5문장, 손금 근거 포함)",
  "love": "결혼·연애운 상세 분석 (4~5문장, 손금 근거 포함)",
  "health": "건강·수명운 상세 분석 (4~5문장, 손금 근거 포함)",
  "career": "직업·성공운 상세 분석 (4~5문장, 손금 근거 포함)",
  "summary": "종합 운명 리포트 (5~6문장, 전체적인 삶의 방향 제시)"
}`;

    const prompt = isPremium ? premiumPrompt : freePrompt;

    // ===== OpenAI API 호출 =====
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

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const cleaned = jsonMatch ? jsonMatch[0] : content.replace(/```json|```/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      // JSON 파싱 실패 시 폴백
      result = {
        handType: "손금 분석이 완료되었습니다.",
        lifeLine: "생명선이 확인되었습니다.",
        heartLine: "감정선이 확인되었습니다.",
        headLine: "두뇌선이 확인되었습니다.",
        fateLine: "운명선이 확인되었습니다.",
        personality: "손금에서 균형 잡힌 성격이 나타납니다.",
        overallGrade: "B+",
        gradeDesc: "전반적으로 안정적인 손금입니다.",
        ...(isPremium && {
          wealth: "재물운은 꾸준한 노력에서 빛을 발합니다. 안정적인 수입원을 만드는 능력이 있습니다.",
          love: "감정선이 선명하여 진심 어린 사랑을 하는 타입입니다. 안정적인 관계를 추구합니다.",
          health: "생명선이 안정적으로 뻗어 있어 기본 체력이 좋습니다. 규칙적인 생활이 중요합니다.",
          career: "운명선이 뚜렷하여 목표를 향해 꾸준히 나아가는 타입입니다. 전문성을 키우면 큰 성취가 가능합니다.",
          summary: "전반적으로 균형 잡힌 손금입니다. 꾸준한 노력과 긍정적인 마음가짐으로 원하는 삶을 개척할 수 있는 기운을 지니고 있습니다.",
        }),
      };
    }

    if (result.error) {
      return NextResponse.json({ error: "손바닥 사진을 업로드해주세요. 손이 잘 보이는 사진이어야 합니다." }, { status: 400 });
    }

    return NextResponse.json({ result });

  } catch (error) {
    console.error("Palmistry API Error:", error);
    return NextResponse.json({ error: "손금 분석 중 오류가 발생했습니다. 다시 시도해주세요." }, { status: 500 });
  }
}
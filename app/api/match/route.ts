import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { FREE_MODEL, aiOptions } from "@/lib/ai/models";
import {
  ELEMENT_LABEL,
  calculateMatch,
  describeElementRelation,
  describeMatchDays,
  describeMatchFacts,
  type MatchElement,
  type MatchPerson,
} from "@/lib/match/match-engine";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });


// 사주 오행·궁합 점수는 2026-10-29 부터 진짜 사주 계산(lib/match/match-engine.ts)으로 낸다.
// 예전엔 (년+월+일)÷5 나머지와 이름·생일 문자열을 섞은 숫자였다 — 무료 점수와 유료 궁합 심층 풀이가 같은 계산이어야 한다.
// 요청·응답 형식은 그대로(토스 미니앱도 이 경로를 부른다).
const RESPONSE_FORMAT = `
{
  "score": 85,
  "grade": "좋음",
  "title": "티키타카 폼 미친 '불'과 '쇠'의 만남",
  "summary": "서로의 부족한 기운을 찰떡같이 채워주는 환상의 짝꿍입니다.",
  "details": "서버가 확정한 오행 데이터를 바탕으로 한 MZ세대 맞춤 심층 풀이 (3~4문장)",
  "categoryScores": {
    "personality": 88,
    "values": 82,
    "money": 71,
    "love": 90,
    "future": 85
  },
  "goodPoint": "환상의 케미 포인트 (가장 잘 맞는 점)",
  "badPoint": "마라맛 팩폭 주의구간 (싸우기 쉬운 포인트)",
  "actionGuide": "오래가기 위한 꿀팁 1줄"
}
🚨 grade는 반드시 score 기준으로: 90이상=천생연분, 80이상=좋음, 70이상=보통, 69이하=주의 중 하나만 사용하세요.
🚨 categoryScores의 모든 값은 0~100 숫자여야 합니다.
🚨 반드시 위 JSON 형식으로만 답변하세요.
`;

const SYSTEM_PROMPT = `당신은 MZ세대의 언어(티키타카, 팩폭, 케미, 폼 미쳤다, 환승 등)를 완벽하게 구사하는 트렌디한 사주 마스터입니다.
내가 제공하는 두 사람의 '오행 기운'과 '궁합 점수'를 절대적으로 따르고, 이 점수에 딱 맞는 분위기로 글을 작성하세요.
- 오행 기운은 무조건 "나무의 기운(木)" 처럼 한글과 한자를 병기해서 사용하세요. (다른 기운을 지어내면 절대 안 됨)
- 점수가 낮으면(50~60점대) 아주 맵고 뼈 때리는 '마라맛 팩폭'을 날리세요.
- 점수가 높으면(80~90점대) 달달하고 부러운 느낌으로 작성하세요.
- 사주 용어를 너무 어렵게 쓰지 말고, 친구가 옆에서 카톡으로 연애 상담해주듯 재밌고 직관적으로 쓰세요.
- 오행 관계를 말할 땐 이 표만 따르세요. 상생: 나무→불→흙→쇠→물→나무 (물이 나무를 키움, 쇠가 물을 모음 등). 상극: 나무→흙, 흙→물, 물→불, 불→쇠, 쇠→나무 (물이 불을 끔, 불이 쇠를 녹임 등). "물이 쇠를 녹인다"처럼 표에 없는 관계는 절대 쓰지 마세요.
- 좋은 날·조심할 날은 서버가 계산하니 글에 요일·날짜를 지어내지 마세요.`;

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "API 키가 없습니다." }, { status: 500 });

  try {
    const { myInfo, partnerInfo, relationshipType } = await request.json();
    if (!myInfo?.name || !partnerInfo?.name || !myInfo?.birthDate || !partnerInfo?.birthDate) {
      return NextResponse.json({ error: "정보를 모두 입력해주세요." }, { status: 400 });
    }
    const relationshipLabel: Record<string, string> = {
      lover: "연인",
      couple: "부부",
      friend: "친구",
      family: "가족",
      business: "비즈니스 파트너",
    };
    const relLabel = relationshipLabel[relationshipType] || "연인";

    // 🚀 서버에서 모든 것을 통제! AI의 헛소리 원천 차단
    const toPerson = (info: Record<string, unknown>): MatchPerson => ({
      name: String(info.name ?? "").slice(0, 20),
      birthDate: String(info.birthDate ?? "").trim(),
      calendarType: info.calendar === "lunar" || info.calendar === "lunar-leap" ? info.calendar : "solar",
      gender: info.gender === "female" ? "female" : "male",
    });
    let calc;
    try {
      calc = calculateMatch(toPerson(myInfo), toPerson(partnerInfo));
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "생년월일을 확인해 주세요." }, { status: 400 });
    }
    const mySajuElem = ELEMENT_LABEL[calc.a.dayMaster.element as MatchElement] ?? calc.a.dayMaster.element;
    const partnerSajuElem = ELEMENT_LABEL[calc.b.dayMaster.element as MatchElement] ?? calc.b.dayMaster.element;
    const fixedScore = calc.score;
    const elementRelation = describeElementRelation(calc, myInfo.name, partnerInfo.name);

    // 예전엔 이름 초성 오행(김=나무 등)도 같이 줘서 제목이 "나무와 쇠, 물과 불"처럼 사주와 다른 기운을 섞어 말했다.
    // 유료 심층 풀이와 같은 말을 하도록 사주 기운(일간)만 준다.
    const prompt = `
    [사람 A] 이름: ${myInfo.name}, 사주 기운(일간): ${mySajuElem}
    [사람 B] 이름: ${partnerInfo.name}, 사주 기운(일간): ${partnerSajuElem}
    [관계 유형]: ${relLabel}

    [사주 계산 근거 — 이 내용과 어긋나는 말을 하지 마세요]
    ${describeMatchFacts(calc, myInfo.name, partnerInfo.name)}
    두 사람 오행 관계 한 줄: ${elementRelation}
    (title·summary·details 에서 오행을 말할 땐 위 두 사람의 사주 기운만 쓰고, 상생/상극도 위 관계 그대로 쓰세요)
    
    🚨 [긴급 명령] 이 두 사람의 궁합 점수는 **${fixedScore}점**으로 이미 확정되었습니다!
    이 점수(${fixedScore}점)와 확정된 오행 기운, 그리고 [${relLabel}] 관계에 맞는 톤으로 JSON 답변을 만들어줘.
    - 연인이면 설레고 달달한 톤
    - 부부면 현실적이고 진지한 조언 톤
    - 친구면 유쾌하고 편한 톤
    - 비즈니스면 냉철하고 분석적인 톤
    - 가족이면 따뜻하고 유대감 중심의 톤
    MZ세대가 카톡으로 공유하기 딱 좋은 트렌디하고 재밌는 말투로 작성해줘.
    `;

    const completion = await openai.chat.completions.create({
      model: FREE_MODEL, // 4o 는 2027-01-14 종료
      messages: [
        { role: "system", content: SYSTEM_PROMPT + RESPONSE_FORMAT },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      // 같은 두 사람을 다시 넣었을 때 풀이가 딴소리를 하지 않게 낮춘다(예전 0.7)
      ...aiOptions(2500, "none", 0.4),
    });

    // 강제로 점수를 서버에서 계산한 fixedScore로 덮어씌움 (AI가 혹시라도 실수할까봐 이중 잠금)
    const parsedData = JSON.parse(completion.choices[0]?.message?.content || "{}");
    parsedData.score = fixedScore;
    parsedData.grade = calc.grade;
    parsedData.categoryScores = calc.categoryScores;
    // 오행 관계·좋은 날·조심할 날은 AI 가 아니라 계산으로 (예전엔 AI 가 "수요일, 매월 7일"을 지어냈다)
    parsedData.elementRelation = elementRelation;
    const days = describeMatchDays(calc, myInfo.name, partnerInfo.name);
    parsedData.luckyDay = days.luckyDay;
    parsedData.carefulDay = days.carefulDay;

    return NextResponse.json(parsedData);
  } catch (error: any) {
    return NextResponse.json({ error: `서버 에러: ${error.message}` }, { status: 500 });
  }
}
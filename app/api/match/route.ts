import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

// 🚀 1. 이름 초성 오행 완벽 계산기 (절대 안 바뀜)
function getNameElement(name: string) {
  if (!name) return "흙의 기운(土)";
  const firstChar = name.charCodeAt(0);
  if (firstChar < 44032 || firstChar > 55203) return "흙의 기운(土)"; 
  const cho = Math.floor((firstChar - 44032) / 588);
  // ㄱ,ㄲ,ㅋ / ㄴ,ㄷ,ㄸ,ㄹ,ㅌ / ㅇ,ㅎ / ㅅ,ㅆ,ㅈ,ㅉ,ㅊ / ㅁ,ㅂ,ㅃ,ㅍ
  if ([0, 1, 15].includes(cho)) return "나무의 기운(木)";
  if ([2, 3, 4, 5, 16].includes(cho)) return "불의 기운(火)";
  if ([11, 18].includes(cho)) return "흙의 기운(土)";
  if ([9, 10, 12, 13, 14].includes(cho)) return "쇠의 기운(金)";
  if ([6, 7, 8, 17].includes(cho)) return "물의 기운(水)";
  return "나무의 기운(木)";
}

// 🚀 2. 사주 오행 계산기 (절대 안 바뀜)
function getSajuElement(birthDate: string) {
  const cleanDate = birthDate.replace(/[^0-9]/g, '');
  const year = parseInt(cleanDate.substring(0, 4) || "1990");
  const month = parseInt(cleanDate.substring(4, 6) || "1");
  const day = parseInt(cleanDate.substring(6, 8) || "1");
  const elements = ["물의 기운(水)", "나무의 기운(木)", "불의 기운(火)", "흙의 기운(土)", "쇠의 기운(金)"];
  return elements[(year + month + day) % 5];
}

// 🚀 3. 궁합 점수 계산기 (위치를 바꿔도 항상 똑같은 점수 보장)
function getFixedScore(name1: string, date1: string, name2: string, date2: string) {
  const sorted = [`${name1}${date1}`, `${name2}${date2}`].sort();
  const combined = sorted[0] + sorted[1];
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = combined.charCodeAt(i) + ((hash << 5) - hash);
  }
  return 50 + (Math.abs(hash) % 49); // 50점 ~ 98점 사이로 완벽 고정
}

const RESPONSE_FORMAT = `
{
  "score": 85,
  "title": "티키타카 폼 미친 '불'과 '쇠'의 만남",
  "summary": "서로의 부족한 기운을 찰떡같이 채워주는 환상의 짝꿍입니다.",
  "details": "서버가 확정한 오행 데이터를 바탕으로 한 MZ세대 맞춤 심층 풀이 (3~4문장)",
  "goodPoint": "환상의 케미 포인트 (가장 잘 맞는 점)",
  "badPoint": "마라맛 팩폭 주의구간 (싸우기 쉬운 포인트)",
  "actionGuide": "오래가기 위한 꿀팁 1줄"
}
🚨 반드시 위 JSON 형식으로만 답변하세요.
`;

const SYSTEM_PROMPT = `당신은 MZ세대의 언어(티키타카, 팩폭, 케미, 폼 미쳤다, 환승 등)를 완벽하게 구사하는 트렌디한 사주 마스터입니다.
내가 제공하는 두 사람의 '오행 기운'과 '궁합 점수'를 절대적으로 따르고, 이 점수에 딱 맞는 분위기로 글을 작성하세요.
- 오행 기운은 무조건 "나무의 기운(木)" 처럼 한글과 한자를 병기해서 사용하세요. (다른 기운을 지어내면 절대 안 됨)
- 점수가 낮으면(50~60점대) 아주 맵고 뼈 때리는 '마라맛 팩폭'을 날리세요.
- 점수가 높으면(80~90점대) 달달하고 부러운 느낌으로 작성하세요.
- 사주 용어를 너무 어렵게 쓰지 말고, 친구가 옆에서 카톡으로 연애 상담해주듯 재밌고 직관적으로 쓰세요.`;

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "API 키가 없습니다." }, { status: 500 });

  try {
    const { myInfo, partnerInfo } = await request.json();
    if (!myInfo?.name || !partnerInfo?.name || !myInfo?.birthDate || !partnerInfo?.birthDate) {
      return NextResponse.json({ error: "정보를 모두 입력해주세요." }, { status: 400 });
    }

    // 🚀 서버에서 모든 것을 통제! AI의 헛소리 원천 차단
    const myNameElem = getNameElement(myInfo.name);
    const mySajuElem = getSajuElement(myInfo.birthDate);
    const partnerNameElem = getNameElement(partnerInfo.name);
    const partnerSajuElem = getSajuElement(partnerInfo.birthDate);
    const fixedScore = getFixedScore(myInfo.name, myInfo.birthDate, partnerInfo.name, partnerInfo.birthDate);

    const prompt = `
    [사람 A] 이름: ${myInfo.name} (초성 기운: ${myNameElem}), 사주 기운: ${mySajuElem}
    [사람 B] 이름: ${partnerInfo.name} (초성 기운: ${partnerNameElem}), 사주 기운: ${partnerSajuElem}
    
    🚨 [긴급 명령] 이 두 사람의 궁합 점수는 **${fixedScore}점**으로 이미 확정되었습니다!
    이 점수(${fixedScore}점)와 확정된 오행 기운만을 바탕으로, MZ세대가 카톡으로 공유하기 딱 좋은 트렌디하고 재밌는 말투로 JSON 답변을 만들어줘.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT + RESPONSE_FORMAT },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7, // 말투를 다채롭게 만들기 위한 창의성 허용 (오행과 점수는 프롬프트로 강제 고정함)
    });

    // 강제로 점수를 서버에서 계산한 fixedScore로 덮어씌움 (AI가 혹시라도 실수할까봐 이중 잠금)
    const parsedData = JSON.parse(completion.choices[0]?.message?.content || "{}");
    parsedData.score = fixedScore; 

    return NextResponse.json(parsedData);
  } catch (error: any) {
    return NextResponse.json({ error: `서버 에러: ${error.message}` }, { status: 500 });
  }
}
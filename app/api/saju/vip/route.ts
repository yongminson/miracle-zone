/** Vercel · 서버 사이드 에이전트(VIP 리포트 동시 생성) */
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import type { VipCalendarType, VipGender } from "@/lib/saju/vip-types";
import { extractVipSajuData } from "@/lib/saju/vip-saju-data";
import {
  resolveVipReportPublicUrlFromRequest,
  upsertVipOrderRow,
  VIP_ORDER_AMOUNT_WON,
} from "@/lib/payments/vip-order-supabase";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

type VipRequestBody = {
  name?: string;
  gender: VipGender;
  birthDate: string;
  birthTime?: string | null;
  mbti?: string | null;
  calendarType?: VipCalendarType;
  imp_uid?: string | null;
  phone_number?: string | null;
};

async function persistVipOrderRow(
  request: NextRequest,
  params: {
    imp_uid: string | null | undefined;
    user_name: string;
    phone_number: string | null | undefined;
  },
): Promise<void> {
  const imp = typeof params.imp_uid === "string" ? params.imp_uid.trim() : "";
  if (!imp) return;

  const supabaseAdmin = createSupabaseAdminClient();
  if (!supabaseAdmin) {
    console.error("[vip_orders] 리포트 완료 단계: Supabase Admin 클라이언트 없음(SUPABASE_SERVICE_ROLE_KEY)");
    return;
  }

  const report_url = resolveVipReportPublicUrlFromRequest(request);
  const phone =
    typeof params.phone_number === "string" && params.phone_number.trim() !== ""
      ? params.phone_number.trim()
      : null;

  const row = {
    user_name: params.user_name,
    phone_number: phone,
    imp_uid: imp,
    amount: VIP_ORDER_AMOUNT_WON,
    report_url,
    status: "completed",
  };

  const res = await upsertVipOrderRow(supabaseAdmin, row);
  if (!res.ok) {
    console.error("[vip_orders] 리포트 완료 단계 upsert 실패:", {
      message: res.message,
      code: res.code,
      imp_uid: imp,
    });
  }
}

function parseBirthParts(birthDate: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function normalizeMbti(raw: string | null | undefined): string | null {
  if (raw == null || String(raw).trim() === "") return null;
  const s = String(raw).trim().toUpperCase();
  if (!/^[EI][NS][FT][JP]$/.test(s)) return raw.trim();
  return s;
}

async function generateVipMarkdownReport(
  sajuData: ReturnType<typeof extractVipSajuData>,
  opts: { clientName: string; currentYear: number; mbti: string | null }
): Promise<string> {
  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ];

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    safetySettings,
  });

  const mbtiInstruction = opts.mbti 
    ? `내담자의 MBTI는 ${opts.mbti}입니다. 서양 심리학과 동양 명리학을 결합하여 분석하세요.` 
    : `주의: 내담자의 MBTI 정보가 없습니다. 출력 결과물에 'MBTI'나 '서양 심리학' 관련 용어를 절대 언급하지 말고 순수 명리학적 관점으로만 서술하세요.`;

  const prompt = `
당신은 사주·운세 분석 전문가입니다.
아래 제공된 내담자의 사주 명식 데이터를 근거로 극도로 세세하고 논리적이며 정확한 'VIP 종합 분석 리포트'를 마크다운(Markdown)으로 작성하세요.

[내담자 정보]
- 이름: ${opts.clientName}
- 현재 기준 연도: ${opts.currentYear}년
- ${mbtiInstruction}
- 사주 육친 데이터: ${JSON.stringify(sajuData, null, 2)}

[세부 필수 규칙]
1. 분량 강제: 각 챕터별 최소 500자 이상, 3~4개의 문단으로 채우세요. "${opts.clientName} 님의 사주를 보면..." 하며 직접적으로 이름을 설명하고, 뼈대 명리학과 트렌디한 조언을 결합하세요.
2. 각인용 그래프: 도입부 상단에는 반드시 마크다운 테이블(\`|---|---| \` 형식)을 사용하여 사주 8글자 구성을 시각적으로 그려 넣으세요.
3. 과거 서술 배제 금지: 서술에서 ${opts.currentYear}년 이전의 과거는 언급하지 마세요. 오직 ${opts.currentYear}년부터 2035년까지 10년치 미래만 서술하세요.
4. 연도별 운세 상세 분석: 아래 포맷을 무조건 10년간 반복하세요.
  ### 2026년(병오년)
  - 운세 및 재물: (최소 100자 이상 상세 서술)
  - 직장 및 사회생활: (최소 100자 이상 상세 서술)
  ### 2027년(정미년) ... (2035년까지 연도별로 독립적 섹션 생성)
5. 언급 금지: 리포트 본문에 '39,900원', 'VVIP', '명리학자입니다' 같은 광고성 문구는 절대 프롬프트 입력값 1%도 노출하지 마세요. 사주학적 의미가 곧바로 전문가의 분석 본론으로 시작하세요.
6. Table 마크다운 강제: 마크다운 표를 그릴 때는 반드시 블록 앞뒤로 개행(Enter)을 넣고, 헤더와 구분선(\`|---|\`), 각 데이터 행은 반드시 줄바꿈(Enter)으로 한 줄씩 적으세요. 데이터 한 줄에 데이터|)을 길게 이어 붙이지 마세요.
7. 용신(필요한 기운) 특별 코칭: 사주와 용신을 특별히 거론하지 마시오. 사주 국에서 '가장 부족하거나 예민한 행(오행 불균형을 채워주는 기운)'을 1순위 용신으로 고정하여 부적을 처방하세요. 제일 명식에서는 이 부적을 처방해야 합니다.
사주 국은 아래 구조를 따르세요. (실제 데이터 사주 데이터로 채울 것)

| 구분 | 연주 | 월주 | 일주 | 시주 |
| --- | --- | --- | --- | --- |
| 천간 | O(O) | O(O) | O(O) | O(O) |
| 지지 | O(O) | O(O) | O(O) | O(O) |

이 외의 일주 정보를 표로만 적지 말고, 반드시 마크다운으로만 출력하세요.

[목차 생성 필수] 본론을 시작하기 전에, 반드시 \`## 목차\`라는 제목 뒤에 전체 챕터 리스트를 작성하세요.
세부 규칙 주의: 목차 리스트에서는 # 기호(Heading)를 사용하지 마세요. 목차는 반드시 '1. 제1장..', '2. 제2장..'과 같이 숫자 리스트(Numbered list) 형식으로 깔끔하게 작성하세요.

[10년 목차] (각 챕터 제목은 반드시 '#' 1개만 사용)
# 제1장 고난 운명 그릇과 사주 국
# 제2장 10년 운세와 ${opts.currentYear}~2035년 운세
# 제3장 천직과 직업운
# 제4장 재물과 이름
# 제5장 인연법과 애정운
# 제6장 건강운
# 제7장 귀인과 조언
# 제8장 길운을 부르는 행동지침
# 제9장 인생을 헤쳐나가는 강력한 방어 기제
# 제10장 종합 결론 및 1:1 맞춤 부적 처방
(각 챕터는 반드시 '부적의 효과와 처방'을 명확히 제시해야 합니다.
1. 먼저 부적 이미지 링크를 삽입하세요.
2. 이미지 바로 아래에 [부적의 효과 설명]이라는 제목을 달고, 왜 이 부적이 필요한지 서술하세요.
3. 그 아래에 반드시 1. 사회적 지위 상승, 2. 재물과 결실, 3. 인간관계 개선 등 3가지 버렛 리스트를 사용하여 이전처럼 깔끔하고 임팩트 있게 부적의 효과를 작성하세요.)
용신 특별 규칙(규칙 7)에 따라 아래 5가지 중 정확히 1개의 마크다운 이미지 코드를 선택하여 삽입하세요.
- 나무 오행 용신: ![맞춤 부적](/images/amulet-wood.jpg)
- 불 오행 용신: ![맞춤 부적](/images/amulet-fire.jpg)
- 흙 오행 용신: ![맞춤 부적](/images/amulet-earth.jpg)
- 금 오행 용신: ![맞춤 부적](/images/amulet-metal.jpg)
- 물 오행 용신: ![맞춤 부적](/images/amulet-water.jpg)
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  if (!text) {
    throw new Error("GEMINI_EMPTY_RESPONSE");
  }
  return text;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VipRequestBody;
    const { gender, birthDate, birthTime } = body;
    const currentYear = 2026;
    const clientName = typeof body.name === "string" && body.name.trim() !== "" ? body.name.trim() : "내담자";
    const mbti = normalizeMbti(body.mbti);

    if (!birthDate) return NextResponse.json({ success: false, error: "생년월일이 필수입니다." }, { status: 400 });
    if (!process.env.GEMINI_API_KEY) return NextResponse.json({ success: false, error: "Gemini API 설정이 없습니다." }, { status: 500 });

    const parts = parseBirthParts(birthDate);
    if (!parts) return NextResponse.json({ success: false, error: "잘못된 날짜 형식입니다." }, { status: 400 });

    const calendarType = body.calendarType === "lunar" || body.calendarType === "lunar-leap" ? body.calendarType : "solar";

    let sajuData;
    try {
      sajuData = extractVipSajuData({
        ...parts,
        calendarType,
        gender,
        birthTimeRaw: birthTime ?? null,
        birthDateIso: birthDate.trim(),
        mbti,
      });
    } catch (e) {
      return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "명식 계산 실패" }, { status: 400 });
    }

    let markdown: string;
    try {
      markdown = await generateVipMarkdownReport(sajuData, { clientName, currentYear, mbti });
    } catch (err: any) {
      console.error("Gemini API 처리 에러 전문:", err);
      return NextResponse.json(
        { success: false, error: `제미나이 서버 에러: ${err.message || "알 수 없는 오류"}` },
        { status: 500 },
      );
    }

    await persistVipOrderRow(request, {
      imp_uid: body.imp_uid,
      user_name: clientName,
      phone_number: body.phone_number,
    });

    return NextResponse.json({ success: true, markdown });
  } catch (error: any) {
    console.error("서버 전체 에러:", error);
    return NextResponse.json(
      { success: false, error: `서버 통신 에러: ${error.message || "알 수 없는 오류"}` },
      { status: 500 },
    );
  }
}
/** Vercel · 서버 타임아웃 5분 (VIP 리포트 장시간 생성) */
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
// ✨ 안전 필터 해제를 위해 HarmCategory, HarmBlockThreshold 추가
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import type { VipCalendarType, VipGender } from "@/lib/saju/vip-types";
import { extractVipSajuData } from "@/lib/saju/vip-saju-data";
import {
  resolveVipReportPublicUrlFromRequest,
  upsertVipOrderRow,
  VIP_ORDER_AMOUNT_WON,
} from "@/lib/payments/vip-order-supabase";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

// 구글 제미나이 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

type VipRequestBody = {
  name?: string;
  gender: VipGender;
  birthDate: string;
  birthTime?: string | null;
  mbti?: string | null;
  calendarType?: VipCalendarType;
  /** 결제 검증 완료 후 전달 — 있을 때만 `vip_orders`에 기록 */
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
    console.error(
      "[vip_orders] 리포트 완료 단계: Supabase Admin 클라이언트 없음(SUPABASE_SERVICE_ROLE_KEY) — vip_orders upsert 생략",
    );
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

// ✨ 제미나이 Flash (공식 프리뷰) 리포트 생성기
async function generateVipMarkdownReport(
  sajuData: ReturnType<typeof extractVipSajuData>,
  opts: { clientName: string; currentYear: number; mbti: string | null }
): Promise<string> {
  
  // 🚨 사주/운세 용어로 인한 구글 AI의 강제 차단을 막기 위해 안전 필터 최하향 조정
  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ];

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-preview-05-20",
    safetySettings,
  });

  const mbtiInstruction = opts.mbti 
    ? `내담자의 MBTI는 ${opts.mbti}입니다. 서양 심리학과 동양 명리학을 결합하여 분석하세요.` 
    : `주의: 내담자의 MBTI 정보가 없습니다. 출력 결과물에 'MBTI'나 '서양 심리학'이라는 단어를 1%도 언급하지 말고 순수 명리학적 관점으로만 서술하세요.`;

  const prompt = `
당신은 사주·대운 분석 전문가입니다.
아래 제공된 내담자의 사주 명식 데이터만을 근거로, 극도로 상세하고 논리적으로 정확한 'VIP 대운 종합 분석 리포트'를 마크다운(Markdown)으로 작성하세요.

[내담자 정보]
- 이름: ${opts.clientName}
- 현재 기준 연도: ${opts.currentYear}년
- ${mbtiInstruction}
- 사주 원국 데이터: ${JSON.stringify(sajuData, null, 2)}

[🚨 절대 엄수 규칙]
1. 분량 강제: 각 챕터는 최소 500자 이상, 3~4개의 문단으로 꽉 채우세요. "${opts.clientName} 님의 사주를 보면..." 하며 지속적으로 이름을 호명하고, 뼈를 때리는 팩트와 따뜻한 조언을 결합하세요.
2. 시각화(표 그리기): 제1장과 제2장에는 반드시 마크다운 표(Markdown Table, \`|---|---| \` 형식)를 사용하여 사주 8글자 원국과 대운 흐름을 그려 넣으세요.
3. 과거 서술 절대 금지: 제2장에서 서술할 때, ${opts.currentYear}년 이전의 과거는 절대 언급하지 마세요. 오직 ${opts.currentYear}년부터 2035년까지 10년 치 미래만 서술하세요.
4. 연도별 정밀 타격: 제2장 세운 분석 시, 아래 포맷을 무조건 10번 반복하세요.
  ### 2026년 (병오년)
  - 흐름 및 재물: (최소 100자 이상 상세 서술)
  - 직장 및 대인관계: (최소 100자 이상 상세 서술)
  ### 2027년 (정미년) ... (2035년까지 각 연도별로 독립된 섹션 작성)
5. 절대 금지: 리포트 본문에 '39,900원', 'VVIP', '명리학자입니다' 같은 오글거리는 인사말, 가격, 시스템 프롬프트 내용을 1%도 노출하지 마세요. 인사말 없이 곧바로 전문적이고 담백한 분석 본론으로 시작하세요.
6. 표(Table) 마크다운 강제: 마크다운 표를 그릴 때는 반드시 표 블록 위아래로 빈 줄(Enter)을 넣고, 헤더 행·구분 행(\`|---|\`), 각 데이터 행마다 반드시 줄바꿈(Enter)으로 한 줄씩만 쓰세요. 절대 한 줄에 파이프(|)로 행을 이어 붙여 연달아 쓰지 마세요.
7. 용신(필요한 기운) 판별의 일관성: 사주의 용신을 판별할 때 이랬다저랬다 하지 마십시오. 사주 원국에서 '가장 갯수가 적거나 아예 없는 오행(오행의 불균형을 채워주는 기운)'을 1순위 용신으로 고정하여 부적을 처방하세요. 동일한 명식에는 항상 동일한 부적을 처방해야 합니다.
제1장 원국 표는 아래 열 구조를 따르세요. (실제 한자·십성은 사주 데이터로 채울 것)

| 구분 | 년주 | 월주 | 일주 | 시주 |
| --- | --- | --- | --- | --- |
| 천간 | O(O) | O(O) | O(O) | O(O) |
| 지지 | O(O) | O(O) | O(O) | O(O) |

위와 동일한 정보를 쉼표로만 적은 한 줄 형태(예: 구분,년주,월주,...)는 사용하지 말고, 반드시 파이프 표 마크다운으로만 출력하세요.

[목차 생성 필수] 제 1장 본론을 시작하기 전에, 반드시 \`## 목차\`라는 제목 하에 전체 챕터 리스트를 작성하세요.
🚨 절대 주의: 목차 내부의 항목을 나열할 때는 절대로 '#' 기호(Heading)를 사용하지 마세요. 페이지 렌더링 오류가 발생합니다. 목차 항목은 반드시 '1. 제 1장...', '2. 제 2장...'과 같이 순수한 숫자 리스트(Numbered list) 형식으로만 담백하게 작성해야 합니다.

[10대 목차] (각 챕터 제목은 반드시 '#' 1개만 사용)
# 제 1장 타고난 운명의 그릇과 사주 원국 
# 제 2장 10년 대운과 ${opts.currentYear}~2035년 세운 정밀 해부
# 제 3장 천직과 직업운
# 제 4장 재물운 흐름
# 제 5장 인연법과 애정운
# 제 6장 건강운
# 제 7장 귀인과 악연
# 제 8장 길운을 부르는 행동지침
# 제 9장 인생의 주 고민거리와 강력한 방어 기제
# 제 10장 종합 결론 및 1:1 맞춤 부적 처방
(이 챕터는 반드시 '부적 효과 및 활용법'을 명확히 제시해야 합니다.
1. 먼저 부적 이미지를 삽입하세요.
2. 이미지 바로 아래에 [부적의 효과 설명]이라는 소제목을 달고, 왜 이 부적이 필요한지 서술하세요.
3. 그 아래에 반드시 1. 사회적 신분 상승, 2. 재물의 결실, 3. 인간관계 개선 이라는 3가지 넘버링 리스트를 사용하여 이전처럼 깔끔하고 임팩트 있게 부적의 효과를 작성하세요.)
용신 판별 규칙(규칙 7)에 따라 아래 5개 중 정확히 1개의 마크다운 이미지 코드만 선택하여 삽입하세요.
- 나무(木) 용신: ![맞춤 부적](/images/amulet-wood.jpg)
- 불(火) 용신: ![맞춤 부적](/images/amulet-fire.jpg)
- 흙(土) 용신: ![맞춤 부적](/images/amulet-earth.jpg)
- 쇠(金) 용신: ![맞춤 부적](/images/amulet-metal.jpg)
- 물(水) 용신: ![맞춤 부적](/images/amulet-water.jpg)
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

    if (!birthDate) return NextResponse.json({ success: false, error: "생년월일은 필수입니다." }, { status: 400 });
    if (!process.env.GEMINI_API_KEY) return NextResponse.json({ success: false, error: "Gemini API 키가 없습니다." }, { status: 500 });

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
      console.error("Gemini API 처리 에러 원문:", err);
      // 에러 메시지를 뭉뚱그리지 않고 화면에 그대로 쏴줍니다!
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
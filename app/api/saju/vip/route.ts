/** Vercel · ?�버 ?�이???�이?�트(VIP 리포???�시 ?�성) */
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
    console.error("[vip_orders] 리포???�료 ?�계: Supabase Admin ?�라?�언???�음(SUPABASE_SERVICE_ROLE_KEY)");
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
    console.error("[vip_orders] 리포???�료 ?�계 upsert ?�패:", {
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
    ? `?�담?�의 MBTI??${opts.mbti}?�니?? ?�양 ?�리?�과 ?�양 명리?�을 결합?�여 분석?�세??` 
    : `주의: ?�담?�의 MBTI ?�보가 ?�습?�다. 출력 결과물에 'MBTI'??'?�양 ?�리?? 관???�어�??��? ?�급?��? 말고 ?�수 명리?�적 관?�으로만 ?�술?�세??`;

  const prompt = `
?�신?� ?�주·?�세 분석 ?�문가?�니??
?�래 ?�공???�담?�의 ?�주 명식 ?�이?��? 근거�?극도�??�세?�고 ?�리?�이�??�확??'VIP 종합 분석 리포??�?마크?�운(Markdown)?�로 ?�성?�세??

[?�담???�보]
- ?�름: ${opts.clientName}
- ?�재 기�? ?�도: ${opts.currentYear}??
- ${mbtiInstruction}
- ?�주 ?�친 ?�이?? ${JSON.stringify(sajuData, null, 2)}

[?��? ?�수 규칙]
1. 분량 강제: �?챕터�?최소 500???�상, 3~4개의 문단?�로 채우?�요. "${opts.clientName} ?�의 ?�주�?보면..." ?�며 직접?�으�??�름???�명?�고, 뼈�? 명리?�과 ?�렌?�한 조언??결합?�세??
2. 각인??그래?? ?�입부 ?�단?�는 반드??마크?�운 ?�이�?\`|---|---| \` ?�식)???�용?�여 ?�주 8글??구성???�각?�으�?그려 ?�으?�요.
3. 과거 ?�술 배제 금�?: ?�술?�서 ${opts.currentYear}???�전??과거???�급?��? 마세?? ?�직 ${opts.currentYear}?��???2035?�까지 10?�치 미래�??�술?�세??
4. ?�도�??�세 ?�세 분석: ?�래 ?�맷??무조�?10?�간 반복?�세??
  ### 2026??병오??
  - ?�세 �??�물: (최소 100???�상 ?�세 ?�술)
  - 직장 �??�회?�활: (최소 100???�상 ?�세 ?�술)
  ### 2027???��??? ... (2035?�까지 ?�도별로 ?�립???�션 ?�성)
5. ?�급 금�?: 리포??본문??'39,900??, 'VVIP', '명리?�자?�니?? 같�? 광고??문구???��? ?�롬?�트 ?�력�?1%???�출?��? 마세?? ?�주?�적 ?��?가 곧바�??�문가??분석 본론?�로 ?�작?�세??
6. Table 마크?�운 강제: 마크?�운 ?��? 그릴 ?�는 반드??블록 ?�뒤�?개행(Enter)???�고, ?�더?� 구분??\`|---|\`), �??�이???��? 반드??줄바�?Enter)?�로 ??줄씩 ?�으?�요. ?�이????줄에 ?�이??)??길게 ?�어 붙이지 마세??
7. ?�신(?�요??기운) ?�별 코칭: ?�주?� ?�신???�별??거론?��? 마시?? ?�주 �?��??'가??부족하거나 ?��??????�행 불균?�을 채워주는 기운)'??1?�위 ?�신?�로 고정?�여 부?�을 처방?�세?? ?�일 명식?�서????부?�을 처방?�야 ?�니??
?�주 �?? ?�래 구조�??�르?�요. (?�제 ?�이???�주 ?�이?�로 채울 �?

| 구분 | ?�주 | ?�주 | ?�주 | ?�주 |
| --- | --- | --- | --- | --- |
| 천간 | O(O) | O(O) | O(O) | O(O) |
| 지지 | O(O) | O(O) | O(O) | O(O) |

???�의 ?�주 ?�보�??�로�??��? 말고, 반드??마크?�운?�로�?출력?�세??

[목차 ?�성 ?�수] 본론???�작?�기 ?�에, 반드??\`## 목차\`?�는 ?�목 ?�에 ?�체 챕터 리스?��? ?�성?�세??
?��? 규칙 주의: 목차 리스?�에?�는 # 기호(Heading)�??�용?��? 마세?? 목차??반드??'1. ????.', '2. ????.'�?같이 ?�자 리스??Numbered list) ?�식?�로 깔끔?�게 ?�성?�세??

[10??목차] (�?챕터 ?�목?� 반드??'#' 1개만 ?�용)
# ????고난 ?�명 그릇�??�주 �?
# ????10???�세?� ${opts.currentYear}~2035???�세
# ????천직�?직업??
# ?????�물�??�름
# ?????�연법과 ?�정??
# ????건강??
# ????귀?�과 조언
# ????길운??부르는 ?�동지�?
# ?????�생???�쳐?��???강력??방어 기제
# ??0??종합 결론 �?1:1 맞춤 부??처방
(�?챕터??반드??'부?�의 ?�과?� 처방'??명확???�시?�야 ?�니??
1. 먼�? 부???��?지 링크�??�입?�세??
2. ?��?지 바로 ?�래??[부?�의 ?�과 ?�명]?�라???�목???�고, ????부?�이 ?�요?��? ?�술?�세??
3. �??�래??반드??1. ?�회??지???�승, 2. ?�물�?결실, 3. ?�간관�?개선 ??3가지 버렛 리스?��? ?�용?�여 ?�전처럼 깔끔?�고 ?�팩???�게 부?�의 ?�과�??�성?�세??)
?�신 ?�별 규칙(규칙 7)???�라 ?�래 5가지 �??�확??1개의 마크?�운 ?��?지 코드�??�택?�여 ?�입?�세??
- ?�무 ?�행 ?�신: ![맞춤 부??(/images/amulet-wood.jpg)
- �??�행 ?�신: ![맞춤 부??(/images/amulet-fire.jpg)
- ???�행 ?�신: ![맞춤 부??(/images/amulet-earth.jpg)
- �??�행 ?�신: ![맞춤 부??(/images/amulet-metal.jpg)
- �??�행 ?�신: ![맞춤 부??(/images/amulet-water.jpg)
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
    const clientName = typeof body.name === "string" && body.name.trim() !== "" ? body.name.trim() : "?�담??;
    const mbti = normalizeMbti(body.mbti);

    if (!birthDate) return NextResponse.json({ success: false, error: "?�년?�일???�수?�니??" }, { status: 400 });
    if (!process.env.GEMINI_API_KEY) return NextResponse.json({ success: false, error: "Gemini API ?�정???�습?�다." }, { status: 500 });

    const parts = parseBirthParts(birthDate);
    if (!parts) return NextResponse.json({ success: false, error: "?�못???�짜 ?�식?�니??" }, { status: 400 });

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
      return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "명식 계산 ?�패" }, { status: 400 });
    }

    let markdown: string;
    try {
      markdown = await generateVipMarkdownReport(sajuData, { clientName, currentYear, mbti });
    } catch (err: any) {
      console.error("Gemini API 처리 ?�러 ?�문:", err);
      return NextResponse.json(
        { success: false, error: `?��??�이 ?�버 ?�러: ${err.message || "?????�는 ?�류"}` },
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
    console.error("?�버 ?�체 ?�러:", error);
    return NextResponse.json(
      { success: false, error: `?�버 ?�신 ?�러: ${error.message || "?????�는 ?�류"}` },
      { status: 500 },
    );
  }
}

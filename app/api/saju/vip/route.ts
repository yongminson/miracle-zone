/** Vercel · 스트리밍 응답은 타임아웃 없음 */
export const maxDuration = 300;

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { VipCalendarType, VipGender } from "@/lib/saju/vip-types";
import { extractVipSajuData } from "@/lib/saju/vip-saju-data";
import {
  resolveVipReportPublicUrlFromRequest,
  upsertVipOrderRow,
  VIP_ORDER_AMOUNT_WON,
} from "@/lib/payments/vip-order-supabase";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

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
  if (!supabaseAdmin) return;
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
  await upsertVipOrderRow(supabaseAdmin, row);
}

function parseBirthParts(
  birthDate: string,
): { year: number; month: number; day: number } | null {
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

const SYSTEM_PROMPT = `당신은 대한민국 최고의 사주·명리학 전문가입니다.
규칙:
1. 각 챕터 최소 700자 이상, 구체적 사례와 조언 포함
2. 절대 요약하거나 생략하지 마세요
3. 마크다운 표는 반드시 파이프(|) 형식으로 작성`;

function buildUnifiedPrompt(
  sajuData: ReturnType<typeof extractVipSajuData>,
  opts: { clientName: string; currentYear: number; mbti: string | null },
): string {
  const mbtiInstruction = opts.mbti
    ? `내담자의 MBTI는 ${opts.mbti}입니다. 서양 심리학과 동양 명리학을 결합하여 분석하세요.`
    : `MBTI 정보 없음. 'MBTI' 단어 절대 언급 금지. 순수 명리학으로만 서술.`;

  return `
[내담자 정보]
- 이름: ${opts.clientName}
- 현재 기준 연도: ${opts.currentYear}년
- ${mbtiInstruction}
- 사주 원국 데이터: ${JSON.stringify(sajuData, null, 2)}

[공통 규칙]
- "${opts.clientName} 님" 호명하며 서술
- 인사말, 가격, 시스템 내용 노출 절대 금지
- 마크다운 표: 파이프(|) 형식, 표 위아래 빈 줄 필수

아래 10개 챕터를 순서대로 빠짐없이 작성하세요. 각 챕터 최소 700자 이상.

## 목차
(1~10장 숫자 리스트, '#' 기호 절대 금지)

# 제 1장 타고난 운명의 그릇과 사주 원국
반드시 아래 형식 표 포함:

| 구분 | 년주 | 월주 | 일주 | 시주 |
| --- | --- | --- | --- | --- |
| 천간 | O(O) | O(O) | O(O) | O(O) |
| 지지 | O(O) | O(O) | O(O) | O(O) |

# 제 2장 10년 대운과 ${opts.currentYear}~2035년 세운 정밀 해부

먼저 대운 흐름 표를 작성하세요.

그 다음 2026년부터 2035년까지 10개 연도를 각각 아래 형식으로 작성하세요.
단 하나의 연도도 빠뜨리면 안 됩니다. 절대로 요약하거나 생략하지 마세요.

### 2026년 (병오년 丙午年)
**🔥 종합 운세:** (200자 이상)
**💰 재물운:** (200자 이상)
**💼 직장·사업운:** (200자 이상)
**❤️ 인간관계·애정운:** (150자 이상)
**⚠️ 주의사항:** (구체적으로)

### 2027년 (정미년 丁未年)
(동일 형식)

### 2028년 (무신년 戊申年)
(동일 형식)

### 2029년 (기유년 己酉年)
(동일 형식)

### 2030년 (경술년 庚戌年)
(동일 형식)

### 2031년 (신해년 辛亥年)
(동일 형식)

### 2032년 (임자년 壬子年)
(동일 형식)

### 2033년 (계축년 癸丑年)
(동일 형식)

### 2034년 (갑인년 甲寅年)
(동일 형식)

### 2035년 (을묘년 乙卯年)
(동일 형식)

# 제 3장 천직과 직업운
# 제 4장 재물운 흐름
# 제 5장 인연법과 애정운
# 제 6장 건강운
# 제 7장 귀인과 악연
# 제 8장 길운을 부르는 행동지침
# 제 9장 인생의 주 고민거리와 강력한 방어 기제
# 제 10장 종합 결론 및 1:1 맞춤 부적 처방

제10장 필수:
1. 용신(가장 부족한 오행) 판별 후 아래 중 정확히 1개 이미지 삽입:
   - 나무(木): ![맞춤 부적](/images/amulet-wood.jpg)
   - 불(火): ![맞춤 부적](/images/amulet-fire.jpg)
   - 흙(土): ![맞춤 부적](/images/amulet-earth.jpg)
   - 쇠(金): ![맞춤 부적](/images/amulet-metal.jpg)
   - 물(水): ![맞춤 부적](/images/amulet-water.jpg)
2. 이미지 아래 [부적의 효과 설명] 소제목
3. 1.사회적 신분 상승 2.재물의 결실 3.인간관계 개선 작성
`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VipRequestBody;
    const { gender, birthDate, birthTime } = body;
    const currentYear = 2026;
    const clientName =
      typeof body.name === "string" && body.name.trim() !== ""
        ? body.name.trim()
        : "내담자";
    const mbti = normalizeMbti(body.mbti);

    if (!birthDate)
      return new Response(
        JSON.stringify({ success: false, error: "생년월일은 필수입니다." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    if (!process.env.ANTHROPIC_API_KEY)
      return new Response(
        JSON.stringify({ success: false, error: "Anthropic API 키가 없습니다." }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );

    const parts = parseBirthParts(birthDate);
    if (!parts)
      return new Response(
        JSON.stringify({ success: false, error: "잘못된 날짜 형식입니다." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );

    const calendarType =
      body.calendarType === "lunar" || body.calendarType === "lunar-leap"
        ? body.calendarType
        : "solar";

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
      return new Response(
        JSON.stringify({
          success: false,
          error: e instanceof Error ? e.message : "명식 계산 실패",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const userPrompt = buildUnifiedPrompt(sajuData, { clientName, currentYear, mbti });

    // ── 스트리밍 응답 시작 ──────────────────────────────────────────
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const claudeStream = anthropic.messages.stream({
            model: "claude-sonnet-4-5",
            max_tokens: 16000,
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content: userPrompt }],
          });

          // 청크마다 클라이언트로 전달
          claudeStream.on("text", (text) => {
            const chunk = JSON.stringify({ type: "chunk", text }) + "\n";
            controller.enqueue(encoder.encode(chunk));
          });

          // 완료 후 DB 저장 + 완료 신호
          await claudeStream.finalMessage();

          await persistVipOrderRow(request, {
            imp_uid: body.imp_uid,
            user_name: clientName,
            phone_number: body.phone_number,
          });

          const done = JSON.stringify({ type: "done" }) + "\n";
          controller.enqueue(encoder.encode(done));
          controller.close();
        } catch (err: any) {
          console.error("Claude 스트리밍 에러:", err);
          const errMsg = err?.message || JSON.stringify(err) || "알 수 없는 오류";
          const errChunk = JSON.stringify({ type: "error", error: errMsg }) + "\n";
          controller.enqueue(encoder.encode(errChunk));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    console.error("서버 전체 에러:", error);
    return new Response(
      JSON.stringify({ success: false, error: `서버 에러: ${error.message || "알 수 없는 오류"}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
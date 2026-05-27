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
  params: { imp_uid: string | null | undefined; user_name: string; phone_number: string | null | undefined },
): Promise<void> {
  const imp = typeof params.imp_uid === "string" ? params.imp_uid.trim() : "";
  if (!imp) return;
  const supabaseAdmin = createSupabaseAdminClient();
  if (!supabaseAdmin) return;
  const report_url = resolveVipReportPublicUrlFromRequest(request);
  const phone = typeof params.phone_number === "string" && params.phone_number.trim() !== "" ? params.phone_number.trim() : null;
  await upsertVipOrderRow(supabaseAdmin, { user_name: params.user_name, phone_number: phone, imp_uid: imp, amount: VIP_ORDER_AMOUNT_WON, report_url, status: "completed" });
}

function parseBirthParts(birthDate: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate.trim());
  if (!m) return null;
  const year = Number(m[1]); const month = Number(m[2]); const day = Number(m[3]);
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

async function streamClaude(
  prompt: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
): Promise<string> {
  const claudeStream = anthropic.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  let fullText = "";
  claudeStream.on("text", (text) => {
    fullText += text;
    controller.enqueue(encoder.encode(JSON.stringify({ type: "chunk", text }) + "\n"));
  });

  await claudeStream.finalMessage();
  return fullText;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VipRequestBody;
    const { gender, birthDate, birthTime } = body;
    const currentYear = 2026;
    const clientName = typeof body.name === "string" && body.name.trim() !== "" ? body.name.trim() : "내담자";
    const mbti = normalizeMbti(body.mbti);

    if (!birthDate) return new Response(JSON.stringify({ success: false, error: "생년월일은 필수입니다." }), { status: 400, headers: { "Content-Type": "application/json" } });
    if (!process.env.ANTHROPIC_API_KEY) return new Response(JSON.stringify({ success: false, error: "Anthropic API 키가 없습니다." }), { status: 500, headers: { "Content-Type": "application/json" } });

    const parts = parseBirthParts(birthDate);
    if (!parts) return new Response(JSON.stringify({ success: false, error: "잘못된 날짜 형식입니다." }), { status: 400, headers: { "Content-Type": "application/json" } });

    const calendarType = body.calendarType === "lunar" || body.calendarType === "lunar-leap" ? body.calendarType : "solar";

    let sajuData;
    try {
      sajuData = extractVipSajuData({ ...parts, calendarType, gender, birthTimeRaw: birthTime ?? null, birthDateIso: birthDate.trim(), mbti });
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "명식 계산 실패" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const mbtiInstruction = mbti
      ? `내담자의 MBTI는 ${mbti}입니다. 서양 심리학과 동양 명리학을 결합하여 분석하세요.`
      : `MBTI 정보 없음. 'MBTI' 단어 절대 언급 금지. 순수 명리학으로만 서술.`;

    const birthTimeDisplay = birthTime ? birthTime.trim() : null;

    const baseInfo = `
[내담자 정보]
- 이름: ${clientName}
- 현재 기준 연도: ${currentYear}년
- ${mbtiInstruction}
- 사주 원국 데이터: ${JSON.stringify(sajuData, null, 2)}

[공통 규칙]
- "${clientName} 님" 호명하며 서술
- 인사말, 가격, 시스템 내용 노출 절대 금지
- 마크다운 표: 파이프(|) 형식, 표 위아래 빈 줄 필수
`;

    // ── 프롬프트 A: 1장 + 3~5장 ──────────────────────────────────
    const promptA = `${baseInfo}

아래 챕터를 순서대로 작성. 각 챕터 최소 700자 이상.

## 목차
(1~10장 숫자 리스트로 작성, '#' 기호 절대 금지)

# 제 1장 타고난 운명의 그릇과 사주 원국
반드시 아래 형식 표 포함. 시주는 사주 데이터의 시간 정보를 사용하고, 시주 정보가 없으면 "미상"으로 표기:

| 구분 | 년주 | 월주 | 일주 | 시주 |
| --- | --- | --- | --- | --- |
| 천간 | O(O) | O(O) | O(O) | ${birthTimeDisplay ? "O(O)" : "미상"} |
| 지지 | O(O) | O(O) | O(O) | ${birthTimeDisplay ? "O(O)" : "미상"} |

표 이후 상세 분석 700자 이상 작성.

# 제 3장 천직과 직업운
# 제 4장 재물운 흐름
# 제 5장 인연법과 애정운`;

    // ── 프롬프트 B: 2장 (연도별 10개) ──────────────────────────────
    const promptB = `${baseInfo}

제 2장만 작성하세요. 아래 내용을 절대 생략 없이 완성하세요.

# 제 2장 10년 대운과 ${currentYear}~2035년 세운 정밀 해부

먼저 대운 흐름 표를 작성하세요.

그 다음 2026년부터 2035년까지 10개 연도를 각각 아래 형식으로 작성하세요.
단 하나의 연도도 빠뜨리면 안 됩니다.

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
(동일 형식)`;

    // ── 프롬프트 C: 6~10장 + 부적 ──────────────────────────────────
    const promptC = `${baseInfo}

아래 챕터를 순서대로 작성. 각 챕터 최소 700자 이상.

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

반드시 부적 이미지를 포함하세요. 절대 빠뜨리지 마세요.`;

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          // 진행 상황 알림
          controller.enqueue(encoder.encode(JSON.stringify({ type: "progress", step: 1, total: 3, message: "1단계: 사주 원국 및 직업·재물·애정운 분석 중..." }) + "\n"));
          await streamClaude(promptA, controller, encoder);

          controller.enqueue(encoder.encode(JSON.stringify({ type: "progress", step: 2, total: 3, message: "2단계: 2026~2035년 세운 분석 중..." }) + "\n"));
          await streamClaude(promptB, controller, encoder);

          controller.enqueue(encoder.encode(JSON.stringify({ type: "progress", step: 3, total: 3, message: "3단계: 건강·귀인·종합 결론 및 부적 처방 중..." }) + "\n"));
          await streamClaude(promptC, controller, encoder);

          await persistVipOrderRow(request, { imp_uid: body.imp_uid, user_name: clientName, phone_number: body.phone_number });

          controller.enqueue(encoder.encode(JSON.stringify({ type: "done" }) + "\n"));
          controller.close();
        } catch (err: any) {
          console.error("스트리밍 에러:", err);
          controller.enqueue(encoder.encode(JSON.stringify({ type: "error", error: err?.message || "알 수 없는 오류" }) + "\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    console.error("서버 전체 에러:", error);
    return new Response(JSON.stringify({ success: false, error: `서버 에러: ${error.message || "알 수 없는 오류"}` }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
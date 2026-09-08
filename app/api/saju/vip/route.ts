/** Vercel · 서버 타임아웃 5분 (VIP 리포트 장시간 생성) */
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
// ✨ 안전 필터 해제를 위해 HarmCategory, HarmBlockThreshold 추가
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import type { VipCalendarType, VipGender } from "@/lib/saju/vip-types";
import { extractVipSajuData } from "@/lib/saju/vip-saju-data";
import { appendVipSymbolicAmulet } from "@/lib/saju/vip-symbolic-amulet";
import {
  resolveVipReportPublicUrlFromRequest,
  upsertVipOrderRow,
  VIP_ORDER_AMOUNT_WON,
} from "@/lib/payments/vip-order-supabase";
import {
  claimVipReportEntitlement,
  completeVipReportEntitlement,
  releaseVipReportEntitlement,
  tossVipPaymentRef,
  webVipPaymentRef,
} from "@/lib/payments/vip-report-entitlement";
import { TOSS_IAP_PRODUCTS } from "@/lib/payments/toss-iap";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { hasValidAdminSession } from "@/lib/auth/admin-session";

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
  /** Google Play 검증 API가 반환한 해시 기반 지급권 식별자 */
  paymentRef?: string | null;
  /** 앱인토스 서버 검증을 마친 주문 ID */
  tossOrderId?: string | null;
  phone_number?: string | null;
};

const GOOGLE_PAYMENT_REF_PATTERN = /^google:[a-f0-9]{64}$/;
const TOSS_ORDER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveVipPayment(
  body: VipRequestBody,
): { paymentRef: string; expectedAmount: number } | null {
  const googleRef = typeof body.paymentRef === "string" ? body.paymentRef.trim() : "";
  if (GOOGLE_PAYMENT_REF_PATTERN.test(googleRef)) {
    return { paymentRef: googleRef, expectedAmount: VIP_ORDER_AMOUNT_WON };
  }

  const tossOrderId = typeof body.tossOrderId === "string" ? body.tossOrderId.trim() : "";
  if (TOSS_ORDER_ID_PATTERN.test(tossOrderId)) {
    return {
      paymentRef: tossVipPaymentRef(tossOrderId),
      expectedAmount: TOSS_IAP_PRODUCTS.vip_report.amountWon,
    };
  }

  const webPaymentId = typeof body.imp_uid === "string" ? body.imp_uid.trim() : "";
  if (webPaymentId) {
    return {
      paymentRef: webVipPaymentRef(webPaymentId),
      expectedAmount: VIP_ORDER_AMOUNT_WON,
    };
  }
  return null;
}

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

// ✨ 제미나이 Flash 리포트 생성기
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
    model: "gemini-2.5-flash",
    safetySettings,
    generationConfig: {
      temperature: 0.65,
      maxOutputTokens: 10000,
    },
  });

  const mbtiInstruction = opts.mbti
    ? `사용자가 참고 정보로 입력한 MBTI는 ${opts.mbti}입니다. 진단처럼 단정하지 말고 자기이해 질문을 만드는 보조 정보로만 사용하세요.`
    : `사용자가 MBTI를 입력하지 않았으므로 MBTI나 서양 심리학을 언급하지 마세요.`;

  const prompt = `당신은 전통 달력 정보와 사용자 입력을 바탕으로 자기이해를 돕는 프리미엄 콘텐츠 작성자입니다.
아래 JSON에 실제로 존재하는 계산값만 사용하여 '명운 사주 인사이트 리포트'를 한국어 마크다운으로 작성하세요.

[내담자]
- 이름: ${opts.clientName}
- 기준 연도: ${opts.currentYear}년
- ${mbtiInstruction}
- 계산 데이터: ${JSON.stringify(sajuData, null, 2)}

[정확성과 안전 원칙]
1. calculated 객체의 값만 계산 결과로 사용합니다. null, TODO, 데이터에 없는 사건·날짜·용신은 만들지 않습니다.
2. 출생 시각이 없으면 시주를 쓰지 않습니다. 출생지를 받지 않아 진태양시 보정을 하지 않은 점, 절기 경계와 23시 전후에는 방식에 따라 차이가 날 수 있는 점을 제1장에 한 번 밝힙니다.
3. 용신은 자동 확정하지 않습니다. 오행 개수는 보이는 글자 분포 설명에만 쓰며 용신·행운색·처방으로 연결하지 않습니다.
4. 대운·연운은 사건 예언이 아니라 관심 주제, 활용 가능성, 과해질 때의 위험, 준비 행동으로 해석합니다.
5. 재물은 횡재·수익률을, 연애는 결혼·이별·재회 시기를, 직장은 합격·승진·퇴사 시기를 예언하지 않습니다.
6. 건강 장에서는 체질, 장기, 질환, 수명, 치료, 회복력을 사주로 판단하지 않습니다. 오직 수면·운동·검진·휴식·스트레스 점검 같은 일반적인 자기관리만 다룹니다.
7. 핵심 해석마다 실제 데이터 근거를 짧게 붙입니다. 단일 요소 하나로 성격이나 능력을 확정하지 말고 '점검해볼 수 있습니다'처럼 씁니다.
8. 같은 조언을 반복하지 말고 장마다 구체적인 상황, 판단 기준, 질문, 행동을 제시합니다. 막연한 격려와 공포·불안 자극은 금지합니다.
9. 부적은 서버가 참고용 부록으로 별도 추가하므로 본문에서 이미지·효능을 만들지 않습니다.
10. 숫자 범위에는 물결표를 쓰지 말고 '2023–2032년'처럼 en dash를 사용합니다. 표 안에 HTML이나 <br> 태그를 넣지 말고 한 셀은 짧은 문장과 세미콜론으로 구분합니다.
11. calculated, dayMaster, visibleElementCount, annualFlow 같은 JSON 필드명이나 구현 경로를 본문에 노출하지 않습니다. 근거는 '일간 경금', '현재 무인 대운의 편인'처럼 사람이 이해할 수 있는 한국어로만 씁니다.

[분량과 형식]
- 공백 제외 10,000–15,000자 안에서 14장 전체를 반드시 완결합니다. 18,000자를 넘기지 않습니다.
- 형식적인 환영 인사 대신 '## 먼저 읽는 핵심 답변'으로 시작하고, 성향·현재 대운·돈·일·관계의 핵심을 5개 bullet로 답합니다.
- 이어서 '## 목차'와 14개 장 목록을 출력합니다.
- 제2–12장은 2–3개 소제목, 구체 bullet, '이 장의 한 문장 결론'을 포함합니다.
- 재물·직장·연애·건강 장에는 유리한 패턴, 과해질 때의 위험, 현실 점검 질문, 바로 할 행동을 포함합니다.

[필수 표]
- 제1장: 년·월·일·시주의 간지, 천간 십성, 지지 십성, 오행.
- 제3장: 목·화·토·금·수의 visibleElementCount와 '용신 판정 아님' 안내.
- 제4장: daeun.periods 전체의 시작 나이·기간·간지·천간 십성과 현재 대운 강조.
- 제5장: daeun.annualFlow 5개년의 연도·간지·십성·관심 주제·활용·주의·준비 행동.
- 제13장: 7일·30일·90일·1년 실행 계획.
- 제14장: 강점 3개, 주의점 3개, 현재 대운 핵심 3개, 올해 행동 3개. 표 셀에는 세미콜론을 사용합니다.

[반드시 직접 답할 질문]
- 현재 대운은 언제 시작·종료되고 다음 대운은 언제 시작하는가.
- 재물: 벌기·지키기·쓰기 패턴, 계약·현금흐름·충동 위험과 점검표.
- 직장·사업: 강점이 쓰이는 역할, 환경, 리더십, 이직·사업 판단표.
- 연애: 끌림, 갈등, 경계선, 대화법, 관계 점검 기준.
- 건강: 생활 리듬, 스트레스 자각, 수면·운동·검진 체크리스트. 의학적 해석은 하지 않습니다.

[장 제목]

# 제 1장 내 명식과 계산 기준
# 제 2장 타고난 핵심 성향과 내면의 작동 방식
# 제 3장 오행 분포와 에너지 사용 설명서
# 제 4장 10년 대운 지도와 현재 위치
# 제 5장 앞으로 5년의 흐름과 준비 전략
# 제 6장 재물운: 돈을 벌고 지키는 방식
# 제 7장 직장운과 사업운: 나에게 맞는 역할과 환경
# 제 8장 연애운과 배우자 관계: 끌림·갈등·소통
# 제 9장 인간관계와 가족: 경계선과 신뢰의 기술
# 제 10장 건강운: 생활 리듬과 스트레스 관리
# 제 11장 반복되는 고민의 심리적 핵심
# 제 12장 중요한 선택을 위한 의사결정 가이드
# 제 13장 7일·30일·90일·1년 실행 계획
# 제 14장 핵심 요약과 이용 안내

마지막 두 문장은 생성형 AI 참고용 콘텐츠이며 미래를 보장하지 않는다는 안내와, 의료·재무·법률 등 중요한 결정은 관련 전문가와 확인해야 한다는 안내로 끝냅니다.
그 뒤 마지막 줄에 정확히 '<!-- REPORT_COMPLETE -->'를 출력합니다.
`;

const requiredChapterNumbers = [1, 4, 5, 6, 7, 8, 10, 13, 14];
const requiredTopicWords = ["대운", "재물", "직장", "사업", "연애", "건강", "실행 계획"];
const meetsPremiumContract = (value: string) => {
  const normalized = value.replace(/\s/g, "");
  const hasChapters = requiredChapterNumbers.every((chapter) =>
    new RegExp(`^\\s*(?:#{1,6}\\s*)?(?:\\*{1,2})?(?:제\\s*)?${chapter}(?:\\s*장|[.、:])`, "m").test(value),
  );
  return (
    normalized.length >= 7500 &&
    normalized.length <= 22000 &&
    hasChapters &&
    requiredTopicWords.every((topic) => normalized.includes(topic.replace(/\s/g, ""))) &&
    normalized.includes("강점")
  );
};

const normalizeGeneratedMarkdown = (value: string) => {
  const cleaned = value
    .split("\n")
    .filter(
      (line) =>
        !/(?:calculated\.|visibleElementCount|annualFlow|dayMaster|stemTenGod|pillars\.)/i.test(line),
    )
    .join("\n")
    .replace(/<br\s*\/?\s*>/gi, " / ")
    .replace(/(\d)\s*~\s*(\d)/g, "$1–$2")
    .replace(/<!-- REPORT_COMPLETE -->\s*$/i, "")
    .trim();
  return `${cleaned}\n\n---\n\n## 이용 안내\n\n이 리포트는 입력 정보와 계산값을 바탕으로 생성형 AI를 활용해 작성한 자기이해용 참고 콘텐츠이며, 미래의 사건이나 결과를 보장하지 않습니다.\n\n의료·재무·법률·고용·관계 등 중요한 결정은 이 리포트만으로 판단하지 말고 상황에 맞는 관련 전문가와 확인해 주세요.`;
};

type SectionSpec = {
  id: "A" | "B" | "C";
  chapters: number[];
  minLength: number;
  maxLength: number;
  instruction: string;
};

const sectionSpecs: SectionSpec[] = [
  {
    id: "A",
    chapters: [1, 2, 3, 4, 5],
    minLength: 3500,
    maxLength: 12000,
    instruction:
      "먼저 읽는 핵심 답변과 숫자 목록 형태의 전체 목차를 먼저 쓰고, 제1장부터 제5장까지만 작성하세요. 목차 항목에는 # 기호를 쓰지 마세요.",
  },
  {
    id: "B",
    chapters: [6, 7, 8, 9],
    minLength: 3200,
    maxLength: 12000,
    instruction:
      "인사말과 목차 없이 제6장부터 제9장까지만 작성하세요. 재물·직장/사업·연애·관계의 현실적인 질문과 행동을 충분히 다루세요. 건강 장은 출력하지 마세요.",
  },
  {
    id: "C",
    chapters: [11, 12, 13, 14],
    minLength: 2500,
    maxLength: 9000,
    instruction:
      "인사말과 목차 없이 제11장부터 제14장까지만 작성하세요. 제13장 실행 계획과 제14장 네 가지 요약 항목을 끝까지 완결하세요.",
  },
];

const sectionHasAllChapters = (value: string, chapters: number[]) =>
  chapters.every((chapter) =>
    new RegExp(
      `^\\s*#{1,6}\\s*(?:\\*{1,2})?제\\s*${chapter}\\s*장`,
      "m",
    ).test(value),
  );

async function generateSection(spec: SectionSpec): Promise<string> {
  const marker = `SECTION_${spec.id}_COMPLETE`;
  const sectionPrompt = `${prompt}\n\n[분할 생성 최우선 지침]\n${spec.instruction}\n이 응답의 공백 제외 분량은 ${spec.minLength}–${spec.maxLength}자로 맞추고, 지정하지 않은 장은 출력하지 마세요. 각 장 제목은 반드시 '# 제 N장' 형식으로 쓰세요. 마지막 줄에는 정확히 '${marker}'를 출력하세요.`;

  const isValid = (value: string) => {
    const length = value.replace(/\s/g, "").length;
    return (
      length >= spec.minLength &&
      length <= spec.maxLength &&
      sectionHasAllChapters(value, spec.chapters)
    );
  };

  const first = (await model.generateContent(sectionPrompt)).response.text();
  if (isValid(first)) return first.replace(marker, "").trim();

  const retry = (
    await model.generateContent(
      `${sectionPrompt}\n\n[재작성]\n직전 응답은 분량·장 제목·완결 표식 중 하나가 누락됐습니다. 지정된 장 전체를 처음부터 다시 완결하세요.`,
    )
  ).response.text();
  if (isValid(retry)) return retry.replace(marker, "").trim();

  console.error("Gemini 프리미엄 섹션 품질 게이트 실패:", {
    section: spec.id,
    firstLength: first.replace(/\s/g, "").length,
    retryLength: retry.replace(/\s/g, "").length,
  });
  throw new Error(`VIP_REPORT_SECTION_${spec.id}_QUALITY_GATE_FAILED`);
}

const generatedSections = await Promise.all(sectionSpecs.map(generateSection));
const currentDaeun = sajuData.calculated.daeun.current;
const currentDaeunLabel = currentDaeun
  ? `${currentDaeun.ganjiKorean} 대운(${currentDaeun.startYear}–${currentDaeun.endYear}년)`
  : "현재 대운 정보 없음";
const safeHealthChapter = `# 제 10장 건강운: 생활 리듬과 스트레스 관리

이 장은 사주로 체질·장기·질환·수명·치료 효과를 판단하지 않습니다. ${currentDaeunLabel}은 리포트의 시기 구분을 위한 참고 정보일 뿐, 건강 상태나 질병을 예측하는 근거로 사용하지 않습니다.

### 10.1 생활 리듬 현실 점검

- 최근 2주 동안 취침과 기상 시간이 크게 흔들린 날은 며칠이었는지 기록해 보세요.
- 피로가 누적될 때 일을 더 밀어붙이는지, 휴식을 먼저 확보하는지 자신의 실제 패턴을 확인하세요.
- 일과 중 오래 앉아 있거나 같은 자세를 유지하는 시간을 줄일 방법을 정하세요.

### 10.2 스트레스 신호와 회복 행동

사주 해석과 무관하게 수면 변화, 집중력 저하, 과민함, 식사 리듬 변화가 오래 이어진다면 이를 의지 문제로 넘기지 말고 생활 부담을 점검할 필요가 있습니다.

- 7일: 매일 같은 시간대에 10분 걷기와 취침 전 화면 사용 줄이기를 시도합니다.
- 30일: 수면 시간, 활동량, 스트레스 정도를 간단히 기록해 반복되는 조건을 찾습니다.
- 지속되는 불편이나 걱정이 있다면 자가 판단보다 의료 전문가와 상담합니다.

### 10.3 수면·운동·검진 체크리스트

| 점검 영역 | 현실 점검 질문 | 바로 할 행동 |
| --- | --- | --- |
| 수면 | 최근 2주 평균 수면 시간과 기상 후 피로감은 어떠했는가? | 일정한 기상 시간을 먼저 정하고 2주 기록하기 |
| 활동 | 일주일에 몸을 움직인 날과 오래 앉아 있던 시간은 어느 정도인가? | 무리하지 않는 걷기·스트레칭 일정을 달력에 넣기 |
| 스트레스 | 피로·과민·집중 저하가 특정 일정이나 관계 뒤에 반복되는가? | 반복 조건 하나를 줄이고 회복 시간을 먼저 예약하기 |
| 검진 | 연령·가족력·생활 습관에 맞는 검진을 의료진과 확인했는가? | 국가검진과 필요한 상담 일정을 확인하기 |

**이 장의 한 문장 결론:** 건강은 사주로 단정할 영역이 아니며, 관찰 가능한 생활 기록과 필요한 검진·전문가 상담을 기준으로 관리해야 합니다.`;
const sections = [generatedSections[0], generatedSections[1], safeHealthChapter, generatedSections[2]];
const text = sections.join("\n\n---\n\n");
console.log("Gemini premium section lengths:", generatedSections.map((section) => section.length));

if (!meetsPremiumContract(text)) {
  const normalized = text.replace(/\s/g, "");
  console.error("Gemini 프리미엄 품질 게이트 실패:", {
    length: normalized.length,
    chapters: requiredChapterNumbers.filter((chapter) =>
      new RegExp(`^\\s*(?:#{1,6}\\s*)?(?:\\*{1,2})?(?:제\\s*)?${chapter}(?:\\s*장|[.、:])`, "m").test(text),
    ),
    topics: requiredTopicWords.filter((topic) => normalized.includes(topic.replace(/\s/g, ""))),
    summaries: ["강점", "주의점", "현재대운", "올해행동"].filter((topic) => normalized.includes(topic)),
    hasExpertNotice: text.includes("관련 전문가"),
    hasFutureNotice: text.includes("미래를 보장하지"),
  });
  throw new Error("VIP_REPORT_QUALITY_GATE_FAILED");
}
return normalizeGeneratedMarkdown(text);
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

    const payment = resolveVipPayment(body);
    const adminAuthorized = hasValidAdminSession(request);
    if (!payment && !adminAuthorized) {
      return NextResponse.json(
        { success: false, error: "검증된 결제 정보가 필요합니다." },
        { status: 402 },
      );
    }
    const supabaseAdmin = createSupabaseAdminClient();
    if (payment && !supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "리포트 지급권 저장소를 확인할 수 없습니다." },
        { status: 503 },
      );
    }
    if (payment && supabaseAdmin) {
      const claimed = await claimVipReportEntitlement(
        supabaseAdmin,
        payment.paymentRef,
        payment.expectedAmount,
      );
      if (!claimed.ok) {
        return NextResponse.json(
          { success: false, error: claimed.message },
          { status: 409 },
        );
      }
    }

    let markdown: string;
    try {
      const generated = await generateVipMarkdownReport(sajuData, { clientName, currentYear, mbti });
      markdown = appendVipSymbolicAmulet(generated, `${clientName}|${birthDate}`).markdown;
    } catch (err: unknown) {
      if (payment && supabaseAdmin) {
        await releaseVipReportEntitlement(supabaseAdmin, payment.paymentRef);
      }
      console.error("Gemini API 처리 에러 원문:", err);
      const errorMessage = err instanceof Error ? err.message : "알 수 없는 오류";
      return NextResponse.json(
        { success: false, error: `제미나이 서버 에러: ${errorMessage}` },
        { status: 500 },
      );
    }

    if (payment && supabaseAdmin) {
      await persistVipOrderRow(request, {
        imp_uid: payment.paymentRef.startsWith("toss:") ? null : body.imp_uid ?? payment.paymentRef,
        user_name: clientName,
        phone_number: body.phone_number,
      });

      const completed = await completeVipReportEntitlement(supabaseAdmin, payment.paymentRef);
      if (!completed.ok) {
        await releaseVipReportEntitlement(supabaseAdmin, payment.paymentRef);
        return NextResponse.json(
          { success: false, error: completed.message },
          { status: 503 },
        );
      }
    }

    // 스트리밍 응답으로 전송
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // 청크 단위로 전송 (2000자씩)
        const chunkSize = 2000;
        for (let i = 0; i < markdown.length; i += chunkSize) {
          const chunk = markdown.slice(i, i + chunkSize);
          const line = JSON.stringify({ type: "chunk", text: chunk }) + "\n";
          controller.enqueue(encoder.encode(line));
        }
        controller.enqueue(encoder.encode(JSON.stringify({ type: "done" }) + "\n"));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error: unknown) {
    console.error("서버 전체 에러:", error);
    const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json(
      { success: false, error: `서버 통신 에러: ${errorMessage}` },
      { status: 500 },
    );
  }
}

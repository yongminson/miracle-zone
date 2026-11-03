import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildFortuneProfile, elementLabel, FortuneEngineProfile } from "./fortune-engine";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

type PremiumReport = {
  daeun: string;
  monthlyAdvice: string;
  wealth: string;
  love: string;
  career: string;
  health: string;
  luckyColor: string;
  luckyDirection: string;
  caution: string;
};

type AgeGroupCode = "child" | "teen" | "adult" | "mature";

type AgeGroupInfo = {
  code: AgeGroupCode;
  label: string;
  age: number;
};

function getKstDateKey() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

function getKstYear() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
  });
  return Number(formatter.format(now));
}

function getTimeSync() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return `[시간 동기화] 오늘 기준 날짜는 ${formatter.format(now)} 입니다. 반드시 오늘 기준 해석만 하세요.`;
}

function hashString(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function extractBirthYearFromDate(birthDate: string): number {
  const year = Number(birthDate.slice(0, 4));
  if (!Number.isInteger(year)) {
    return getKstYear();
  }
  return year;
}

function getAgeGroup(birthDate: string): AgeGroupInfo {
  const currentYear = getKstYear();
  const birthYear = extractBirthYearFromDate(birthDate);
  const age = Math.max(0, currentYear - birthYear + 1);

  if (age <= 13) {
    return { code: "child", label: "아동", age };
  }
  if (age <= 19) {
    return { code: "teen", label: "청소년", age };
  }
  if (age <= 39) {
    return { code: "adult", label: "성인", age };
  }
  return { code: "mature", label: "중장년", age };
}

function buildDisplayBaziChart(profile: FortuneEngineProfile) {
  return {
    year: { stem: profile.fourPillars.year.stemHanja, branch: profile.fourPillars.year.branchHanja },
    month: { stem: profile.fourPillars.month.stemHanja, branch: profile.fourPillars.month.branchHanja },
    day: { stem: profile.fourPillars.day.stemHanja, branch: profile.fourPillars.day.branchHanja },
    time: profile.fourPillars.time
      ? { stem: profile.fourPillars.time.stemHanja, branch: profile.fourPillars.time.branchHanja }
      : { stem: "－", branch: "－" },
  };
}

function buildFallbackPremiumReport(profile: FortuneEngineProfile): PremiumReport {
  const t = profile.freeTexts;
  const luck = profile.luck;
  return {
    daeun: t.total,
    monthlyAdvice: `${profile.dailyGuide?.strategy ?? ""} ${profile.dailyGuide?.action ?? ""}`.trim(),
    wealth: t.money,
    love: t.love,
    career: t.work,
    health: t.health,
    luckyColor: luck ? `${luck.color} — ${luck.reason}.` : "",
    luckyDirection: luck ? `${luck.direction} — ${elementLabel(luck.element)} 기운의 방향이에요.` : "",
    caution: luck?.caution ?? "",
  };
}

// AI 가 오행 관계를 거꾸로 쓰는 일이 있었다(예: "물은 금을 녹이는 성질" — 금을 녹이는 건 화, 금과 수는 금생수).
// 오행표에 없는 관계를 쓴 항목은 계산으로 만든 기본 문장으로 바꾼다.
const WRONG_ELEMENT_CLAIMS: RegExp[] = [
  /(물|수\(水\)|수 기운)[이은가는]?[^.。]{0,8}(금|쇠|금속)[을를이가]?[^.。]{0,6}녹/,
  /(나무|목\(木\)|목 기운)[이은가는]?[^.。]{0,8}(금|쇠|금속)[을를이가]?[^.。]{0,6}(자르|베|이기|극하)/,
  /(흙|토\(土\)|토 기운)[이은가는]?[^.。]{0,8}(나무|목)[을를이가]?[^.。]{0,6}(살리|돕|생하|키우)/,
  /(물|수\(水\)|수 기운)[이은가는]?[^.。]{0,8}(불|화)[을를이가]?[^.。]{0,6}(살리|돕|생하|키우)/,
  /(불|화\(火\)|화 기운)[이은가는]?[^.。]{0,8}(물|수)[을를이가]?[^.。]{0,6}(살리|돕|생하|키우|말리|이기|극하)/,
  /(쇠|금\(金\)|금 기운)[이은가는]?[^.。]{0,8}(불|화)[을를이가]?[^.。]{0,6}(살리|돕|생하|키우|이기|극하|끄)/,
];

function hasWrongElementClaim(text: string): boolean {
  return WRONG_ELEMENT_CLAIMS.some((re) => re.test(text));
}

function sanitizePremiumReport(parsed: Partial<PremiumReport> | undefined, fallback: PremiumReport): PremiumReport {
  const pick = (key: keyof PremiumReport): string => {
    const value = parsed?.[key];
    const text = typeof value === "string" ? value.trim() : "";
    if (!text || hasWrongElementClaim(text)) return fallback[key];
    return text;
  };
  return {
    daeun: pick("daeun"),
    monthlyAdvice: pick("monthlyAdvice"),
    wealth: pick("wealth"),
    love: pick("love"),
    career: pick("career"),
    health: pick("health"),
    luckyColor: pick("luckyColor"),
    luckyDirection: pick("luckyDirection"),
    caution: pick("caution"),
  };
}

const SYSTEM_PROMPT_PREMIUM = (timeSync: string) => `${timeSync}

당신은 한국 전통 최고급 명리학자입니다.
반드시 아래 9개 항목만 JSON으로 응답하세요.
{
  "daeun": "문자열",
  "monthlyAdvice": "문자열",
  "wealth": "문자열",
  "love": "문자열",
  "career": "문자열",
  "health": "문자열",
  "luckyColor": "주어진 행운 색깔과 그 이유",
  "luckyDirection": "주어진 행운 방향과 그 이유",
  "caution": "오늘 조심해야 할 점 2~3가지를 구체적으로 서술"
}

[오행 관계 — 반드시 이 표만 사용하세요]
- 상생(살려 줌): 목생화(나무는 불을 살린다), 화생토(불은 흙을 만든다), 토생금(흙은 쇠를 품는다), 금생수(쇠는 물을 낸다), 수생목(물은 나무를 키운다)
- 상극(눌러 줌): 목극토(나무는 흙을 뚫는다), 토극수(흙은 물을 막는다), 수극화(물은 불을 끈다), 화극금(불은 쇠를 녹인다), 금극목(쇠는 나무를 자른다)
- 이 표에 없는 관계(예: "물이 금을 녹인다", "흙이 나무를 살린다")는 절대 쓰지 마세요. 틀린 오행 설명은 서비스 신뢰를 무너뜨립니다.
- 주어진 계산 결과(십성·신강/신약·충합·행운 색/방향)와 다른 말을 지어내지 마세요. 계산 결과를 풀어 설명만 하세요.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gender, birthDate, calendarType, birthTime, isPremium } = body;
    if (!birthDate) {
      return NextResponse.json({ error: "생년월일은 필수입니다." }, { status: 400 });
    }

    const dayKey = getKstDateKey();
    const ageGroup = getAgeGroup(birthDate);

    // 🚀 14세 미만 / 95세 초과 연령 제한 로직 (알림창 줄바꿈)
    if (ageGroup.age < 14 || ageGroup.age > 95) {
      return NextResponse.json({ error: "운세를 제공할 수 없는 생년월일입니다.\n본 서비스는 14세 이상 95세 이하만 이용할 수 있어요." }, { status: 403 });
    }

    const profile = buildFortuneProfile({
      gender: gender === "female" ? "female" : "male",
      birthDate,
      calendarType: calendarType === "lunar" || calendarType === "lunar-leap" ? calendarType : "solar",
      birthTime: birthTime || "unknown",
    });

    if (isPremium) {
      const fallback = buildFallbackPremiumReport(profile);
      let premiumReport = fallback;
      if (process.env.OPENAI_API_KEY) {
        const timeSync = getTimeSync();
        
        const p = profile;
        const tp = p.todayPillar;
        const luck = p.luck;
        const fp = p.fourPillars;
        const pillarText = [
          `년주 ${fp.year.stemHanja}${fp.year.branchHanja}`,
          `월주 ${fp.month.stemHanja}${fp.month.branchHanja}`,
          `일주 ${fp.day.stemHanja}${fp.day.branchHanja}`,
          fp.time ? `시주 ${fp.time.stemHanja}${fp.time.branchHanja}` : "시주 모름",
        ].join(", ");
        const counts = (Object.entries(p.elementCounts) as [keyof typeof p.elementCounts, number][])
          .map(([el, n]) => `${elementLabel(el)} ${n}`)
          .join(", ");
        const userPrompt = `
[오늘 기준일]: ${dayKey}
[연령대]: ${ageGroup.age}세 (${ageGroup.label})
[성별]: ${p.labels.genderLabel}

[내 사주 원국 (만세력 계산값)]
${pillarText}
일간(나): ${fp.day.stemHanja} — ${elementLabel(p.dayMasterElement)}
오행 분포(월지 가중): ${counts}
신강/신약: ${p.isStrongDayMaster ? "신강 (내 기운이 강한 편)" : "신약 (내 기운이 약한 편)"}

[오늘 계산 결과 — 이 내용과 어긋나게 쓰지 마세요]
오늘 일진: ${tp?.stemHanja}${tp?.branchHanja} (천간 ${tp ? elementLabel(tp.element) : ""})
오늘 천간의 십성: ${p.todayTenGod} — ${p.todayTenGodMeaning}
오늘 기운이 나에게 필요한 기운인가: ${p.isFavorableDay ? "예" : "아니오"}
지지 충·합: ${p.branchNotes?.length ? p.branchNotes.join(", ") : "없음 (지지끼리 부딪히거나 묶이지 않는 평탄한 날)"}
오늘 총운 점수: ${p.freeScores.total}점 (점수는 본문에 쓰지 마세요)
오늘의 성격: ${p.dailyGuide?.point}
행운 색깔: ${luck?.color} (${luck?.reason})
행운 방향: ${luck?.direction}

[무료 풀이 요약 — 이 방향을 깊게 풀어 주세요]
총운: ${p.freeTexts.total}
재물: ${p.freeTexts.money}
연애: ${p.freeTexts.love}
직장: ${p.freeTexts.work}
건강: ${p.freeTexts.health}

[JSON 항목별 작성 지시]
- "daeun" (원국 흐름 해석): 내 일간과 오늘 일진의 십성(${p.todayTenGod}), 신강/신약, 충·합이 왜 오늘의 흐름을 만드는지 위 오행표에 맞게 풀어 주세요.
- "monthlyAdvice" (오늘의 핵심 조언): 오늘 하루의 처세와 마음가짐만.
- "wealth" (재물운): 금전·투자·지출만.
- "love" (연애운): 연애·관계만. (남성은 재성, 여성은 관성이 이성의 별)
- "career" (직장운): 일·직장만.
- "health" (건강운): 몸과 컨디션만.
- "luckyColor": 위에 주어진 행운 색깔을 그대로 쓰고, 왜 그 색인지 위 오행표에 맞게 2~3문장.
- "luckyDirection": 위에 주어진 행운 방향을 그대로 쓰고, 이유를 2~3문장.
- "caution" (오늘 조심할 점): 실생활 조언 2~3가지(3~4문장 이상).

[작성 규칙]
1. 항목끼리 같은 문장을 반복하지 마세요. 특히 monthlyAdvice 와 wealth 는 완전히 다른 내용이어야 합니다.
2. 모든 내용은 "오늘(하루)" 기준입니다.
3. 흉한 흐름이면 희망고문하지 말고 구체적인 방어책을 쓰세요.
4. "반드시 ~한 일이 생긴다" 같은 사건 예언은 하지 말고, 오늘 힘을 쓰면 좋은 일·조심할 일로 쓰세요.
5. 분량: 각 항목 4~6문장(400자 안팎).
`;
        try {
          const deterministicSeed = hashString(dayKey + profile.seedKey);
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0,
            seed: deterministicSeed,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM_PROMPT_PREMIUM(timeSync) },
              { role: "user", content: userPrompt },
            ],
          });
          const content = completion.choices[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content) as Partial<PremiumReport>;
            premiumReport = sanitizePremiumReport(parsed, fallback);
          }
        } catch {
          premiumReport = fallback;
        }
      }

      return NextResponse.json({
        dayKey,
        baziChart: buildDisplayBaziChart(profile),
        daeunInfo: null,
        premiumReport,
      });
    }

    // 행운 색·방향·조심할 점 — 내 원국에 필요한 기운과 오늘 일진으로 계산(fortune-engine pickLuck)
    const luck = profile.luck;

    return NextResponse.json({
      dayKey,
      scores: [profile.freeScores.total, profile.freeScores.love, profile.freeScores.money, profile.freeScores.work, profile.freeScores.study, profile.freeScores.health],
      texts: [profile.freeTexts.total, profile.freeTexts.love, profile.freeTexts.money, profile.freeTexts.work, profile.freeTexts.study, profile.freeTexts.health],
      dailyGuide: profile.dailyGuide || null,
      baziChart: buildDisplayBaziChart(profile),
      luckyItems: null,
      daeunInfo: null,
      premiumReport: null,
      luckyColor: luck ? `${luck.color} — ${luck.reason}` : null,
      luckyDirection: luck?.direction ?? null,
      caution: luck?.caution ?? null,
    });
  } catch (error) {
    console.error("Fortune API Error:", error);
    return NextResponse.json({ error: "운세 분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}
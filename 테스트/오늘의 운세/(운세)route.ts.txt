import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildFortuneProfile, FortuneEngineProfile } from "./fortune-engine";

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

function buildFallbackPremiumReport(
  profile: FortuneEngineProfile,
  dayKey: string,
  ageGroup: { code: string; label: string; age: number }
): PremiumReport {
  const dominant = profile.dominantElement;
  const weakest = profile.weakestElement;
  const dayMaster = profile.dayMasterElement;

  const daeun = `일간 오행은 ${dayMaster}이고, 전체적으로 ${dominant} 기운이 강하게 드러나는 구조입니다. ${weakest} 기운이 상대적으로 약하므로 한 번에 크게 밀어붙이기보다 부족한 축을 보완하는 방식이 더 안정적입니다.`;
  const monthlyAdvice = `오늘 기준 사주 흐름에서는 강한 기운을 과소비하지 않고 약한 기운을 보완하는 방향이 더 좋습니다. 감정 반응보다 순서 정리가 실제 체감 차이를 만들 수 있습니다.`;
  const wealth = "오늘의 재물운은 큰 수익 기대보다 기준 관리와 지출 통제가 더 중요하게 작용합니다. 무리한 확장보다 현실적인 범위 안에서 안정적인 흐름을 만드는 쪽이 실제 만족도가 높습니다.";
  const love = "오늘의 연애운은 감정의 강도보다 표현 방식과 타이밍이 더 중요합니다. 관계에서는 서두른 해석보다 상대 반응을 한 번 더 확인한 뒤 움직이는 편이 안정적입니다.";
  const career = "오늘의 직장운은 속도보다 완성도와 협업 순서 관리에서 차이가 날 가능성이 높습니다. 혼자 밀어붙이기보다 설명과 조율을 한 번 더 거치는 방식이 실제 성과에 유리합니다.";
  const health = "오늘의 건강운은 큰 이상보다 누적 피로와 생활 리듬 불균형을 먼저 관리해야 하는 흐름입니다. 몸이 보내는 작은 신호를 초기에 잡는 것이 전체 흐름을 안정시키는 데 더 유리합니다.";
  
  return { daeun, monthlyAdvice, wealth, love, career, health };
}

function sanitizePremiumReport(parsed: Partial<PremiumReport> | undefined, fallback: PremiumReport): PremiumReport {
  return {
    daeun: parsed?.daeun?.trim() || fallback.daeun,
    monthlyAdvice: parsed?.monthlyAdvice?.trim() || fallback.monthlyAdvice,
    wealth: parsed?.wealth?.trim() || fallback.wealth,
    love: parsed?.love?.trim() || fallback.love,
    career: parsed?.career?.trim() || fallback.career,
    health: parsed?.health?.trim() || fallback.health,
  };
}

const SYSTEM_PROMPT_PREMIUM = (timeSync: string) => `${timeSync}

당신은 한국 전통 최고급 명리학자입니다.
반드시 아래 6개 항목만 JSON으로 응답하세요.
{
  "daeun": "문자열",
  "monthlyAdvice": "문자열",
  "wealth": "문자열",
  "love": "문자열",
  "career": "문자열",
  "health": "문자열"
}`;

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
      const fallback = buildFallbackPremiumReport(profile, dayKey, ageGroup);
      let premiumReport = fallback;
      if (process.env.OPENAI_API_KEY) {
        const timeSync = getTimeSync();
        
        const userPrompt = `
[오늘 기준일]: ${dayKey}
[연령대]: ${ageGroup.age}세 (${ageGroup.label})

[내 사주 원국 (만세력)]
${profile.summaryText}
일간(나의 본성): ${profile.dayMasterElement}

[🔥 오늘의 운세 핵심 판도 (명리학)]
오늘의 일진: ${profile.todayPillar?.stemHanja || '미상'}${profile.todayPillar?.branchHanja || '미상'}
사주 신강/신약: ${profile.isStrongDayMaster ? "신강 (주체성 강함)" : "신약 (주변 기운에 영향받음)"}
지지 합충파해: ${profile.branchRelation === 'clash' ? "충(부딪힘) 발생 - 흉일" : profile.branchRelation === 'combo' ? "합(기운이 모임) 발생 - 대길일" : "평탄함"}

[🚨 JSON 항목별 매핑 가이드 (반드시 아래 구분에 맞춰서 내용을 철저히 분리할 것!)]
- "daeun" (원국 흐름 해석): 사주 원국의 일간(${profile.dayMasterElement})과 오늘의 일진(${profile.todayPillar?.element}) 간의 오행 생극제화 및 합충파해를 명리학적으로 풀어주세요.
- "monthlyAdvice" (오늘의 핵심 조언): ${profile.freeTexts.total} -> 오늘 하루의 전반적인 처세술과 마인드셋만 작성하세요.
- "wealth" (재물운): ${profile.freeTexts.money} -> 오직 금전, 투자, 지출에 대한 내용만 작성하세요.
- "love" (연애운): ${profile.freeTexts.love}
- "career" (직장운): ${profile.freeTexts.work}
- "health" (건강운): ${profile.freeTexts.health}

[🚨 상위 0.1% 최고급 명리학자 프리미엄 리포트 작성 지시]
1. 항목별 철저한 독립성 (가장 중요): "오늘의 핵심 조언(monthlyAdvice)"과 "재물운(wealth)"의 내용이 단 한 문장도 겹쳐서는 안 됩니다! 완전히 다른 내용으로 철저하게 독립적으로 작성하세요.
2. 시점 고정: 모든 내용은 "이번 달"이 아닌 반드시 "오늘(하루)"의 운세로 작성하세요. (예: "오늘의 핵심 조언은...", "오늘의 재물운은...")
3. 톤앤매너 동기화: 위 주어진 결과가 흉운이면 절대 희망고문 하지 말고 단호하게 방어책을 서술하세요.
4. 명리학 논리 추가: 위 결과가 왜 나왔는지 일간과 오늘 일진의 오행 상호작용(십성, 합충)을 명리 용어로 해설하세요. (점수 언급 금지)
5. 분량: 각 항목당 최소 4~6문장(400자 이상)으로 전문가답고 길게 작성하세요.
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

    return NextResponse.json({
      dayKey,
      scores: [profile.freeScores.total, profile.freeScores.love, profile.freeScores.money, profile.freeScores.work, profile.freeScores.study, profile.freeScores.health],
      texts: [profile.freeTexts.total, profile.freeTexts.love, profile.freeTexts.money, profile.freeTexts.work, profile.freeTexts.study, profile.freeTexts.health],
      dailyGuide: profile.dailyGuide || null,
      baziChart: buildDisplayBaziChart(profile),
      luckyItems: null,
      daeunInfo: null,
      premiumReport: null,
    });
  } catch (error) {
    console.error("Fortune API Error:", error);
    return NextResponse.json({ error: "운세 분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}
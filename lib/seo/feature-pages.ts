// 기능별 검색 입구 페이지 내용 (2026-11-05) — /tools 는 한 주소라 "꿈해몽", "사주 궁합" 같은 검색어로 들어올 입구가 없었다.
// ⚠ 실제 동작만 적는다. 계산 방식을 바꾸면 여기 설명도 같이 고칠 것. 지어낸 숫자·후기·적중률은 쓰지 않는다.
// 가격은 적지 않는다(웹·앱·토스가 달라 앱 안에서 보면 어긋난다). 화면: components/seo/FeatureLanding.tsx

export type FeatureKey = "fortune" | "zodiac" | "gunghap" | "dream" | "gwansang" | "ireum" | "palm" | "mbti" | "lotto";

export type FeaturePage = {
  key: FeatureKey;
  path: string;
  /** 상단 메뉴 강조 */
  menu: "fortune" | "zodiac" | "match" | "dream" | "saju" | "palmistry" | "mbti" | "lotto";
  title: string;
  description: string;
  keywords: string[];
  h1: string;
  eyebrow: string;
  intro: string[];
  cta: { label: string; href: string };
  sections: { heading: string; items: string[] }[];
  faq: { q: string; a: string }[];
  related: { label: string; href: string }[];
};

export const FEATURE_PAGES: Record<FeatureKey, FeaturePage> = {
  fortune: {
    key: "fortune",
    path: "/fortune",
    menu: "fortune",
    title: "무료 오늘의 운세 — 내 사주로 계산한 총운·애정·금전·직장 | 명운",
    description:
      "띠만 보는 운세가 아니라 내 생년월일로 세운 사주와 오늘 일진의 관계를 계산해요. 총운과 애정·금전·직장·학업·건강 점수, 오늘 조심할 점까지 무료로 확인하세요.",
    keywords: ["오늘의 운세", "무료 오늘의 운세", "사주 운세", "오늘 운세", "일진", "생년월일 운세"],
    h1: "오늘의 운세",
    eyebrow: "무료 · 생년월일로 계산",
    intro: [
      "오늘의 운세는 같은 띠라도 사람마다 달라야 맞아요. 명운은 생년월일로 사주를 세운 뒤, 오늘 일진이 내 사주와 어떤 관계인지 계산해 결과를 만들어요.",
      "그래서 같은 사람이 같은 날 보면 언제 봐도 같은 결과가 나오고, 왜 그런 결과인지 근거를 함께 볼 수 있어요.",
    ],
    cta: { label: "내 오늘의 운세 보기", href: "/tools?tab=fortune" },
    sections: [
      {
        heading: "무엇을 보고 계산하나요",
        items: [
          "오늘 천간이 내 일간에게 어떤 십성인지 (비견부터 정인까지 10가지)",
          "내 사주가 신강인지 신약인지, 오늘 기운이 나에게 필요한 기운인지",
          "오늘 지지가 내 일지·월지·년지와 부딪히는지(충) 어울리는지(합)",
          "성별에 따라 달라지는 이성의 별 (연애 점수와 문장에 반영)",
        ],
      },
      {
        heading: "무엇을 알 수 있나요",
        items: ["총운·애정운·금전운·직장운·학업운·건강운 점수", "오늘 힘을 쓰면 좋은 일과 조심할 일", "내 사주 기준의 오늘 흐름과 그 근거"],
      },
    ],
    faq: [
      { q: "태어난 시간을 몰라도 볼 수 있나요?", a: "네. 시간을 모르면 시주를 빼고 년·월·일 기둥으로 계산해요. 시간을 알면 그만큼 더 반영돼요." },
      { q: "음력 생일도 되나요?", a: "양력, 음력 평달, 음력 윤달을 모두 지원해요." },
      { q: "매일 결과가 달라지나요?", a: "일진이 날마다 바뀌어서 결과도 달라져요. 같은 날 다시 보면 같은 결과가 나와요." },
    ],
    related: [
      { label: "띠별 오늘의 운세", href: "/zodiac" },
      { label: "무료 만세력", href: "/manse" },
      { label: "2027 신년운세", href: "/newyear" },
    ],
  },
  zodiac: {
    key: "zodiac",
    path: "/zodiac",
    menu: "zodiac",
    title: "띠별 오늘의 운세와 띠 궁합표 — 잘 맞는 띠, 부딪히는 띠 | 명운",
    description:
      "12띠의 오늘 운세를 오늘 일진과의 합·충으로 계산해요. 쥐띠부터 돼지띠까지 잘 맞는 띠(육합)와 부딪히는 띠(충) 표도 한눈에 볼 수 있어요.",
    keywords: ["띠별 운세", "오늘의 띠별 운세", "띠 궁합", "띠 궁합표", "육합", "충", "잘 맞는 띠"],
    h1: "띠별 오늘의 운세",
    eyebrow: "무료 · 오늘 일진으로 계산",
    intro: [
      "띠별 운세는 오늘 일진의 지지와 내 띠의 관계를 봐요. 합이 들면 일이 잘 풀리는 쪽으로, 충이 들면 조심하는 쪽으로 풀이해요.",
      "내 생년월일까지 넣어 더 자세히 보고 싶다면 오늘의 운세를 함께 확인해 보세요.",
    ],
    cta: { label: "오늘 내 띠 운세 보기", href: "/tools?tab=zodiac" },
    sections: [
      {
        heading: "잘 맞는 띠 (육합)",
        items: ["쥐띠 ↔ 소띠", "호랑이띠 ↔ 돼지띠", "토끼띠 ↔ 개띠", "용띠 ↔ 닭띠", "뱀띠 ↔ 원숭이띠", "말띠 ↔ 양띠"],
      },
      {
        heading: "부딪히는 띠 (충)",
        items: ["쥐띠 ↔ 말띠", "소띠 ↔ 양띠", "호랑이띠 ↔ 원숭이띠", "토끼띠 ↔ 닭띠", "용띠 ↔ 개띠", "뱀띠 ↔ 돼지띠"],
      },
    ],
    faq: [
      { q: "1~2월생은 띠가 어떻게 되나요?", a: "사주에서 띠는 양력 1월 1일이 아니라 입춘을 기준으로 바뀌어요. 입춘 전에 태어났다면 전해의 띠로 봐요." },
      { q: "충이 드는 띠와는 안 맞는 건가요?", a: "충은 서로 자극을 주는 관계라는 뜻이에요. 띠 하나로 궁합이 정해지지는 않아서, 생년월일 궁합을 함께 보는 게 좋아요." },
    ],
    related: [
      { label: "생년월일 궁합", href: "/gunghap" },
      { label: "오늘의 운세", href: "/fortune" },
      { label: "2027 띠별 신년운세", href: "/newyear" },
    ],
  },
  gunghap: {
    key: "gunghap",
    path: "/gunghap",
    menu: "match",
    title: "무료 사주 궁합 — 두 사람 생년월일로 보는 궁합 점수 | 명운",
    description:
      "두 사람의 생년월일로 일간·일지·띠·오행 관계를 계산해 궁합 점수를 내요. 성격·가치관·돈·연애·미래 항목별 점수와 함께하기 좋은 날, 조심할 날까지 무료로 확인하세요.",
    keywords: ["궁합", "무료 궁합", "사주 궁합", "생년월일 궁합", "커플 궁합", "연인 궁합", "친구 궁합"],
    h1: "사주 궁합",
    eyebrow: "무료 · 두 사람 생년월일로 계산",
    intro: [
      "궁합은 띠만 맞춰 보는 것보다 두 사람의 타고난 기운을 함께 봐야 해요. 명운은 두 사람의 사주에서 일간·일지·띠·오행의 관계를 계산해 점수를 내요.",
      "AI가 쓰는 풀이 문장도 이 계산 결과를 바탕으로 만들어요.",
    ],
    cta: { label: "우리 궁합 무료로 보기", href: "/tools?tab=match" },
    sections: [
      {
        heading: "무엇을 보고 계산하나요",
        items: [
          "일간 관계: 천간합, 상생, 같은 기운, 상극 중 어디에 해당하는지",
          "일지 관계: 가까운 사이의 자리가 합인지 충인지",
          "띠 관계: 두 띠가 합인지 충인지",
          "오행: 한 사람에게 없는 기운을 상대가 채워 주는지",
        ],
      },
      {
        heading: "무엇을 알 수 있나요",
        items: ["궁합 점수와 등급", "성격·가치관·돈·연애·미래 항목별 점수", "함께하기 좋은 날과 조심할 날 (12일마다 돌아오는 날)"],
      },
    ],
    faq: [
      { q: "태어난 시간이 필요한가요?", a: "아니요. 궁합 계산에는 태어난 시간을 쓰지 않아요. 생년월일과 성별만 있으면 돼요." },
      { q: "상대가 직접 생일을 넣게 할 수 있나요?", a: "네. 우리 둘 궁합 카드에서 내 생일을 넣고 링크를 보내면, 상대가 직접 생일을 넣는 순간 결과가 완성돼요." },
      { q: "친구 여러 명과도 볼 수 있나요?", a: "단톡방 궁합 순위에서 링크 하나로 최대 30명까지 서로의 궁합을 줄 세워 볼 수 있어요." },
    ],
    related: [
      { label: "단톡방 궁합 순위", href: "/together" },
      { label: "띠 궁합표", href: "/zodiac" },
      { label: "좋은 날 고르기", href: "/taekil" },
    ],
  },
  dream: {
    key: "dream",
    path: "/haemong",
    menu: "dream",
    title: "무료 꿈해몽 — 어젯밤 꿈을 문장으로 적으면 바로 풀이 | 명운",
    description:
      "꿈 내용을 자유롭게 적으면 AI가 길몽·흉몽·태몽·일반몽 중 어디에 가까운지와 그 의미, 꿈을 꾼 뒤 해 볼 행동을 풀이해 드려요. 무료로, 로그인 없이 볼 수 있어요.",
    keywords: ["꿈해몽", "무료 꿈해몽", "꿈 풀이", "길몽", "흉몽", "태몽", "돼지꿈", "뱀꿈"],
    h1: "꿈해몽",
    eyebrow: "무료 · 로그인 없이",
    intro: [
      "키워드 사전에서는 같은 뱀 꿈이라도 상황이 반영되지 않아요. 명운의 꿈해몽은 꿈 내용을 문장 그대로 적으면 AI가 전체 맥락을 읽고 풀이해요.",
      "자세히 적을수록 풀이가 구체적이에요. 누가 나왔는지, 어떤 기분이었는지까지 적어 보세요.",
    ],
    cta: { label: "내 꿈 풀이 보기", href: "/tools?tab=dream" },
    sections: [
      {
        heading: "무엇을 알 수 있나요",
        items: ["길몽·흉몽·태몽·일반몽 구분과 점수", "꿈의 의미 풀이", "꿈을 꾼 뒤 해 볼 행동", "친구에게 보낼 수 있는 공유 링크"],
      },
      {
        heading: "이렇게 적으면 좋아요",
        items: ["나온 사람·동물·장소를 구체적으로", "꿈속에서 무슨 일이 있었는지 순서대로", "깨고 난 뒤의 기분"],
      },
    ],
    faq: [
      { q: "꿈 내용은 저장되나요?", a: "공유 링크를 만들기 위해 꿈 내용과 풀이가 서버에 저장돼요. 공유 페이지는 검색 결과에 나오지 않게 해 두었지만, 링크를 아는 사람은 볼 수 있으니 민감한 내용은 빼고 적어 주세요." },
      { q: "해몽은 얼마나 믿어야 하나요?", a: "AI가 쓴 참고용 풀이예요. 미래를 예언하지 않으니 재미와 자기 점검 정도로 봐 주세요." },
    ],
    related: [
      { label: "오늘의 운세", href: "/fortune" },
      { label: "내 사주 행운 번호", href: "/lotto" },
    ],
  },
  gwansang: {
    key: "gwansang",
    path: "/gwansang",
    menu: "saju",
    title: "AI 관상 분석 — 셀카 한 장으로 보는 내 관상 | 명운",
    description:
      "얼굴 사진을 올리면 AI가 관상학의 관점으로 인상을 풀이해 드려요. 요약을 먼저 보고, 원하면 심층 리포트를 따로 열 수 있어요.",
    keywords: ["관상", "AI 관상", "관상 분석", "얼굴 관상", "셀카 관상"],
    h1: "AI 관상 분석",
    eyebrow: "셀카 한 장으로",
    intro: [
      "관상은 얼굴에서 받는 인상을 전통적인 기준으로 읽어 보는 풀이예요. 명운에서는 사진을 올리면 AI가 관상학의 관점으로 풀이를 써 드려요.",
      "얼굴이 정면으로 잘 보이는 밝은 사진일수록 풀이가 자세해요.",
    ],
    cta: { label: "내 관상 보러 가기", href: "/tools?tab=saju" },
    sections: [
      {
        heading: "어떻게 진행되나요",
        items: ["사진을 올려요", "AI가 사진을 보고 풀이를 작성해요", "요약을 먼저 보고, 원하면 심층 리포트를 열어요"],
      },
    ],
    faq: [
      { q: "사진은 어떻게 되나요?", a: "분석을 위해 AI 서비스(OpenAI)로 전송되고, 명운 서버의 저장소에는 따로 보관하지 않아요. 다른 사람의 사진은 그 사람의 동의를 받은 경우에만 올려 주세요." },
      { q: "관상으로 성격이나 미래가 정해지나요?", a: "아니요. 전통 관상학의 관점으로 쓴 재미와 참고용 풀이이고, 사람을 판단하는 근거로 쓰면 안 돼요." },
    ],
    related: [
      { label: "이름풀이", href: "/ireum" },
      { label: "손금 분석", href: "/songeum" },
    ],
  },
  ireum: {
    key: "ireum",
    path: "/ireum",
    menu: "saju",
    title: "이름풀이 — 한자 획수·4격 81수리·자원오행 계산 | 명운",
    description:
      "한자 이름의 원획을 계산해 원격·형격·이격·정격 4격을 81수리로 판정하고, 자원오행과 음령오행, 음양, 내 사주와의 관계까지 봐요. 한자가 없어도 한글 소리로 풀이해요.",
    keywords: ["이름풀이", "성명학", "한자 획수", "원획", "81수리", "4격", "자원오행", "음령오행"],
    h1: "이름풀이",
    eyebrow: "성명학 계산 기반",
    intro: [
      "성명학의 획수는 쓰는 획이 아니라 부수를 본래 글자로 세는 원획을 써요. 예를 들어 삼수변(氵)은 3획이 아니라 물 수(水)의 4획으로 세요.",
      "명운은 유니코드 공식 한자 자료와 옥편 기준으로 만든 원획 표로 계산해요. 등급과 점수도 AI가 정하지 않고 계산으로 내요.",
    ],
    cta: { label: "내 이름 풀어 보기", href: "/tools?tab=saju" },
    sections: [
      {
        heading: "무엇을 보고 계산하나요",
        items: [
          "4격: 원격(이름 획수 합), 형격(성+이름 첫 글자), 이격(성+이름 나머지), 정격(전체 합)",
          "81수리: 각 격의 수가 길·반길·흉 중 어디에 해당하는지",
          "자원오행: 한자의 부수로 보는 오행",
          "음령오행: 한글 초성으로 보는 오행 (ㄱㅋ 목, ㄴㄷㄹㅌ 화, ㅇㅎ 토, ㅅㅈㅊ 금, ㅁㅂㅍ 수)",
          "음양 균형과 내 사주에 필요한 기운을 이름이 채워 주는지",
        ],
      },
    ],
    faq: [
      { q: "한자를 몰라도 되나요?", a: "네. 한자가 없으면 획수·4격은 계산하지 않고 한글 소리(음령오행)와 사주 관계로 풀이해요. 지어낸 획수를 보여 주지 않아요." },
      { q: "획수가 다른 곳과 다르게 나와요.", a: "성명학은 원획을 쓰기 때문에 쓰는 획수와 다를 수 있어요. 일부 글자는 책마다 차이가 있어요." },
      { q: "개명이 필요하다고 나오면요?", a: "4격 판정을 바탕으로 한 참고 의견이에요. 개명 여부는 신중하게 직접 결정해 주세요." },
    ],
    related: [
      { label: "AI 관상", href: "/gwansang" },
      { label: "무료 만세력", href: "/manse" },
    ],
  },
  palm: {
    key: "palm",
    path: "/songeum",
    menu: "palmistry",
    title: "AI 손금 분석 — 손바닥 사진으로 보는 생명선·두뇌선·감정선 | 명운",
    description:
      "손바닥 사진을 올리면 AI가 손금학의 관점으로 생명선·두뇌선·감정선을 풀이해 드려요. 왼손과 오른손 중 골라서 볼 수 있어요.",
    keywords: ["손금", "손금 보는 법", "AI 손금", "생명선", "두뇌선", "감정선"],
    h1: "AI 손금 분석",
    eyebrow: "손바닥 사진 한 장으로",
    intro: [
      "손금은 손바닥의 선과 구릉으로 성향을 풀어 보는 전통 풀이예요. 명운에서는 사진을 올리면 AI가 손금학의 관점으로 풀이를 써 드려요.",
      "손바닥 전체가 밝게 보이고 선이 또렷할수록 풀이가 자세해요.",
    ],
    cta: { label: "내 손금 보러 가기", href: "/tools?tab=palmistry" },
    sections: [
      {
        heading: "기본으로 보는 세 가지 선",
        items: ["생명선: 엄지 쪽을 감싸며 내려가는 선", "두뇌선: 손바닥 가운데를 가로지르는 선", "감정선: 손가락 아래쪽을 가로지르는 선"],
      },
    ],
    faq: [
      { q: "왼손과 오른손 중 어느 쪽을 봐야 하나요?", a: "풀이하는 방식에 따라 다르게 봐요. 화면에서 왼손과 오른손 중 원하는 손을 골라 올릴 수 있어요." },
      { q: "사진은 어떻게 되나요?", a: "분석을 위해 AI 서비스(OpenAI)로 전송되고, 명운 서버의 저장소에는 따로 보관하지 않아요." },
      { q: "수명이나 건강을 알 수 있나요?", a: "아니요. 재미와 참고용 풀이이고 건강이나 수명을 판단할 수 없어요. 건강 문제는 의사와 상담해 주세요." },
    ],
    related: [
      { label: "AI 관상", href: "/gwansang" },
      { label: "오늘의 운세", href: "/fortune" },
    ],
  },
  mbti: {
    key: "mbti",
    path: "/mbti-test",
    menu: "mbti",
    title: "무료 MBTI 유형 검사 — 32문항으로 보는 내 성격 유형 | 명운",
    description:
      "일상 속 질문 32개에 답하면 16가지 성격 유형 중 내 유형을 알려 드려요. 무료이고 로그인 없이 바로 시작할 수 있어요.",
    keywords: ["MBTI", "MBTI 검사", "무료 MBTI", "성격 유형 검사", "16가지 성격"],
    h1: "MBTI 유형 검사",
    eyebrow: "무료 · 32문항",
    intro: [
      "에너지 방향, 인식, 판단, 생활 방식 네 축을 묻는 32개 문항에 답하면 16가지 유형 중 내 유형이 나와요.",
      "결과는 링크로 친구에게 보낼 수 있어요. 정식 심리 검사가 아니라 나를 돌아보는 참고용 검사예요.",
    ],
    cta: { label: "유형 검사 시작하기", href: "/tools?tab=mbti" },
    sections: [
      {
        heading: "네 가지 축",
        items: ["외향(E) · 내향(I): 에너지를 어디서 얻는지", "감각(S) · 직관(N): 정보를 어떻게 받아들이는지", "사고(T) · 감정(F): 어떻게 판단하는지", "판단(J) · 인식(P): 어떻게 생활하는지"],
      },
    ],
    faq: [
      { q: "공식 MBTI 검사인가요?", a: "아니요. 공식 MBTI 검사가 아니라 명운이 만든 참고용 성격 유형 검사예요." },
      { q: "결과가 바뀔 수도 있나요?", a: "그때의 상황과 기분에 따라 답이 달라지면 결과도 달라질 수 있어요." },
    ],
    related: [
      { label: "사주 궁합", href: "/gunghap" },
      { label: "오늘의 운세", href: "/fortune" },
    ],
  },
  lotto: {
    key: "lotto",
    path: "/lotto",
    menu: "lotto",
    title: "내 사주 행운 번호 — 생년월일로 고르는 이번 주 로또 번호 | 명운",
    description:
      "생년월일을 넣으면 내 사주에 필요한 오행과 이번 주 추첨일 일진으로 로또 번호 6개를 무료로 골라 드려요. 최근 당첨번호와 최근 30회 많이 나온 번호도 함께 볼 수 있어요.",
    keywords: ["로또 번호", "사주 로또", "생년월일 로또 번호", "로또 번호 추천", "로또 당첨번호", "행운의 숫자"],
    h1: "내 사주 행운 번호",
    eyebrow: "무료 · 생년월일로 계산",
    intro: [
      "생년월일로 사주를 세워 나에게 필요한 오행을 찾고, 그 오행의 숫자에서 번호를 골라요. 같은 생일이면 그 주에는 언제 봐도 같은 번호이고, 다음 회차에는 새 번호가 나와요.",
      "로또는 모든 번호의 당첨 확률이 같아요. 이 번호가 당첨 확률을 높여 주지는 않으니 재미로 즐겨 주세요.",
    ],
    cta: { label: "이번 주 내 번호 받기", href: "/tools?tab=lotto" },
    sections: [
      {
        heading: "어떻게 고르나요",
        items: [
          "신강·신약으로 내 사주에 필요한 오행을 찾아요 (오늘의 운세와 같은 판정)",
          "하도(河圖) 수로 오행을 숫자에 이어요: 수 1·6, 화 2·7, 목 3·8, 금 4·9, 토 5·10",
          "필요한 오행에서 4개, 이번 주 토요일 일진의 천간·지지 오행에서 1개씩 골라요",
        ],
      },
    ],
    faq: [
      { q: "이 번호로 사면 당첨 확률이 올라가나요?", a: "아니요. 로또는 모든 조합의 확률이 같아요. 지난 당첨 기록도 다음 추첨에 영향을 주지 않아요. 재미로만 즐겨 주세요." },
      { q: "매주 번호가 바뀌나요?", a: "네. 회차가 바뀌면 새 번호가 나와요. 같은 주에는 같은 번호예요." },
      { q: "태어난 시간을 몰라도 되나요?", a: "네. 알면 시주까지 반영하고, 몰라도 년·월·일 기둥으로 계산해요." },
    ],
    related: [
      { label: "꿈해몽", href: "/haemong" },
      { label: "오늘의 운세", href: "/fortune" },
      { label: "무료 만세력", href: "/manse" },
    ],
  },
};

const BASE = "https://saju.ymstudio.co.kr";

export function featureMetadata(key: FeatureKey) {
  const p = FEATURE_PAGES[key];
  const url = `${BASE}${p.path}`;
  return {
    title: p.title,
    description: p.description,
    keywords: p.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "website" as const,
      locale: "ko_KR",
      url,
      siteName: "명운(命運)",
      title: p.title,
      description: p.description,
      images: [{ url: `${BASE}/og-image.png`, width: 1200, height: 630 }],
    },
  };
}

/** 검색엔진·AI 가 페이지 내용을 알아보게 하는 설명 데이터(JSON-LD). 화면에 보이는 내용과 같아야 한다 */
export function featureJsonLd(key: FeatureKey) {
  const p = FEATURE_PAGES[key];
  const url = `${BASE}${p.path}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: p.h1,
        url,
        description: p.description,
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Web, Android",
        inLanguage: "ko",
        provider: { "@type": "Organization", name: "명운(命運)", url: BASE },
      },
      {
        "@type": "FAQPage",
        mainEntity: p.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "명운", item: BASE },
          { "@type": "ListItem", position: 2, name: p.h1, item: url },
        ],
      },
    ],
  };
}

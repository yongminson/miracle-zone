import type { Metadata } from "next";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { NewYearClient } from "./NewYearClient";
import { SeoInfo } from "@/components/seo/SeoInfo";

export const metadata: Metadata = {
  title: "2027 신년운세 무료 | 정미년 붉은 양의 해 | 명운(命運)",
  description:
    "2027년 정미년 무료 신년운세. 생년월일만으로 한 해 총운, 월별 흐름, 좋은 달과 조심할 달, 삼재까지 바로 확인하세요.",
  keywords: ["2027 신년운세", "2027년 운세", "정미년 운세", "무료 신년운세", "2027 삼재", "신년운세 무료"],
  alternates: { canonical: "https://saju.ymstudio.co.kr/newyear" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://saju.ymstudio.co.kr/newyear",
    siteName: "명운(命運)",
    title: "2027 신년운세 무료 | 명운(命運)",
    description: "붉은 양의 해, 나의 2027년은? 총운·월별 흐름·좋은 달·조심할 달을 무료로.",
    images: [{ url: "https://saju.ymstudio.co.kr/og-image.png", width: 1200, height: 630 }],
  },
};

export default function NewYearPage() {
  return (
    <>
      <PageViewTracker page="newyear" />
      <NewYearClient />
      <div className="bg-[#07060b] pb-16 text-slate-100">
        <SeoInfo
          path="/newyear"
          name="2027 신년운세"
          description="생년월일로 계산하는 2027년 정미년 무료 신년운세 — 총운, 월별 흐름, 좋은 달과 조심할 달, 삼재"
          intro={[
  "2027년은 정미년(丁未年), 붉은 양의 해예요. 사주에서는 입춘(2월 4일 무렵)부터 정미년 기운이 시작돼요.",
  "명운 신년운세는 띠만 보지 않고, 생년월일로 세운 내 사주의 일간(태어난 날의 기운)·일지와 2027년·각 달의 기운 관계를 계산해 총운 점수, 월별 흐름, 좋은 달과 조심할 달을 보여 줘요.",
]}
          faq={[
  { q: "2027년 신년운세는 무엇을 보여 주나요?", a: "한 해 총운과 점수, 1~12월 달마다의 흐름, 좋은 달 두 달과 조심할 달 두 달, 그리고 삼재·충·합 같은 특이 사항을 무료로 보여 줘요." },
  { q: "띠별 운세와 무엇이 다른가요?", a: "띠별 운세는 같은 띠라면 모두 같은 내용이에요. 생년월일을 넣으면 태어난 날의 기운까지 계산하므로 같은 띠라도 사람마다 결과가 달라요." },
  { q: "2027년 삼재인 띠는?", a: "정미년(2027)은 돼지띠·토끼띠·양띠의 삼재 마지막 해(날삼재)예요. 삼재가 물러가는 해라 지난 2년을 정리하는 데 힘을 쓰면 좋아요." },
  { q: "무료인가요?", a: "총운·월별 흐름·좋은 달과 조심할 달은 무료예요. 재물·연애·직장·건강과 12개월 할 일·피할 일을 자세히 보는 상세 풀이는 3,300원이에요." },
  { q: "1월은 2027년 운세에 들어가나요?", a: "월은 양력으로 보여 드리지만 사주에서는 절기로 달이 바뀌어요. 양력 1월은 아직 2026년(병오년) 기운이 이어지는 달이에요." },
]}
        />
      </div>
    </>
  );
}

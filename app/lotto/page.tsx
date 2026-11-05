import { FeatureLanding } from "@/components/seo/FeatureLanding";
import { featureMetadata } from "@/lib/seo/feature-pages";
import { drawRound, upcomingDrawDate } from "@/lib/lotto/saju-lotto";
import { getLottoDraws, recentFrequency } from "@/lib/lotto/winning-data";

export const metadata = featureMetadata("lotto");
export const revalidate = 3600;

function Ball({ n }: { n: number }) {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-slate-900">{n}</span>
  );
}

export default async function LottoPage() {
  const draws = await getLottoDraws();
  const latest = draws?.[draws.length - 1];
  const recent = draws ? recentFrequency(draws, 30) : null;
  const top = recent
    ? Array.from({ length: 45 }, (_, i) => ({ n: i + 1, c: recent.counts[i + 1] }))
        .sort((a, b) => b.c - a.c || a.n - b.n)
        .slice(0, 6)
    : [];
  const next = upcomingDrawDate();
  const [, nm, nd] = next.split("-").map(Number);

  return (
    <FeatureLanding feature="lotto">
      <p className="mt-4 text-center text-sm text-white/60">
        이번 주 추첨: 제{drawRound(next)}회 · {nm}월 {nd}일(토)
      </p>
      {latest ? (
        <section className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-950/20 p-5">
          <h2 className="text-base font-bold text-white">
            최근 당첨번호 (제{latest.round}회 · {latest.date})
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-1">
            {latest.numbers.map((n) => (
              <Ball key={n} n={n} />
            ))}
            <span className="text-white/50">+</span>
            <Ball n={latest.bonus} />
          </div>
          {recent ? (
            <>
              <h3 className="mt-5 text-sm font-bold text-white/90">
                최근 {recent.size}회({recent.fromRound}~{recent.toRound}회) 많이 나온 번호
              </h3>
              <ul className="mt-2 grid grid-cols-3 gap-2 text-sm text-white/80">
                {top.map((t) => (
                  <li key={t.n}>{t.n}번 · {t.c}회</li>
                ))}
              </ul>
            </>
          ) : null}
          <p className="mt-3 text-[11px] text-white/40 break-keep">
            공개 당첨 자료로 집계했어요. 정확한 결과는 동행복권 공식 홈페이지에서 확인하세요. 지난 기록은 다음 추첨에 영향을 주지 않아요.
          </p>
        </section>
      ) : null}
    </FeatureLanding>
  );
}

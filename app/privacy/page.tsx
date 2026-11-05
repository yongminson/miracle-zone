import { PRIVACY_EFFECTIVE_DATE, PRIVACY_SECTIONS } from "@/lib/legal/privacy";

export const metadata = {
  title: "개인정보처리방침 | 명운(命運)",
  alternates: { canonical: "https://saju.ymstudio.co.kr/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 px-6 py-12 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-yellow-400 mb-8">개인정보처리방침</h1>
      <div className="space-y-6 text-sm text-white/80 leading-relaxed">
        {PRIVACY_SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="text-base font-bold text-white mb-2">{s.title}</h2>
            {s.paragraphs?.map((p) => (
              <p key={p} className="mb-2 break-keep">{p}</p>
            ))}
            {s.bullets ? (
              <ul className="list-disc space-y-1 pl-5">
                {s.bullets.map((b) => (
                  <li key={b} className="break-keep">{b}</li>
                ))}
              </ul>
            ) : null}
            {s.table ? (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-xs">
                  <thead>
                    <tr>
                      {s.table.head.map((h) => (
                        <th key={h} className="border border-white/15 bg-white/5 px-2 py-2 text-left font-bold text-white">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.table.rows.map((row) => (
                      <tr key={row[0]}>
                        {row.map((cell) => (
                          <td key={cell} className="border border-white/15 px-2 py-2 align-top break-keep">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        ))}
        <p className="text-white/40 text-xs mt-8">시행일: {PRIVACY_EFFECTIVE_DATE}</p>
      </div>
    </div>
  );
}

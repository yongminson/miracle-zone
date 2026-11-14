/**
 * 결제 전 "무료로 보는 것 / 결제하면 더 보는 것" 비교표 (2026-11-15).
 * 손님이 "무료랑 뭐가 다른데?"를 결제 버튼 바로 위에서 한눈에 알게 한다.
 * 칸에 true 면 ✓, false 면 —, 글자면 그 글자를 그대로 보여 준다.
 * 실제로 주는 것만 적는다 — 결과 화면에 없는 내용을 쓰면 안 된다.
 */

export type FreeVsPaidCell = string | boolean;
export type FreeVsPaidRow = { label: string; free: FreeVsPaidCell; paid: FreeVsPaidCell };

type Accent = "amber" | "sky" | "pink" | "emerald";

// Tailwind 가 찾을 수 있게 클래스 이름을 통째로 적어 둔다
const ACCENT: Record<Accent, { border: string; head: string; paid: string }> = {
  amber: { border: "border-amber-400/25", head: "text-amber-300", paid: "text-amber-100" },
  sky: { border: "border-sky-400/25", head: "text-sky-300", paid: "text-sky-100" },
  pink: { border: "border-pink-400/25", head: "text-pink-300", paid: "text-pink-100" },
  emerald: { border: "border-emerald-400/25", head: "text-emerald-300", paid: "text-emerald-100" },
};

function Cell({ value, className }: { value: FreeVsPaidCell; className: string }) {
  if (value === true) return <span className={`font-bold ${className}`}>✓</span>;
  if (value === false) return <span className="text-white/25">—</span>;
  return <span className={className}>{value}</span>;
}

export function FreeVsPaid({
  rows,
  accent = "amber",
  title = "무료 결과와 무엇이 다른가요?",
  className = "",
}: {
  rows: FreeVsPaidRow[];
  accent?: Accent;
  title?: string;
  className?: string;
}) {
  const a = ACCENT[accent];
  return (
    <div className={`rounded-2xl border ${a.border} bg-black/30 p-3 text-left ${className}`}>
      <p className={`text-center text-[11px] font-semibold tracking-widest ${a.head}`}>{title}</p>
      <table className="mt-2 w-full table-fixed border-collapse text-[12px] leading-snug">
        <thead>
          <tr className="text-[10px] text-white/45">
            <th className="w-[42%] pb-1.5 text-left font-medium" scope="col">
              항목
            </th>
            <th className="w-[22%] pb-1.5 text-center font-medium" scope="col">
              무료
            </th>
            <th className={`w-[36%] pb-1.5 text-center font-bold ${a.head}`} scope="col">
              결제하면
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-white/[0.07] align-top">
              <th scope="row" className="py-2 pr-2 text-left font-medium text-white/80 break-keep">
                {r.label}
              </th>
              <td className="px-1 py-2 text-center break-keep">
                <Cell value={r.free} className="text-white/50" />
              </td>
              <td className="py-2 pl-1 text-center break-keep">
                <Cell value={r.paid} className={`font-semibold ${a.paid}`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

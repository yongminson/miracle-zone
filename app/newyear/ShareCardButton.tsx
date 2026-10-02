"use client";

import { useEffect, useState } from "react";
import { logEvent } from "@/lib/analytics";
import type { NewYearResult } from "@/lib/newyear/newyear-types";

/**
 * 신년운세 결과 카드(이미지) — SNS·카톡에 올릴 수 있게 만든다.
 *
 * 링크 공유보다 눈에 잘 띄고, 점수를 서로 비교하게 만들어 새 사람을 데려온다.
 * 이름은 넣지 않는다(띠만). 앱(WebView)·앱인토스에서는 이미지 저장이 잘 안 돼 웹에서만 보인다.
 */

const W = 1080;
const H = 1350;
const FONT = `"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif`;

function drawCard(result: NewYearResult): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const bg = ctx.createRadialGradient(W / 2, H * 0.32, 80, W / 2, H * 0.4, H * 0.85);
  bg.addColorStop(0, "#5a0f1c");
  bg.addColorStop(0.55, "#2a0710");
  bg.addColorStop(1, "#0b0306");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 금테
  ctx.strokeStyle = "#e6b54f";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(48, 48, W - 96, H - 96, 56);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#f4c9cf";
  ctx.font = `600 40px ${FONT}`;
  ctx.fillText("2027 丁未年 · 붉은 양의 해", W / 2, 170);

  ctx.fillStyle = "#fff4dc";
  ctx.font = `800 64px ${FONT}`;
  ctx.fillText(`${result.zodiac}띠의 2027년`, W / 2, 260);

  // 점수
  ctx.fillStyle = "#ffd98a";
  ctx.font = `800 260px ${FONT}`;
  ctx.fillText(String(result.score), W / 2, 540);
  ctx.fillStyle = "rgba(255,244,220,0.6)";
  ctx.font = `500 36px ${FONT}`;
  ctx.fillText("2027년 종합 점수", W / 2, 600);

  // 한 해의 제목
  ctx.fillStyle = "#fff4dc";
  ctx.font = `800 84px ${FONT}`;
  ctx.fillText(result.title, W / 2, 740);
  ctx.fillStyle = "#f4a3ae";
  ctx.font = `600 44px ${FONT}`;
  ctx.fillText(result.keyword, W / 2, 810);

  // 좋은 달·조심할 달
  const box = (x: number, label: string, value: string, color: string) => {
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.roundRect(x, 880, 420, 190, 32);
    ctx.fill();
    ctx.fillStyle = "rgba(255,244,220,0.6)";
    ctx.font = `500 34px ${FONT}`;
    ctx.fillText(label, x + 210, 945);
    ctx.fillStyle = color;
    ctx.font = `800 64px ${FONT}`;
    ctx.fillText(value, x + 210, 1030);
  };
  box(110, "좋은 달", result.bestMonths.map((m) => `${m}월`).join(" · "), "#86efac");
  box(550, "조심할 달", result.cautionMonths.map((m) => `${m}월`).join(" · "), "#fcd34d");

  ctx.fillStyle = "rgba(255,244,220,0.85)";
  ctx.font = `700 40px ${FONT}`;
  ctx.fillText("너의 2027년은 몇 점일까?", W / 2, 1160);
  ctx.fillStyle = "#e6b54f";
  ctx.font = `600 34px ${FONT}`;
  ctx.fillText("명운 · saju.ymstudio.co.kr/newyear", W / 2, 1225);
  return canvas;
}

export function ShareCardButton({ result }: { result: NewYearResult }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isApp = typeof navigator !== "undefined" && navigator.userAgent.includes("MyeongunApp");
    setVisible(!isApp && process.env.NEXT_PUBLIC_PLATFORM !== "toss");
  }, []);

  if (!visible) return null;

  const share = async () => {
    setBusy(true);
    try {
      const canvas = drawCard(result);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;
      const file = new File([blob], "myeongun-2027.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        void logEvent("newyear_card", { via: "share" });
        await navigator.share({ files: [file], title: "나의 2027 신년운세" });
        return;
      }
      // 공유 창이 없으면(PC 등) 이미지로 저장한다
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "myeongun-2027.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      void logEvent("newyear_card", { via: "download" });
    } catch {
      // 공유를 취소한 경우도 여기로 온다 — 알리지 않는다
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void share()}
      className="w-full rounded-2xl border border-amber-400/40 bg-amber-500/10 py-3 text-sm font-bold text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50"
    >
      {busy ? "카드 만드는 중…" : "🖼 결과 카드로 저장·공유"}
    </button>
  );
}

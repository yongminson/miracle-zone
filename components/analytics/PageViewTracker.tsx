"use client";

import { useEffect } from "react";
import { captureAttribution, logEvent } from "@/lib/analytics";

/**
 * 서버 컴포넌트 페이지에 방문 기록을 남기기 위한 조각.
 *
 * 지금까지 방문 기록이 /tools 에서만 찍혀서, 랜딩에 와서 도구로 넘어가지 않고
 * 이탈한 사람이 보이지 않았다. 유입 경로(referrer·UTM)도 /tools 에 직접 들어온
 * 경우에만 남아, 랜딩을 거친 방문은 자기 사이트에서 온 것처럼 기록됐다.
 */
export function PageViewTracker({ page }: { page: string }) {
  useEffect(() => {
    captureAttribution();
    void logEvent("page_view", { page });
  }, [page]);

  return null;
}

import { PageViewTracker } from "@/components/analytics/PageViewTracker";

/**
 * 이 화면으로 바로 들어온 방문(블로그 링크·공유 링크)의 유입 경로를 남긴다.
 * 예전에는 랜딩과 도구 화면에서만 기록해서, 여기로 바로 온 사람은 빠졌다.
 */
export default function VipLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageViewTracker page="vip" />
      {children}
    </>
  );
}

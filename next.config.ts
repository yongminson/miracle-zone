import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      // 기본 보안 응답 (2026-11-04) — 다른 사이트가 우리 화면(결제 포함)을 몰래 틀(iframe) 안에 넣어 누르게 하는 것(클릭재킹)을 막고,
      // 파일 형식 위장·주소 노출을 줄인다. 앱(WebView)·토스(자체 빌드)는 틀로 넣는 방식이 아니라 영향 없다.
      // 관상·손금 사진은 파일 고르기라 카메라 권한과 상관없지만, 이 사이트 안에서는 카메라를 쓸 수 있게 열어 둔다.
      // 전체 CSP(스크립트 출처 제한)는 포트원·카카오·광고 스크립트를 깰 수 있어 넣지 않았다 — 넣을 땐 결제부터 시험할 것.
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/:file(tiktok.+\\.txt)",
        headers: [{ key: "Content-Type", value: "text/plain; charset=utf-8" }],
      },
    ];
  },
};

export default nextConfig;

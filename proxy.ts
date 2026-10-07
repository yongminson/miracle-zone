import { NextRequest, NextResponse } from "next/server";

const ALLOWED_APP_ORIGINS = new Set([
  "https://myeongun.apps.tossmini.com",
  "https://myeongun.private-apps.tossmini.com",
  // 토스 SDK 3.x 부터 미니앱 주소가 바뀐다(위 두 개는 2.x 로 출시된 버전용으로 남겨 둔다)
  "https://myeongun.web.tossmini.com",
  "https://myeongun.private-web.tossmini.com",
  "https://myeongun-app.vercel.app",
]);

function appendVaryOrigin(headers: Headers) {
  const current = headers.get("Vary");
  const values = new Set(
    (current ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  values.add("Origin");
  headers.set("Vary", Array.from(values).join(", "));
}

function addAppCorsHeaders(req: NextRequest, response: NextResponse) {
  const origin = req.headers.get("origin");
  if (!origin || !ALLOWED_APP_ORIGINS.has(origin)) return response;

  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Access-Control-Max-Age", "86400");
  appendVaryOrigin(response.headers);
  return response;
}

export function proxy(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return addAppCorsHeaders(req, new NextResponse(null, { status: 204 }));
  }

  return addAppCorsHeaders(req, NextResponse.next());
}

export const config = {
  matcher: "/api/:path*",
};

import { NextResponse } from "next/server";
import { exchangeTossAuthorizationCode } from "@/lib/auth/toss-login";

export const runtime = "nodejs";

const AUTHORIZATION_CODE_PATTERN = /^[^\u0000-\u001F\u007F\s]{16,2048}$/;

function failure(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const authorizationCode =
      typeof body.authorizationCode === "string"
        ? body.authorizationCode.trim()
        : "";
    const referrer = body.referrer;

    if (!AUTHORIZATION_CODE_PATTERN.test(authorizationCode)) {
      return failure("토스 로그인 인증코드 형식이 올바르지 않습니다.", 400);
    }
    if (referrer !== "DEFAULT" && referrer !== "SANDBOX") {
      return failure("토스 로그인 실행 환경이 올바르지 않습니다.", 400);
    }

    const result = await exchangeTossAuthorizationCode({
      authorizationCode,
      referrer,
    });
    if (!result.ok) {
      console.error("[toss-login] exchange failed", { code: result.code });
      const status = result.code === "CONFIGURATION_ERROR" ? 503 : 401;
      return failure(result.message, status);
    }

    return NextResponse.json({ success: true, userKey: result.userKey });
  } catch (error) {
    console.error("[toss-login] unexpected exchange error", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return failure("토스 로그인 처리 중 서버 오류가 발생했습니다.", 500);
  }
}

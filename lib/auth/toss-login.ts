import { request as httpsRequest } from "node:https";

const TOSS_API_HOSTNAME = "apps-in-toss-api.toss.im";
const RESPONSE_SIZE_LIMIT_BYTES = 64 * 1024;
const REQUEST_TIMEOUT_MS = 8_000;

type TossApiEnvelope<T> = {
  resultType?: string;
  success?: T;
  error?: {
    errorCode?: string;
    reason?: string;
  };
};

type TossTokenResponse = {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: string;
  scope?: string;
};

type TossLoginMeResponse = {
  userKey?: number | string;
};

type TossLoginResult =
  | { ok: true; userKey: string }
  | {
      ok: false;
      code: "CONFIGURATION_ERROR" | "TOKEN_EXCHANGE_FAILED" | "USER_LOOKUP_FAILED";
      message: string;
    };

function decodePemEnvironmentVariable(name: string): string | null {
  const encoded = process.env[name]?.trim();
  if (!encoded) return null;

  const pem = Buffer.from(encoded, "base64").toString("utf8").trim();
  if (!pem.includes("-----BEGIN ") || !pem.includes("-----END ")) return null;
  return pem;
}

function getMtlsCredentials():
  | { ok: true; cert: string; key: string }
  | { ok: false } {
  const cert = decodePemEnvironmentVariable(
    "APPS_IN_TOSS_MTLS_CERT_BASE64",
  );
  const key = decodePemEnvironmentVariable(
    "APPS_IN_TOSS_MTLS_KEY_BASE64",
  );
  return cert && key ? { ok: true, cert, key } : { ok: false };
}

function requestTossJson<T>(params: {
  method: "GET" | "POST";
  path: string;
  cert: string;
  key: string;
  body?: Record<string, unknown>;
  authorization?: string;
}): Promise<{ ok: true; statusCode: number; body: T } | { ok: false }> {
  const requestBody = params.body ? JSON.stringify(params.body) : null;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (
      result: { ok: true; statusCode: number; body: T } | { ok: false },
    ) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const req = httpsRequest(
      {
        hostname: TOSS_API_HOSTNAME,
        port: 443,
        path: params.path,
        method: params.method,
        cert: params.cert,
        key: params.key,
        rejectUnauthorized: true,
        headers: {
          "Content-Type": "application/json",
          ...(requestBody
            ? { "Content-Length": Buffer.byteLength(requestBody) }
            : {}),
          ...(params.authorization
            ? { Authorization: params.authorization }
            : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        let responseBytes = 0;

        res.on("data", (chunk: Buffer) => {
          responseBytes += chunk.length;
          if (responseBytes > RESPONSE_SIZE_LIMIT_BYTES) {
            res.destroy(new Error("Toss API response exceeded size limit"));
            return;
          }
          chunks.push(chunk);
        });
        res.on("error", () => finish({ ok: false }));
        res.on("end", () => {
          try {
            finish({
              ok: true,
              statusCode: res.statusCode ?? 0,
              body: JSON.parse(
                Buffer.concat(chunks).toString("utf8"),
              ) as T,
            });
          } catch {
            finish({ ok: false });
          }
        });
      },
    );

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error("Toss API request timed out"));
    });
    req.on("error", () => finish({ ok: false }));
    req.end(requestBody ?? undefined);
  });
}

export async function exchangeTossAuthorizationCode(params: {
  authorizationCode: string;
  referrer: "DEFAULT" | "SANDBOX";
}): Promise<TossLoginResult> {
  const credentials = getMtlsCredentials();
  if (!credentials.ok) {
    return {
      ok: false,
      code: "CONFIGURATION_ERROR",
      message: "토스 로그인 서버 인증서가 설정되지 않았습니다.",
    };
  }

  const tokenResponse = await requestTossJson<
    TossApiEnvelope<TossTokenResponse>
  >({
    method: "POST",
    path: "/api-partner/v1/apps-in-toss/user/oauth2/generate-token",
    cert: credentials.cert,
    key: credentials.key,
    body: {
      authorizationCode: params.authorizationCode,
      referrer: params.referrer,
    },
  });
  const accessToken =
    tokenResponse.ok &&
    tokenResponse.statusCode >= 200 &&
    tokenResponse.statusCode < 300 &&
    tokenResponse.body.resultType === "SUCCESS"
      ? tokenResponse.body.success?.accessToken
      : null;
  if (!accessToken) {
    return {
      ok: false,
      code: "TOKEN_EXCHANGE_FAILED",
      message: "토스 로그인 인증을 완료하지 못했습니다.",
    };
  }

  const userResponse = await requestTossJson<
    TossApiEnvelope<TossLoginMeResponse>
  >({
    method: "GET",
    path: "/api-partner/v1/apps-in-toss/user/oauth2/login-me",
    cert: credentials.cert,
    key: credentials.key,
    authorization: `Bearer ${accessToken}`,
  });
  const userKey =
    userResponse.ok &&
    userResponse.statusCode >= 200 &&
    userResponse.statusCode < 300 &&
    userResponse.body.resultType === "SUCCESS"
      ? userResponse.body.success?.userKey
      : null;
  if (
    (typeof userKey !== "string" && typeof userKey !== "number") ||
    String(userKey).trim() === ""
  ) {
    return {
      ok: false,
      code: "USER_LOOKUP_FAILED",
      message: "토스 사용자 식별 정보를 확인하지 못했습니다.",
    };
  }

  return { ok: true, userKey: String(userKey).trim() };
}

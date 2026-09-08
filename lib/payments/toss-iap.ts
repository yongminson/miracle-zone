import { request as httpsRequest } from "node:https";

const TOSS_IAP_HOSTNAME = "apps-in-toss-api.toss.im";
const TOSS_IAP_ORDER_STATUS_PATH =
  "/api-partner/v1/apps-in-toss/order/get-order-status";
const RESPONSE_SIZE_LIMIT_BYTES = 64 * 1024;
const REQUEST_TIMEOUT_MS = 8_000;

export const TOSS_IAP_PRODUCTS = {
  vip_report: {
    amountWon: 4_400,
    skuEnvironmentVariable: "TOSS_IAP_VIP_REPORT_SKU",
  },
  altar_10days: {
    amountWon: 2_200,
    skuEnvironmentVariable: "TOSS_IAP_ALTAR_10D_SKU",
  },
} as const;

export type TossIapProductKey = keyof typeof TOSS_IAP_PRODUCTS;
export type TossIapOrderStatus =
  | "PURCHASED"
  | "PAYMENT_COMPLETED"
  | "FAILED"
  | "REFUNDED"
  | "ORDER_IN_PROGRESS"
  | "NOT_FOUND"
  | "MINIAPP_MISMATCH"
  | "ERROR";

type TossOrderStatusResponse = {
  resultType?: string;
  success?: {
    orderId?: string;
    sku?: string;
    statusDeterminedAt?: string;
    status?: string;
    reason?: string;
  };
  error?: {
    errorCode?: string;
    reason?: string;
  };
};

export type VerifiedTossIapOrder = {
  orderId: string;
  sku: string;
  status: "PURCHASED" | "PAYMENT_COMPLETED";
  statusDeterminedAt: string | null;
};

export type TossIapVerificationResult =
  | { ok: true; order: VerifiedTossIapOrder }
  | {
      ok: false;
      code:
        | "CONFIGURATION_ERROR"
        | "TOSS_API_ERROR"
        | "INVALID_RESPONSE"
        | "ORDER_MISMATCH"
        | "SKU_MISMATCH"
        | "ORDER_NOT_PAYABLE";
      message: string;
    };

export function isTossIapProductKey(value: string): value is TossIapProductKey {
  return Object.prototype.hasOwnProperty.call(TOSS_IAP_PRODUCTS, value);
}

function decodePemEnvironmentVariable(name: string): string | null {
  const encoded = process.env[name]?.trim();
  if (!encoded) return null;

  const pem = Buffer.from(encoded, "base64").toString("utf8").trim();
  if (!pem.includes("-----BEGIN ") || !pem.includes("-----END ")) return null;
  return pem;
}

function getTossIapConfiguration(productKey: TossIapProductKey):
  | { ok: true; cert: string; key: string; sku: string }
  | { ok: false; message: string } {
  const cert = decodePemEnvironmentVariable(
    "APPS_IN_TOSS_MTLS_CERT_BASE64",
  );
  const key = decodePemEnvironmentVariable(
    "APPS_IN_TOSS_MTLS_KEY_BASE64",
  );
  const product = TOSS_IAP_PRODUCTS[productKey];
  const sku = process.env[product.skuEnvironmentVariable]?.trim();

  if (!cert || !key || !sku) {
    return {
      ok: false,
      message:
        "토스 인앱결제 서버 인증서 또는 상품 SKU가 설정되지 않았습니다.",
    };
  }

  return { ok: true, cert, key, sku };
}

function requestOrderStatus(params: {
  orderId: string;
  tossUserKey: string;
  cert: string;
  key: string;
}): Promise<
  | { ok: true; statusCode: number; body: TossOrderStatusResponse }
  | { ok: false; message: string }
> {
  const body = JSON.stringify({ orderId: params.orderId });

  return new Promise((resolve) => {
    let settled = false;
    const finish = (
      result:
        | { ok: true; statusCode: number; body: TossOrderStatusResponse }
        | { ok: false; message: string },
    ) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const req = httpsRequest(
      {
        hostname: TOSS_IAP_HOSTNAME,
        port: 443,
        path: TOSS_IAP_ORDER_STATUS_PATH,
        method: "POST",
        cert: params.cert,
        key: params.key,
        rejectUnauthorized: true,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "x-toss-user-key": params.tossUserKey,
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

        res.on("error", () => {
          finish({ ok: false, message: "토스 주문 조회 응답 수신에 실패했습니다." });
        });

        res.on("end", () => {
          try {
            const parsed = JSON.parse(
              Buffer.concat(chunks).toString("utf8"),
            ) as TossOrderStatusResponse;
            finish({
              ok: true,
              statusCode: res.statusCode ?? 0,
              body: parsed,
            });
          } catch {
            finish({
              ok: false,
              message: "토스 주문 조회 응답 형식이 올바르지 않습니다.",
            });
          }
        });
      },
    );

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error("Toss API request timed out"));
    });
    req.on("error", () => {
      finish({ ok: false, message: "토스 주문 조회 요청에 실패했습니다." });
    });
    req.end(body);
  });
}

export async function verifyTossIapOrder(params: {
  orderId: string;
  productKey: TossIapProductKey;
  tossUserKey: string;
}): Promise<TossIapVerificationResult> {
  const configuration = getTossIapConfiguration(params.productKey);
  if (!configuration.ok) {
    return {
      ok: false,
      code: "CONFIGURATION_ERROR",
      message: configuration.message,
    };
  }

  const response = await requestOrderStatus({
    orderId: params.orderId,
    tossUserKey: params.tossUserKey,
    cert: configuration.cert,
    key: configuration.key,
  });
  if (!response.ok) {
    return {
      ok: false,
      code: "TOSS_API_ERROR",
      message: response.message,
    };
  }

  const payload = response.body;
  if (
    response.statusCode < 200 ||
    response.statusCode >= 300 ||
    payload.resultType !== "SUCCESS" ||
    !payload.success
  ) {
    return {
      ok: false,
      code: "TOSS_API_ERROR",
      message: "토스에서 주문 상태를 확인하지 못했습니다.",
    };
  }

  const order = payload.success;
  if (
    typeof order.orderId !== "string" ||
    typeof order.sku !== "string" ||
    typeof order.status !== "string"
  ) {
    return {
      ok: false,
      code: "INVALID_RESPONSE",
      message: "토스 주문 응답에 필수 정보가 없습니다.",
    };
  }
  if (order.orderId !== params.orderId) {
    return {
      ok: false,
      code: "ORDER_MISMATCH",
      message: "요청한 주문과 조회된 주문이 일치하지 않습니다.",
    };
  }
  if (order.sku !== configuration.sku) {
    return {
      ok: false,
      code: "SKU_MISMATCH",
      message: "구매한 상품이 요청한 상품과 일치하지 않습니다.",
    };
  }
  if (order.status !== "PAYMENT_COMPLETED" && order.status !== "PURCHASED") {
    return {
      ok: false,
      code: "ORDER_NOT_PAYABLE",
      message: "결제 완료 상태의 주문이 아닙니다.",
    };
  }

  return {
    ok: true,
    order: {
      orderId: order.orderId,
      sku: order.sku,
      status: order.status,
      statusDeterminedAt:
        typeof order.statusDeterminedAt === "string"
          ? order.statusDeterminedAt
          : null,
    },
  };
}

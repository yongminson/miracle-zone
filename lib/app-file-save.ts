/**
 * 구글 앱(명운-rn WebView) 안에서 파일(PDF·이미지) 저장.
 *
 * 앱 WebView 는 웹의 `<a download>`·blob 다운로드·navigator.share 를 처리하지 못해
 * 버튼을 눌러도 아무 일이 없다(2026-10-13 VIP 결제 손님이 PDF·이미지를 못 받음).
 * 앱(app/index.tsx)은 SAVE_PDF / SAVE_IMAGE 메시지를 받아 파일로 쓰고 공유 창(저장·카톡 등)을 연다.
 */

type Bridge = { postMessage: (message: string) => void };

function getBridge(): Bridge | null {
  if (typeof window === "undefined" || typeof navigator === "undefined") return null;
  if (!navigator.userAgent.includes("MyeongunApp")) return null;
  return (window as unknown as { ReactNativeWebView?: Bridge }).ReactNativeWebView ?? null;
}

/** 구글 앱 안이라 웹 다운로드 대신 앱 저장을 써야 하는지 */
export function isAppFileSave(): boolean {
  return getBridge() !== null;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("파일을 읽지 못했어요."));
    reader.readAsDataURL(blob);
  });
}

/**
 * 앱에 파일을 넘겨 저장·공유 창을 띄운다. 앱 밖이면 false(호출한 쪽이 웹 방식으로 저장).
 * filename 은 영문으로 — 앱이 휴대폰 저장소 경로에 그대로 쓴다.
 */
export async function saveFileInApp(blob: Blob, kind: "pdf" | "image", filename: string): Promise<boolean> {
  const bridge = getBridge();
  if (!bridge) return false;
  const base64 = await blobToBase64(blob);
  bridge.postMessage(
    JSON.stringify({
      type: kind === "pdf" ? "SAVE_PDF" : "SAVE_IMAGE",
      base64,
      filename: filename.replace(/[^a-zA-Z0-9._-]/g, "_"),
      mimeType: blob.type || (kind === "pdf" ? "application/pdf" : "image/png"),
    }),
  );
  return true;
}

/** 주소(blob:·data:·https)에 있는 파일을 앱으로 저장. 앱 밖이면 false */
export async function saveUrlInApp(url: string, kind: "pdf" | "image", filename: string): Promise<boolean> {
  if (!getBridge()) return false;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`파일을 불러오지 못했어요 (${res.status})`);
  return saveFileInApp(await res.blob(), kind, filename);
}

"use client";

import { useCallback, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/** A4 세로 (mm) */
const PDF_PAGE_W_MM = 210;
const PDF_PAGE_H_MM = 297;

export const VIP_PDF_FILENAME = "명운_VIP_대운리포트.pdf";

export type UsePdfDownloadOptions = {
  /** html2canvas scale — 선명도 (메모리↑) */
  scale?: number;
};

/** 모바일 인앱 등에서 `save()`가 막혀도 Blob 링크로 복구 가능 */
export type VipPdfDownloadResult =
  | { ok: true; blobUrl: string; filename: string; revoke: () => void }
  | { ok: false; error: string };

/**
 * 루트 요소의 자식 중 `[data-pdf-page]` 각각을 한 PDF 페이지로 캡처합니다.
 * Blob URL을 반환해 화면에 수동 다운로드 링크(폴백)를 둘 수 있습니다.
 */
export function usePdfDownload(options: UsePdfDownloadOptions = {}) {
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadPdf = useCallback(
    async (root: HTMLElement | null): Promise<VipPdfDownloadResult | null> => {
      if (!root) {
        return { ok: false, error: "PDF 루트 요소가 없습니다." };
      }

      const pages = root.querySelectorAll<HTMLElement>("[data-pdf-page]");
      if (pages.length === 0) {
        return { ok: false, error: "PDF 페이지 노드([data-pdf-page])를 찾지 못했습니다." };
      }

      const scale = options.scale ?? 2;
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      setIsGenerating(true);
      try {
        for (let i = 0; i < pages.length; i += 1) {
          const el = pages[i];
          const canvas = await html2canvas(el, {
            scale,
            useCORS: true,
            logging: false,
            backgroundColor: "#060a12",
            scrollX: 0,
            scrollY: 0,
            windowWidth: el.scrollWidth,
            windowHeight: el.scrollHeight,
          });

          const imgData = canvas.toDataURL("image/png", 1.0);
          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, 0, PDF_PAGE_W_MM, PDF_PAGE_H_MM, undefined, "FAST");
        }

        const blob = pdf.output("blob");
        const blobUrl = URL.createObjectURL(blob);
        const filename = VIP_PDF_FILENAME;

        try {
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = filename;
          a.rel = "noopener noreferrer";
          a.style.display = "none";
          document.body.appendChild(a);
          a.click();
          requestAnimationFrame(() => {
            try {
              document.body.removeChild(a);
            } catch {
              /* ignore */
            }
          });
        } catch {
          /* 인앱 브라우저 등에서 click 실패해도 blobUrl 폴백으로 계속 진행 */
        }

        return {
          ok: true,
          blobUrl,
          filename,
          revoke: () => {
            try {
              URL.revokeObjectURL(blobUrl);
            } catch {
              /* ignore */
            }
          },
        };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, error: msg };
      } finally {
        setIsGenerating(false);
      }
    },
    [options.scale],
  );

  return { downloadPdf, isGenerating };
}

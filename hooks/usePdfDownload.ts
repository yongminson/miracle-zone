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

/**
 * 루트 요소의 자식 중 `[data-pdf-page]` 각각을 한 PDF 페이지로 캡처합니다.
 * 페이지 높이가 A4 비율로 고정되어 있어 본문은 패킹 단계에서 페이지 단위로 나뉩니다.
 */
export function usePdfDownload(options: UsePdfDownloadOptions = {}) {
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadPdf = useCallback(
    async (root: HTMLElement | null) => {
      if (!root) return;

      const pages = root.querySelectorAll<HTMLElement>("[data-pdf-page]");
      if (pages.length === 0) return;

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

        pdf.save(VIP_PDF_FILENAME);
      } finally {
        setIsGenerating(false);
      }
    },
    [options.scale],
  );

  return { downloadPdf, isGenerating };
}

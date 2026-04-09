"use client";

import { useRef, useState, useCallback } from "react";
import * as Y from "yjs";
import { v4 as uuidv4 } from "uuid";
import type { CanvasElement } from "@whiteboard/types";

interface UsePdfImportOptions {
  yPages: Y.Map<Y.Array<CanvasElement>>;
  yPageOrder: Y.Array<string>;
  yMeta: Y.Map<string>;
  ydoc: Y.Doc;
  isTeacher: boolean;
}

const A4_WIDTH_PX = 794;

export function usePdfImport({
  yPages,
  yPageOrder,
  yMeta,
  ydoc,
  isTeacher,
}: UsePdfImportOptions) {
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerImport = useCallback(() => {
    if (!isTeacher) return;
    fileInputRef.current?.click();
  }, [isTeacher]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      if (file.type !== "application/pdf") return;

      setImporting(true);
      setImportProgress(null);

      let pdfWorker: Worker | null = null;

      try {
        const pdfjsLib = await import("pdfjs-dist");

        // webpack 5 패턴: new URL()로 worker를 로컬 번들에서 로드 (CDN/CORS 문제 없음)
        pdfWorker = new Worker(
          new URL("pdfjs-dist/build/pdf.worker.min.js", import.meta.url),
        );
        pdfjsLib.GlobalWorkerOptions.workerPort = pdfWorker;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
        const newPageIds: string[] = [];

        setImportProgress({ current: 0, total: pdf.numPages });

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);

          // A4 너비 기준으로 scale 계산
          const naturalViewport = page.getViewport({ scale: 1 });
          const scale = A4_WIDTH_PX / naturalViewport.width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext("2d")!;

          await page.render({ canvasContext: ctx, viewport }).promise;

          const blob = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob(
              (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob failed"))),
              "image/png",
            ),
          );

          const formData = new FormData();
          formData.append("file", blob, `pdf_page_${i}.png`);
          const res = await fetch(`${apiUrl}/upload`, { method: "POST", body: formData });
          const { url } = (await res.json()) as { url: string; hash: string };

          const pageId = uuidv4();
          newPageIds.push(pageId);

          ydoc.transact(() => {
            yPages.set(pageId, new Y.Array<CanvasElement>());
            yPageOrder.push([pageId]);
            yMeta.set(`bgImage:${pageId}`, `${apiUrl}${url}`);
          });

          setImportProgress({ current: i, total: pdf.numPages });
        }

        await pdf.destroy();

        // 첫 번째 새 페이지로 이동
        if (newPageIds[0]) {
          ydoc.transact(() => yMeta.set("currentPage", newPageIds[0]));
        }
      } finally {
        if (pdfWorker) {
          pdfWorker.terminate();
        }
        setImporting(false);
        setImportProgress(null);
      }
    },
    [ydoc, yMeta, yPageOrder, yPages],
  );

  return { triggerImport, importing, importProgress, fileInputRef, handleFileChange };
}

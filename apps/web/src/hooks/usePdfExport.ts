"use client";

import { useState, useCallback } from "react";
import * as Y from "yjs";
import type { Room, CanvasElement } from "@whiteboard/types";

interface UsePdfExportOptions {
  room: Room;
  yPages: Y.Map<Y.Array<CanvasElement>>;
  yPageOrder: Y.Array<string>;
}

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

export function usePdfExport({ room, yPages, yPageOrder }: UsePdfExportOptions) {
  const [exporting, setExporting] = useState(false);

  const exportToPDF = useCallback(async () => {
    setExporting(true);
    try {
      const [{ default: jsPDF }, { fabric }] = await Promise.all([
        import("jspdf"),
        import("fabric"),
      ]);

      const pageOrder = yPageOrder.toArray();
      const pdf = new jsPDF({ format: "a4", orientation: "portrait", unit: "mm" });

      for (let i = 0; i < pageOrder.length; i++) {
        const pageId = pageOrder[i];
        const elements = yPages.get(pageId)?.toArray() ?? [];

        // 오프스크린 canvas 엘리먼트 생성
        const offscreenEl = document.createElement("canvas");
        offscreenEl.width = A4_WIDTH_PX;
        offscreenEl.height = A4_HEIGHT_PX;
        offscreenEl.style.position = "absolute";
        offscreenEl.style.left = "-9999px";
        document.body.appendChild(offscreenEl);

        const fc = new fabric.Canvas(offscreenEl, {
          width: A4_WIDTH_PX,
          height: A4_HEIGHT_PX,
          backgroundColor: "#ffffff",
        });

        // 이미지 요소는 비동기 처리
        const imagePromises: Promise<void>[] = [];

        for (const el of elements) {
          const obj = deserializeForPDF(fabric, el, imagePromises, fc);
          if (obj) fc.add(obj);
        }

        await Promise.all(imagePromises);
        fc.renderAll();

        const dataUrl = fc.toDataURL({ format: "png", multiplier: 2 });
        if (i > 0) pdf.addPage();
        pdf.addImage(dataUrl, "PNG", 0, 0, 210, 297);

        fc.dispose();
        document.body.removeChild(offscreenEl);
      }

      pdf.save(`${room.name}_수업자료.pdf`);
    } finally {
      setExporting(false);
    }
  }, [room.name, yPages, yPageOrder]);

  return { exportToPDF, exporting };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deserializeForPDF(fabric: any, el: CanvasElement, imagePromises: Promise<void>[], fc: any) {
  switch (el.type) {
    case "pen": {
      if (!el.pathData) return null;
      return new fabric.Path(el.pathData, {
        stroke: el.strokeColor,
        strokeWidth: el.strokeWidth,
        fill: "transparent",
        strokeLineCap: "round",
        strokeLineJoin: "round",
      });
    }
    case "line":
      return new fabric.Line([el.start.x, el.start.y, el.end.x, el.end.y], {
        stroke: el.strokeColor,
        strokeWidth: el.strokeWidth,
      });
    case "rect":
      return new fabric.Rect({
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        fill: el.fillColor ?? "transparent",
        stroke: el.strokeColor,
        strokeWidth: el.strokeWidth,
        angle: el.angle,
      });
    case "ellipse":
      return new fabric.Ellipse({
        left: el.cx - el.rx,
        top: el.cy - el.ry,
        rx: el.rx,
        ry: el.ry,
        fill: el.fillColor ?? "transparent",
        stroke: el.strokeColor,
        strokeWidth: el.strokeWidth,
        angle: el.angle,
      });
    case "text":
      return new fabric.Textbox(el.content, {
        left: el.left,
        top: el.top,
        width: el.width,
        fontSize: el.fontSize,
        fontWeight: el.fontWeight,
        textAlign: el.align,
        fill: el.color,
        angle: el.angle,
      });
    case "image": {
      const p = new Promise<void>((resolve) => {
        fabric.Image.fromURL(el.src, (img: any) => {
          img.set({
            left: el.left,
            top: el.top,
            scaleX: el.scaleX,
            scaleY: el.scaleY,
            angle: el.angle,
          });
          fc.add(img);
          resolve();
        });
      });
      imagePromises.push(p);
      return null;
    }
    default:
      return null;
  }
}

"use client";

import { useEffect } from "react";
import type { ToolType } from "@whiteboard/types";
import type { FabricInstance } from "./fabricCanvas.utils";

interface UseCanvasToolOptions {
  fabricRef: React.RefObject<FabricInstance>;
  tool: ToolType;
  strokeColor: string;
  strokeWidth: number;
  canDraw: boolean;
}

/**
 * 도구 선택 / 권한 변경을 fabric 설정에 반영하는 훅
 * - isDrawingMode / selection 토글
 * - 펜/지우개 커서 SVG 교체
 * - 객체 selectable/evented 갱신
 */
export function useCanvasTool({
  fabricRef,
  tool,
  strokeColor,
  strokeWidth,
  canDraw,
}: UseCanvasToolOptions) {
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;

    fc.isDrawingMode = canDraw && tool === "pen";
    fc.selection = canDraw && tool === "select";

    if (fc.isDrawingMode && fc.freeDrawingBrush) {
      fc.freeDrawingBrush.color = strokeColor;
      fc.freeDrawingBrush.width = strokeWidth;
    }

    fc.getObjects().forEach((obj: FabricInstance) => {
      if (tool === "eraser") {
        obj.selectable = false;
        obj.evented = canDraw;
        obj.hoverCursor = "pointer";
      } else {
        obj.selectable = canDraw && tool === "select";
        obj.evented = canDraw;
        obj.hoverCursor = undefined;
      }
    });

    // 펜: 선 굵기에 맞는 원형 커서
    if (tool === "pen") {
      const r = Math.max(strokeWidth / 2, 2);
      const svgSize = Math.ceil(r * 2 + 4);
      const c = svgSize / 2;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${strokeColor}" stroke-width="0.5"/></svg>`;
      const cur = `url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}') ${c} ${c}, crosshair`;
      fc.freeDrawingCursor = cur;
      fc.defaultCursor = cur;
    } else if (tool === "eraser") {
      const svgSize = 24;
      const c = svgSize / 2;
      const r = 10;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#ff4444" stroke-width="1.5"/><circle cx="${c}" cy="${c}" r="1" fill="#ff4444"/></svg>`;
      const cur = `url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}') ${c} ${c}, cell`;
      fc.defaultCursor = cur;
      fc.hoverCursor = cur;
    } else {
      fc.freeDrawingCursor = "crosshair";
      fc.defaultCursor = "default";
      fc.hoverCursor = "move";
    }

    fc.renderAll();
  }, [tool, strokeColor, strokeWidth, canDraw]);
}

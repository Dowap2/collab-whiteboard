"use client";

import { useRef, useCallback } from "react";
import * as Y from "yjs";
import { DrawPermission } from "@whiteboard/types";
import type { CanvasElement } from "@whiteboard/types";
import { useCanvasStore } from "@/store/canvasStore";
import { useCanvasSetup } from "./useCanvasSetup";
import { useCanvasSync } from "./useCanvasSync";
import { useCanvasTool } from "./useCanvasTool";
import { useCanvasDrawing } from "./useCanvasDrawing";

interface UseFabricCanvasOptions {
  canvasElRef: React.RefObject<HTMLCanvasElement | null>;
  pageId: string;
  yPages: Y.Map<Y.Array<CanvasElement>>;
  yMeta: Y.Map<string>;
  ydoc: Y.Doc;
  participantId: string;
  isTeacher: boolean;
  drawPermission: DrawPermission;
}

/**
 * useFabricCanvas — 얇은 오케스트레이터
 *
 * 내부 책임은 4개의 전용 훅으로 위임한다:
 *  - useCanvasSetup   : fabric 초기화 + 이벤트 핸들러
 *  - useCanvasSync    : Yjs ↔ 캔버스 동기화
 *  - useCanvasTool    : 도구/권한 → fabric 설정
 *  - useCanvasDrawing : 도형 추가 + 속성 편집 + 삭제
 */
export function useFabricCanvas({
  canvasElRef,
  pageId,
  yPages,
  yMeta,
  ydoc,
  participantId,
  isTeacher,
  drawPermission,
}: UseFabricCanvasOptions) {
  const { tool, strokeColor, strokeWidth, fillColor, fontSize, fontWeight, textAlign } =
    useCanvasStore();

  const canDraw = isTeacher || drawPermission === DrawPermission.ALL;

  // stale closure 방지: 이벤트 핸들러에서 항상 최신 값 참조
  const pageIdRef = useRef(pageId);
  const yPagesRef = useRef(yPages);
  const canDrawRef = useRef(canDraw);
  pageIdRef.current = pageId;
  yPagesRef.current = yPages;
  canDrawRef.current = canDraw;

  // 1. fabric 초기화 + 이벤트 바인딩
  const fabricRef = useCanvasSetup({
    canvasElRef,
    participantId,
    ydoc,
    pageIdRef,
    yPagesRef,
    canDrawRef,
  });

  // 2. Yjs ↔ 캔버스 동기화
  useCanvasSync({ fabricRef, pageId, yPages, yMeta, ydoc, canDrawRef });

  // 3. 도구/권한 변경 → fabric 설정
  useCanvasTool({ fabricRef, tool, strokeColor, strokeWidth, canDraw });

  // 4. 도형 추가 + 속성 편집 + 삭제
  const drawing = useCanvasDrawing({
    fabricRef,
    pageIdRef,
    yPagesRef,
    participantId,
    ydoc,
    canDraw,
    fillColor,
    strokeColor,
    strokeWidth,
    fontSize,
    fontWeight,
    textAlign,
  });

  const resizeTo = useCallback((width: number, height: number) => {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.setWidth(width);
    fc.setHeight(height);
    fc.renderAll();
  }, []);

  const getFabricCanvas = useCallback(() => fabricRef.current, []);

  return { getFabricCanvas, resizeTo, ...drawing };
}

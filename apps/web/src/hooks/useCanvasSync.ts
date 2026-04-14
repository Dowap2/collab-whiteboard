"use client";

import { useEffect } from "react";
import * as Y from "yjs";
import { useCanvasStore } from "@/store/canvasStore";
import type { CanvasElement, PageSize } from "@whiteboard/types";
import {
  type FabricInstance,
  loadPage,
  patchCanvas,
  loadBackgroundImage,
} from "./fabricCanvas.utils";

interface UseCanvasSyncOptions {
  fabricRef: React.RefObject<FabricInstance>;
  pageId: string;
  yPages: Y.Map<Y.Array<CanvasElement>>;
  yMeta: Y.Map<string>;
  ydoc: Y.Doc;
  canDrawRef: React.MutableRefObject<boolean>;
}

/**
 * Yjs ↔ fabric 동기화를 담당하는 훅
 * - 페이지 전환 시 캔버스 내용 교체 (Effect 1)
 * - 원격 Yjs 업데이트를 캔버스에 반영 (Effect 2)
 * - 배경색 변경 동기화 (Effect 3)
 */
export function useCanvasSync({
  fabricRef,
  pageId,
  yPages,
  yMeta,
  ydoc,
  canDrawRef,
}: UseCanvasSyncOptions) {
  // ── 페이지 전환 시 캔버스 내용 교체 ────────────────────────────────────
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fabric } = require("fabric") as { fabric: FabricInstance };

    const bgColor = (yMeta.get("backgroundColor") as string) ?? "#ffffff";
    fc.clear();
    fc.setBackgroundImage(null as FabricInstance, () => {});
    fc.backgroundColor = bgColor;

    const elements = yPages.get(pageId)?.toArray() ?? [];
    loadPage(fabric, fc, elements, bgColor);

    // 페이지 전환 후 현재 도구 상태 즉시 적용
    const currentTool = useCanvasStore.getState().tool;
    const canDraw = canDrawRef.current;
    fc.isDrawingMode = canDraw && currentTool === "pen";
    fc.selection = canDraw && currentTool === "select";
    fc.getObjects().forEach((obj: FabricInstance) => {
      obj.selectable = canDraw && currentTool === "select";
      obj.evented = canDraw;
    });

    // PDF 배경 이미지 로드
    const bgImageUrl = yMeta.get(`bgImage:${pageId}`) as string | undefined;
    if (bgImageUrl) {
      loadBackgroundImage(fabric, fc, bgImageUrl);
    }

    void ydoc; // ydoc은 직접 쓰이지 않지만 컨텍스트 명시를 위해 보관
  }, [pageId, yPages, yMeta]);

  // ── 원격 Yjs 업데이트 → fabric 부분 패치 ──────────────────────────────
  useEffect(() => {
    const yArr = yPages.get(pageId);
    if (!yArr) return;

    const handler = (_: Y.YArrayEvent<CanvasElement>, tx: Y.Transaction) => {
      if (tx.origin === "local") return;
      const fc = fabricRef.current;
      if (!fc) return;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { fabric } = require("fabric") as { fabric: FabricInstance };
      patchCanvas(fabric, fc, yArr.toArray());
    };

    yArr.observe(handler);
    return () => yArr.unobserve(handler);
  }, [pageId, yPages]);

  // ── 배경색 변경 동기화 ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      const fc = fabricRef.current;
      if (!fc) return;
      const bg = (yMeta.get("backgroundColor") as string) ?? "#ffffff";
      fc.backgroundColor = bg;
      fc.renderAll();
    };
    yMeta.observe(handler);
    handler();
    return () => yMeta.unobserve(handler);
  }, [yMeta]);
}

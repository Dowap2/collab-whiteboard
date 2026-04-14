"use client";

import { useEffect, useRef } from "react";
import * as Y from "yjs";
import { v4 as uuidv4 } from "uuid";
import { useCanvasStore } from "@/store/canvasStore";
import type { CanvasElement, PenElement, RectElement, EllipseElement, TextElement } from "@whiteboard/types";
import {
  type FabricInstance,
  serializeFabricPath,
  serializeObject,
} from "./fabricCanvas.utils";

interface UseCanvasSetupOptions {
  canvasElRef: React.RefObject<HTMLCanvasElement | null>;
  participantId: string;
  ydoc: Y.Doc;
  /** 현재 pageId를 항상 최신 값으로 가리키는 ref (stale closure 방지) */
  pageIdRef: React.MutableRefObject<string>;
  /** 현재 yPages를 항상 최신 값으로 가리키는 ref (stale closure 방지) */
  yPagesRef: React.MutableRefObject<Y.Map<Y.Array<CanvasElement>>>;
  /** 현재 canDraw를 항상 최신 값으로 가리키는 ref (stale closure 방지) */
  canDrawRef: React.MutableRefObject<boolean>;
}

/**
 * fabric.js 캔버스를 마운트 시 1회 초기화하고
 * path:created / object:modified / selection / mouse:down 이벤트를 등록한다.
 * fabricRef를 반환해 다른 훅에서 공유한다.
 */
export function useCanvasSetup({
  canvasElRef,
  participantId,
  ydoc,
  pageIdRef,
  yPagesRef,
  canDrawRef,
}: UseCanvasSetupOptions): React.RefObject<FabricInstance> {
  const fabricRef = useRef<FabricInstance>(null);

  useEffect(() => {
    const el = canvasElRef.current;
    if (!el) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fabric } = require("fabric") as { fabric: FabricInstance };

    const fc = new fabric.Canvas(el, {
      isDrawingMode: false,
      selection: false,
      backgroundColor: "#ffffff",
    });
    fabricRef.current = fc;

    // 자유곡선 완료 → Yjs 저장
    const onPathCreated = (e: { path: FabricInstance }) => {
      const path = e.path;
      const id = uuidv4();
      path.data = { id };

      const pathData = serializeFabricPath(path.path);
      const penEl: PenElement = {
        id,
        type: "pen",
        strokeColor: path.stroke,
        strokeWidth: path.strokeWidth,
        createdBy: participantId,
        pathData,
      };
      const yArr = yPagesRef.current.get(pageIdRef.current);
      if (!yArr) return;
      ydoc.transact(() => yArr.push([penEl]), "local");
    };

    // 객체 수정 → Yjs 저장
    const onObjectModified = (e: { target: FabricInstance }) => {
      const obj = e.target;
      const id: string = obj.data?.id;
      if (!id) return;
      const yArr = yPagesRef.current.get(pageIdRef.current);
      if (!yArr) return;
      const elements = yArr.toArray();
      const idx = elements.findIndex((el) => el.id === id);
      if (idx === -1) return;
      const updated = serializeObject(obj, elements[idx]);
      ydoc.transact(() => {
        yArr.delete(idx, 1);
        yArr.insert(idx, [updated]);
      }, "local");
    };

    // 선택 → PropertyPanel 연동 + 스토어 속성 동기화
    const onSelectionCreated = (e: { selected: FabricInstance[] }) => {
      const obj = e.selected?.[0];
      if (!obj?.data?.id) return;
      const yArr = yPagesRef.current.get(pageIdRef.current);
      const found = yArr?.toArray().find((el) => el.id === obj.data.id) ?? null;
      const store = useCanvasStore.getState();
      store.setSelectedElement(found);
      if (found) {
        const color = found.type === "text"
          ? ((found as TextElement).color ?? found.strokeColor)
          : found.strokeColor;
        if (color) store.setStrokeColor(color);
        if (found.strokeWidth) store.setStrokeWidth(found.strokeWidth);
        if (found.type === "rect" || found.type === "ellipse") {
          store.setFillColor((found as RectElement | EllipseElement).fillColor);
        }
        if (found.type === "text") {
          const t = found as TextElement;
          if (t.fontSize) store.setFontSize(t.fontSize);
          if (t.fontWeight) store.setFontWeight(t.fontWeight);
          if (t.align) store.setTextAlign(t.align);
        }
      }
    };

    const onSelectionCleared = () => useCanvasStore.getState().setSelectedElement(null);

    // 지우개: 클릭한 객체 삭제
    const onMouseDown = (opt: { target?: FabricInstance; e: MouseEvent }) => {
      const currentTool = useCanvasStore.getState().tool;
      if (currentTool !== "eraser") return;
      if (!canDrawRef.current) return;
      const target = opt.target;
      if (!target?.data?.id) return;

      const id: string = target.data.id;
      const yArr = yPagesRef.current.get(pageIdRef.current);
      if (!yArr) return;
      const elements = yArr.toArray();
      const idx = elements.findIndex((el) => el.id === id);
      if (idx !== -1) {
        ydoc.transact(() => yArr.delete(idx, 1), "local");
      }
      fc.remove(target);
      fc.renderAll();
    };

    fc.on("path:created", onPathCreated);
    fc.on("object:modified", onObjectModified);
    fc.on("selection:created", onSelectionCreated);
    fc.on("selection:updated", onSelectionCreated);
    fc.on("selection:cleared", onSelectionCleared);
    fc.on("mouse:down", onMouseDown);

    return () => {
      fc.off("path:created", onPathCreated);
      fc.off("object:modified", onObjectModified);
      fc.off("selection:created", onSelectionCreated);
      fc.off("selection:updated", onSelectionCreated);
      fc.off("selection:cleared", onSelectionCleared);
      fc.off("mouse:down", onMouseDown);
      fc.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasElRef]);

  return fabricRef;
}

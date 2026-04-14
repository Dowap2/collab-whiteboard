"use client";

import { useEffect, useCallback } from "react";
import * as Y from "yjs";
import { v4 as uuidv4 } from "uuid";
import { useCanvasStore, type PropertyChanges } from "@/store/canvasStore";
import type {
  CanvasElement,
  RectElement,
  EllipseElement,
  LineElement,
  TextElement,
  ImageElement,
  Point,
} from "@whiteboard/types";
import type { FabricInstance } from "./fabricCanvas.utils";

interface UseCanvasDrawingOptions {
  fabricRef: React.RefObject<FabricInstance>;
  pageIdRef: React.MutableRefObject<string>;
  yPagesRef: React.MutableRefObject<Y.Map<Y.Array<CanvasElement>>>;
  participantId: string;
  ydoc: Y.Doc;
  canDraw: boolean;
  fillColor: string | undefined;
  strokeColor: string;
  strokeWidth: number;
  fontSize: number;
  fontWeight: "normal" | "bold";
  textAlign: "left" | "center" | "right";
}

/**
 * 도형 추가(addRect/addEllipse/addLine/addTextBox/addImage),
 * 속성 편집(applyToSelected), 삭제(deleteSelected)를 담당하는 훅
 */
export function useCanvasDrawing({
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
}: UseCanvasDrawingOptions) {
  const addRect = useCallback(
    (point: Point) => {
      if (!canDraw) return;
      const fc = fabricRef.current;
      if (!fc) return;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { fabric } = require("fabric") as { fabric: FabricInstance };
      const id = uuidv4();
      const rect = new fabric.Rect({
        left: point.x, top: point.y, width: 120, height: 80,
        fill: fillColor ?? "transparent",
        stroke: strokeColor, strokeWidth, data: { id },
        selectable: true, evented: true,
      });
      fc.add(rect);
      fc.setActiveObject(rect);
      fc.renderAll();
      useCanvasStore.getState().setTool("select");

      const el: RectElement = {
        id, type: "rect",
        x: point.x, y: point.y, width: 120, height: 80,
        fillColor, strokeColor, strokeWidth, createdBy: participantId, angle: 0,
      };
      const yArr = yPagesRef.current.get(pageIdRef.current);
      if (yArr) ydoc.transact(() => yArr.push([el]), "local");
    },
    [canDraw, fillColor, strokeColor, strokeWidth, participantId, ydoc],
  );

  const addEllipse = useCallback(
    (point: Point) => {
      if (!canDraw) return;
      const fc = fabricRef.current;
      if (!fc) return;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { fabric } = require("fabric") as { fabric: FabricInstance };
      const id = uuidv4();
      const ellipse = new fabric.Ellipse({
        left: point.x, top: point.y, rx: 60, ry: 40,
        fill: fillColor ?? "transparent",
        stroke: strokeColor, strokeWidth, data: { id },
        selectable: true, evented: true,
      });
      fc.add(ellipse);
      fc.setActiveObject(ellipse);
      fc.renderAll();
      useCanvasStore.getState().setTool("select");

      const el: EllipseElement = {
        id, type: "ellipse",
        cx: point.x + 60, cy: point.y + 40, rx: 60, ry: 40,
        fillColor, strokeColor, strokeWidth, createdBy: participantId, angle: 0,
      };
      const yArr = yPagesRef.current.get(pageIdRef.current);
      if (yArr) ydoc.transact(() => yArr.push([el]), "local");
    },
    [canDraw, fillColor, strokeColor, strokeWidth, participantId, ydoc],
  );

  const addLine = useCallback(
    (start: Point, end: Point) => {
      if (!canDraw) return;
      const fc = fabricRef.current;
      if (!fc) return;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { fabric } = require("fabric") as { fabric: FabricInstance };
      const id = uuidv4();
      const line = new fabric.Line([start.x, start.y, end.x, end.y], {
        stroke: strokeColor, strokeWidth, data: { id },
        selectable: true, evented: true,
      });
      fc.add(line);
      fc.setActiveObject(line);
      fc.renderAll();
      useCanvasStore.getState().setTool("select");

      const el: LineElement = {
        id, type: "line", start, end, strokeColor, strokeWidth, createdBy: participantId,
      };
      const yArr = yPagesRef.current.get(pageIdRef.current);
      if (yArr) ydoc.transact(() => yArr.push([el]), "local");
    },
    [canDraw, strokeColor, strokeWidth, participantId, ydoc],
  );

  const addTextBox = useCallback(
    (point: Point) => {
      if (!canDraw) return;
      const fc = fabricRef.current;
      if (!fc) return;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { fabric } = require("fabric") as { fabric: FabricInstance };
      const id = uuidv4();
      const textbox = new fabric.Textbox("텍스트 입력", {
        left: point.x, top: point.y, width: 200,
        fontSize, fontWeight, textAlign,
        fill: strokeColor, data: { id },
        selectable: true, evented: true,
      });
      fc.add(textbox);
      fc.setActiveObject(textbox);
      textbox.enterEditing();
      fc.renderAll();

      const el: TextElement = {
        id, type: "text",
        left: point.x, top: point.y, width: 200,
        content: "텍스트 입력", fontSize,
        fontWeight: fontWeight as "normal" | "bold",
        align: textAlign as "left" | "center" | "right",
        color: strokeColor, strokeColor, strokeWidth, createdBy: participantId, angle: 0,
      };
      const yArr = yPagesRef.current.get(pageIdRef.current);
      if (!yArr) return;
      ydoc.transact(() => yArr.push([el]), "local");

      textbox.on("editing:exited", () => {
        const currentArr = yPagesRef.current.get(pageIdRef.current);
        if (!currentArr) return;
        const elements = currentArr.toArray();
        const idx = elements.findIndex((e) => e.id === id);
        if (idx === -1) return;
        const updated: TextElement = {
          ...(elements[idx] as TextElement),
          content: textbox.text ?? "",
        };
        ydoc.transact(() => {
          currentArr.delete(idx, 1);
          currentArr.insert(idx, [updated]);
        }, "local");
        useCanvasStore.getState().setTool("select");
      });
    },
    [canDraw, fontSize, fontWeight, textAlign, strokeColor, strokeWidth, participantId, ydoc],
  );

  const addImage = useCallback(
    (src: string, hash: string, point: Point) => {
      if (!canDraw) return;
      const fc = fabricRef.current;
      if (!fc) return;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { fabric } = require("fabric") as { fabric: FabricInstance };
      const id = uuidv4();

      fabric.Image.fromURL(src, (img: FabricInstance) => {
        const scale = Math.min(1, 400 / Math.max(img.width ?? 1, img.height ?? 1));
        img.set({ left: point.x, top: point.y, data: { id }, selectable: true, evented: true });
        img.scale(scale);
        fc.add(img);
        fc.setActiveObject(img);
        fc.renderAll();
        useCanvasStore.getState().setTool("select");

        const el: ImageElement = {
          id, type: "image",
          left: point.x, top: point.y,
          width: img.width ?? 0, height: img.height ?? 0,
          src, hash, scaleX: scale, scaleY: scale, angle: 0,
          strokeColor, strokeWidth: 0, createdBy: participantId,
        };
        const yArr = yPagesRef.current.get(pageIdRef.current);
        if (yArr) ydoc.transact(() => yArr.push([el]), "local");
      });
    },
    [canDraw, strokeColor, participantId, ydoc],
  );

  // 선택된 fabric 객체에 속성을 즉시 반영하고 Yjs에도 업데이트
  const applyToSelected = useCallback(
    (changes: PropertyChanges) => {
      const fc = fabricRef.current;
      if (!fc) return;
      const active = fc.getActiveObject();
      if (!active?.data?.id) return;

      const id: string = active.data.id;
      const yArr = yPagesRef.current.get(pageIdRef.current);
      if (!yArr) return;
      const elements = yArr.toArray();
      const idx = elements.findIndex((el) => el.id === id);
      if (idx === -1) return;
      const el = elements[idx];

      if (changes.strokeColor !== undefined) {
        if (el.type === "text") active.set({ fill: changes.strokeColor });
        else active.set({ stroke: changes.strokeColor });
      }
      if (changes.strokeWidth !== undefined) active.set({ strokeWidth: changes.strokeWidth });
      if (changes.fillColor !== undefined) {
        active.set({ fill: changes.fillColor ?? "transparent" });
      }
      if (changes.fontSize !== undefined) active.set({ fontSize: changes.fontSize });
      if (changes.fontWeight !== undefined) active.set({ fontWeight: changes.fontWeight });
      if (changes.textAlign !== undefined) active.set({ textAlign: changes.textAlign });
      active.setCoords?.();
      fc.renderAll();

      const updated = { ...el } as CanvasElement;
      if (changes.strokeColor !== undefined) {
        if (el.type === "text") {
          (updated as TextElement).color = changes.strokeColor;
          (updated as TextElement).strokeColor = changes.strokeColor;
        } else {
          updated.strokeColor = changes.strokeColor;
        }
      }
      if (changes.strokeWidth !== undefined) updated.strokeWidth = changes.strokeWidth;
      if (changes.fillColor !== undefined) {
        if (el.type === "rect") (updated as RectElement).fillColor = changes.fillColor ?? undefined;
        if (el.type === "ellipse") (updated as EllipseElement).fillColor = changes.fillColor ?? undefined;
      }
      if (el.type === "text") {
        const t = updated as TextElement;
        if (changes.fontSize !== undefined) t.fontSize = changes.fontSize;
        if (changes.fontWeight !== undefined) t.fontWeight = changes.fontWeight;
        if (changes.textAlign !== undefined) t.align = changes.textAlign;
      }

      ydoc.transact(() => {
        yArr.delete(idx, 1);
        yArr.insert(idx, [updated]);
      }, "local");
    },
    [ydoc],
  );

  // PropertyPanel에서 호출할 수 있도록 스토어에 등록
  useEffect(() => {
    useCanvasStore.getState().setApplyToSelected(applyToSelected);
    return () => useCanvasStore.getState().setApplyToSelected(null);
  }, [applyToSelected]);

  const deleteSelected = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc || !canDraw) return;
    const active = fc.getActiveObjects();
    if (active.length === 0) return;

    const yArr = yPagesRef.current.get(pageIdRef.current);
    if (!yArr) return;

    const elements = yArr.toArray();
    const idsToDelete = new Set<string>(active.map((obj: FabricInstance) => obj.data?.id));

    ydoc.transact(() => {
      for (let i = elements.length - 1; i >= 0; i--) {
        if (idsToDelete.has(elements[i].id)) yArr.delete(i, 1);
      }
    }, "local");

    active.forEach((obj: FabricInstance) => fc.remove(obj));
    fc.discardActiveObject();
    fc.renderAll();
  }, [canDraw, ydoc]);

  return { addRect, addEllipse, addLine, addTextBox, addImage, deleteSelected };
}

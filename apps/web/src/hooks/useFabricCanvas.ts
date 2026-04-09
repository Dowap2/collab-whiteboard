"use client";

import { useEffect, useRef, useCallback } from "react";
import * as Y from "yjs";
import { v4 as uuidv4 } from "uuid";
import { useCanvasStore, type PropertyChanges } from "@/store/canvasStore";
import type {
  CanvasElement,
  PenElement,
  LineElement,
  RectElement,
  EllipseElement,
  TextElement,
  ImageElement,
  Point,
} from "@whiteboard/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFabric = any;

interface UseFabricCanvasOptions {
  canvasElRef: React.RefObject<HTMLCanvasElement | null>;
  pageId: string;
  yPages: Y.Map<Y.Array<CanvasElement>>;
  yMeta: Y.Map<string>;
  ydoc: Y.Doc;
  participantId: string;
  isTeacher: boolean;
  drawPermission: "teacher-only" | "all";
}

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
  const fabricRef = useRef<AnyFabric>(null);

  const { tool, strokeColor, strokeWidth, fillColor, fontSize, fontWeight, textAlign } =
    useCanvasStore();

  const canDraw = isTeacher || drawPermission === "all";

  // stale closure 방지: 이벤트 핸들러에서 항상 최신 pageId/yPages/canDraw를 참조
  const pageIdRef = useRef(pageId);
  const yPagesRef = useRef(yPages);
  const canDrawRef = useRef(canDraw);
  pageIdRef.current = pageId;
  yPagesRef.current = yPages;
  canDrawRef.current = canDraw;

  // ── 1. fabric 초기화 (마운트 시 1회) ──────────────────────────────────
  useEffect(() => {
    const el = canvasElRef.current;
    if (!el) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fabric } = require("fabric") as { fabric: AnyFabric };

    const fc = new fabric.Canvas(el, {
      isDrawingMode: false,
      selection: false,
      backgroundColor: "#ffffff",
    });
    fabricRef.current = fc;

    // fabric → Yjs: 자유곡선 완료
    // ※ pageIdRef / yPagesRef 로 항상 최신 값 참조 (stale closure 방지)
    const onPathCreated = (e: { path: AnyFabric }) => {
      const path = e.path;
      const id = uuidv4();
      path.data = { id };

      // fabric의 path 배열을 SVG path 문자열로 변환 (Q, C 등 곡선 명령 포함)
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

    // fabric → Yjs: object 수정
    const onObjectModified = (e: { target: AnyFabric }) => {
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

    // fabric selection → PropertyPanel 연동 + 선택된 요소의 속성을 스토어에 동기화
    const onSelectionCreated = (e: { selected: AnyFabric[] }) => {
      const obj = e.selected?.[0];
      if (!obj?.data?.id) return;
      const yArr = yPagesRef.current.get(pageIdRef.current);
      const found = yArr?.toArray().find((el) => el.id === obj.data.id) ?? null;
      const store = useCanvasStore.getState();
      store.setSelectedElement(found);
      // 선택된 요소의 현재 속성을 패널에 표시
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

    fc.on("path:created", onPathCreated);
    fc.on("object:modified", onObjectModified);
    fc.on("selection:created", onSelectionCreated);
    fc.on("selection:updated", onSelectionCreated);
    fc.on("selection:cleared", onSelectionCleared);

    return () => {
      fc.off("path:created", onPathCreated);
      fc.off("object:modified", onObjectModified);
      fc.off("selection:created", onSelectionCreated);
      fc.off("selection:updated", onSelectionCreated);
      fc.off("selection:cleared", onSelectionCleared);
      fc.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasElRef]);

  // ── 2. 페이지 전환 시 캔버스 내용 교체 ────────────────────────────────
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fabric } = require("fabric") as { fabric: AnyFabric };

    const bgColor = (yMeta.get("backgroundColor") as string) ?? "#ffffff";
    fc.clear();
    fc.setBackgroundImage(null as AnyFabric, () => {});
    fc.backgroundColor = bgColor;

    const elements = yPages.get(pageId)?.toArray() ?? [];
    loadPage(fabric, fc, elements, bgColor);

    // 페이지 전환 후 현재 도구 상태 적용 — Effect 5가 재실행되지 않아 selectable: false 그대로 남는 문제 해결
    const currentTool = useCanvasStore.getState().tool;
    const draw = canDrawRef.current;
    fc.isDrawingMode = draw && currentTool === "pen";
    fc.selection = draw && currentTool === "select";
    fc.getObjects().forEach((obj: AnyFabric) => {
      obj.selectable = draw && currentTool === "select";
      obj.evented = draw;
    });

    // PDF 배경 이미지 로드
    const bgImageUrl = yMeta.get(`bgImage:${pageId}`) as string | undefined;
    if (bgImageUrl) {
      loadBackgroundImage(fabric, fc, bgImageUrl);
    }
  }, [pageId, yPages, yMeta]);

  // ── 3. Yjs 변경 → fabric 부분 업데이트 (원격 변경만) ─────────────────
  useEffect(() => {
    const yArr = yPages.get(pageId);
    if (!yArr) return;

    const handler = (_: Y.YArrayEvent<CanvasElement>, tx: Y.Transaction) => {
      if (tx.origin === "local") return;
      const fc = fabricRef.current;
      if (!fc) return;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { fabric } = require("fabric") as { fabric: AnyFabric };
      patchCanvas(fabric, fc, yArr.toArray());
    };

    yArr.observe(handler);
    return () => yArr.unobserve(handler);
  }, [pageId, yPages]);

  // ── 4. 배경색 변경 동기화 ─────────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      const fc = fabricRef.current;
      if (!fc) return;
      const bg = (yMeta.get("backgroundColor") as string) ?? "#ffffff";
      fc.backgroundColor = bg;
      fc.renderAll();
    };
    yMeta.observe(handler);
    // 현재 값 즉시 반영
    handler();
    return () => yMeta.unobserve(handler);
  }, [yMeta]);

  // ── 5. 도구/권한 변경 → fabric 설정 반영 ─────────────────────────────
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;

    fc.isDrawingMode = canDraw && tool === "pen";
    fc.selection = canDraw && tool === "select";

    if (fc.isDrawingMode && fc.freeDrawingBrush) {
      fc.freeDrawingBrush.color = strokeColor;
      fc.freeDrawingBrush.width = strokeWidth;
    }

    fc.getObjects().forEach((obj: AnyFabric) => {
      obj.selectable = canDraw && tool === "select";
      obj.evented = canDraw;
    });
    fc.renderAll();
  }, [tool, strokeColor, strokeWidth, canDraw]);

  // ── 도형 추가 API ──────────────────────────────────────────────────────

  const addRect = useCallback(
    (point: Point) => {
      if (!canDraw) return;
      const fc = fabricRef.current;
      if (!fc) return;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { fabric } = require("fabric") as { fabric: AnyFabric };
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
      const { fabric } = require("fabric") as { fabric: AnyFabric };
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
      const { fabric } = require("fabric") as { fabric: AnyFabric };
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
      const { fabric } = require("fabric") as { fabric: AnyFabric };
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
        // 편집 완료 후 선택 도구로 전환
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
      const { fabric } = require("fabric") as { fabric: AnyFabric };
      const id = uuidv4();

      fabric.Image.fromURL(src, (img: AnyFabric) => {
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

      // fabric 객체 시각적 업데이트
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

      // Yjs 업데이트 (spread로 기존 요소 복사 후 변경)
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

  // 스토어에 applyToSelected 등록 (PropertyPanel에서 호출)
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
    const idsToDelete = new Set<string>(active.map((obj: AnyFabric) => obj.data?.id));

    ydoc.transact(() => {
      for (let i = elements.length - 1; i >= 0; i--) {
        if (idsToDelete.has(elements[i].id)) yArr.delete(i, 1);
      }
    }, "local");

    active.forEach((obj: AnyFabric) => fc.remove(obj));
    fc.discardActiveObject();
    fc.renderAll();
  }, [canDraw, ydoc]);

  const resizeTo = useCallback((width: number, height: number) => {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.setWidth(width);
    fc.setHeight(height);
    fc.renderAll();
  }, []);

  const getFabricCanvas = useCallback(() => fabricRef.current, []);

  return { getFabricCanvas, addRect, addEllipse, addLine, addTextBox, addImage, deleteSelected, resizeTo };
}

// ── 내부 헬퍼 ──────────────────────────────────────────────────────────────

function loadPage(fabric: AnyFabric, fc: AnyFabric, elements: CanvasElement[], bgColor: string) {
  fc.backgroundColor = bgColor;
  elements.forEach((el) => {
    if (el.type === "image") {
      fabric.Image.fromURL(el.src, (img: AnyFabric) => {
        img.set({
          left: el.left, top: el.top,
          scaleX: el.scaleX, scaleY: el.scaleY, angle: el.angle,
          data: { id: el.id }, selectable: false, evented: false,
        });
        fc.add(img);
        fc.renderAll();
      });
    } else {
      const obj = deserialize(fabric, el);
      if (obj) fc.add(obj);
    }
  });
  fc.renderAll();
}

function patchCanvas(fabric: AnyFabric, fc: AnyFabric, elements: CanvasElement[]) {
  const existingMap = new Map<string, AnyFabric>();
  fc.getObjects().forEach((obj: AnyFabric) => {
    const id: string = obj.data?.id;
    if (id) existingMap.set(id, obj);
  });

  const newIds = new Set(elements.map((e) => e.id));

  for (const [id, obj] of existingMap) {
    if (!newIds.has(id)) fc.remove(obj);
  }

  elements.forEach((el) => {
    if (!existingMap.has(el.id)) {
      if (el.type === "image") {
        fabric.Image.fromURL(el.src, (img: AnyFabric) => {
          img.set({
            left: el.left, top: el.top,
            scaleX: el.scaleX, scaleY: el.scaleY, angle: el.angle,
            data: { id: el.id }, selectable: false, evented: false,
          });
          fc.add(img);
          fc.renderAll();
        });
      } else {
        const obj = deserialize(fabric, el);
        if (obj) fc.add(obj);
      }
    } else {
      applyUpdate(existingMap.get(el.id), el);
    }
  });

  fc.renderAll();
}

function deserialize(fabric: AnyFabric, el: CanvasElement): AnyFabric | null {
  const base = { data: { id: el.id }, selectable: false, evented: false };
  switch (el.type) {
    case "pen": {
      if (!el.pathData) return null;
      return new fabric.Path(el.pathData, {
        ...base, stroke: el.strokeColor, strokeWidth: el.strokeWidth,
        fill: "transparent", strokeLineCap: "round", strokeLineJoin: "round",
      });
    }
    case "line":
      return new fabric.Line([el.start.x, el.start.y, el.end.x, el.end.y], {
        ...base, stroke: el.strokeColor, strokeWidth: el.strokeWidth,
      });
    case "rect":
      return new fabric.Rect({
        ...base, left: el.x, top: el.y, width: el.width, height: el.height,
        fill: el.fillColor ?? "transparent", stroke: el.strokeColor,
        strokeWidth: el.strokeWidth, angle: el.angle,
      });
    case "ellipse":
      return new fabric.Ellipse({
        ...base, left: el.cx - el.rx, top: el.cy - el.ry, rx: el.rx, ry: el.ry,
        fill: el.fillColor ?? "transparent", stroke: el.strokeColor,
        strokeWidth: el.strokeWidth, angle: el.angle,
      });
    case "text":
      return new fabric.Textbox(el.content, {
        ...base, left: el.left, top: el.top, width: el.width,
        fontSize: el.fontSize, fontWeight: el.fontWeight, textAlign: el.align,
        fill: el.color, angle: el.angle,
      });
    default:
      return null;
  }
}

function applyUpdate(obj: AnyFabric, el: CanvasElement) {
  if (!obj) return;
  switch (el.type) {
    case "rect": obj.set({ left: el.x, top: el.y, width: el.width, height: el.height, angle: el.angle }); break;
    case "ellipse": obj.set({ left: el.cx - el.rx, top: el.cy - el.ry, rx: el.rx, ry: el.ry, angle: el.angle }); break;
    case "text": obj.set({ text: el.content, left: el.left, top: el.top, width: el.width, angle: el.angle }); break;
    case "image": obj.set({ left: el.left, top: el.top, scaleX: el.scaleX, scaleY: el.scaleY, angle: el.angle }); break;
  }
  obj.setCoords?.();
}

function serializeObject(obj: AnyFabric, existing: CanvasElement): CanvasElement {
  const base = { id: existing.id, strokeColor: existing.strokeColor, strokeWidth: existing.strokeWidth, createdBy: existing.createdBy };
  switch (existing.type) {
    case "rect": return {
      ...base, type: "rect",
      x: obj.left ?? 0, y: obj.top ?? 0,
      width: (obj.width ?? 0) * (obj.scaleX ?? 1),
      height: (obj.height ?? 0) * (obj.scaleY ?? 1),
      fillColor: (existing as RectElement).fillColor, angle: obj.angle ?? 0,
    };
    case "ellipse": return {
      ...base, type: "ellipse",
      // cx/cy = 바운딩박스 좌상단(left/top) + 시각적 반지름(rx * scaleX)
      cx: (obj.left ?? 0) + (obj.rx ?? 0) * (obj.scaleX ?? 1),
      cy: (obj.top ?? 0) + (obj.ry ?? 0) * (obj.scaleY ?? 1),
      rx: (obj.rx ?? 0) * (obj.scaleX ?? 1),
      ry: (obj.ry ?? 0) * (obj.scaleY ?? 1),
      fillColor: (existing as EllipseElement).fillColor, angle: obj.angle ?? 0,
    };
    case "text": return {
      ...base, type: "text",
      left: obj.left ?? 0, top: obj.top ?? 0, width: obj.width ?? 200,
      content: obj.text ?? "", fontSize: obj.fontSize ?? 16,
      fontWeight: obj.fontWeight ?? "normal", align: obj.textAlign ?? "left",
      color: obj.fill ?? "#000000", angle: obj.angle ?? 0,
    };
    case "image": return {
      ...base, type: "image",
      left: obj.left ?? 0, top: obj.top ?? 0,
      width: obj.width ?? 0, height: obj.height ?? 0,
      src: (existing as ImageElement).src, hash: (existing as ImageElement).hash,
      scaleX: obj.scaleX ?? 1, scaleY: obj.scaleY ?? 1, angle: obj.angle ?? 0,
    };
    case "line": return {
      ...base, type: "line",
      start: { x: obj.x1 ?? 0, y: obj.y1 ?? 0 },
      end: { x: obj.x2 ?? 0, y: obj.y2 ?? 0 },
    };
    default: return existing;
  }
}

/**
 * fabric.js의 path 배열을 SVG path 문자열로 변환
 * 예: [["M",10,20],["Q",15,25,20,30]] → "M 10 20 Q 15 25 20 30"
 * Q, C 등 곡선 명령이 그대로 보존됨
 */
function serializeFabricPath(pathArray: AnyFabric[][]): string {
  return (pathArray ?? []).map((cmd) => cmd.join(" ")).join(" ");
}

/**
 * PDF 배경 이미지를 캔버스 크기에 맞게 stretch해서 배경으로 설정
 * 필기 객체 아래에 위치하며 선택/이동 불가
 */
function loadBackgroundImage(fabric: AnyFabric, fc: AnyFabric, url: string) {
  fabric.Image.fromURL(url, (img: AnyFabric) => {
    if (!img || !img.width || !img.height) return;
    img.set({ selectable: false, evented: false });
    fc.setBackgroundImage(img, fc.renderAll.bind(fc), {
      scaleX: fc.width / img.width,
      scaleY: fc.height / img.height,
    });
  });
}

/**
 * fabricCanvas.utils.ts
 * fabric.js ↔ Yjs 직렬화/역직렬화 헬퍼 함수 모음
 * hooks에서 직접 호출되며 React에 의존하지 않는 순수 함수들
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FabricInstance = any;

import type {
  CanvasElement,
  RectElement,
  EllipseElement,
  TextElement,
  ImageElement,
} from "@whiteboard/types";

/** 페이지의 모든 요소를 fabric 캔버스에 로드 */
export function loadPage(
  fabric: FabricInstance,
  fc: FabricInstance,
  elements: CanvasElement[],
  bgColor: string,
) {
  fc.backgroundColor = bgColor;
  elements.forEach((el) => {
    if (el.type === "image") {
      fabric.Image.fromURL(el.src, (img: FabricInstance) => {
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

/** 원격 Yjs 업데이트를 받아 캔버스에 최소한의 diff 패치 적용 */
export function patchCanvas(
  fabric: FabricInstance,
  fc: FabricInstance,
  elements: CanvasElement[],
) {
  const existingMap = new Map<string, FabricInstance>();
  fc.getObjects().forEach((obj: FabricInstance) => {
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
        fabric.Image.fromURL(el.src, (img: FabricInstance) => {
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

/** CanvasElement → fabric 객체 역직렬화 */
export function deserialize(fabric: FabricInstance, el: CanvasElement): FabricInstance | null {
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

/** fabric 객체의 위치/크기만 갱신 (원격 수정 반영) */
export function applyUpdate(obj: FabricInstance, el: CanvasElement) {
  if (!obj) return;
  switch (el.type) {
    case "rect":
      obj.set({ left: el.x, top: el.y, width: el.width, height: el.height, angle: el.angle });
      break;
    case "ellipse":
      obj.set({ left: el.cx - el.rx, top: el.cy - el.ry, rx: el.rx, ry: el.ry, angle: el.angle });
      break;
    case "text":
      obj.set({ text: el.content, left: el.left, top: el.top, width: el.width, angle: el.angle });
      break;
    case "image":
      obj.set({ left: el.left, top: el.top, scaleX: el.scaleX, scaleY: el.scaleY, angle: el.angle });
      break;
  }
  obj.setCoords?.();
}

/** fabric 객체 → CanvasElement 직렬화 (로컬 수정 저장) */
export function serializeObject(obj: FabricInstance, existing: CanvasElement): CanvasElement {
  const base = {
    id: existing.id,
    strokeColor: existing.strokeColor,
    strokeWidth: existing.strokeWidth,
    createdBy: existing.createdBy,
  };
  switch (existing.type) {
    case "rect":
      return {
        ...base, type: "rect",
        x: obj.left ?? 0, y: obj.top ?? 0,
        width: (obj.width ?? 0) * (obj.scaleX ?? 1),
        height: (obj.height ?? 0) * (obj.scaleY ?? 1),
        fillColor: (existing as RectElement).fillColor,
        angle: obj.angle ?? 0,
      };
    case "ellipse":
      return {
        ...base, type: "ellipse",
        cx: (obj.left ?? 0) + (obj.rx ?? 0) * (obj.scaleX ?? 1),
        cy: (obj.top ?? 0) + (obj.ry ?? 0) * (obj.scaleY ?? 1),
        rx: (obj.rx ?? 0) * (obj.scaleX ?? 1),
        ry: (obj.ry ?? 0) * (obj.scaleY ?? 1),
        fillColor: (existing as EllipseElement).fillColor,
        angle: obj.angle ?? 0,
      };
    case "text":
      return {
        ...base, type: "text",
        left: obj.left ?? 0, top: obj.top ?? 0, width: obj.width ?? 200,
        content: obj.text ?? "", fontSize: obj.fontSize ?? 16,
        fontWeight: obj.fontWeight ?? "normal", align: obj.textAlign ?? "left",
        color: obj.fill ?? "#000000", angle: obj.angle ?? 0,
      };
    case "image":
      return {
        ...base, type: "image",
        left: obj.left ?? 0, top: obj.top ?? 0,
        width: obj.width ?? 0, height: obj.height ?? 0,
        src: (existing as ImageElement).src, hash: (existing as ImageElement).hash,
        scaleX: obj.scaleX ?? 1, scaleY: obj.scaleY ?? 1, angle: obj.angle ?? 0,
      };
    case "line":
      return {
        ...base, type: "line",
        start: { x: obj.x1 ?? 0, y: obj.y1 ?? 0 },
        end: { x: obj.x2 ?? 0, y: obj.y2 ?? 0 },
      };
    default:
      return existing;
  }
}

/**
 * fabric.js의 path 배열을 SVG path 문자열로 변환
 * 예: [["M",10,20],["Q",15,25,20,30]] → "M 10 20 Q 15 25 20 30"
 */
export function serializeFabricPath(pathArray: FabricInstance[][]): string {
  return (pathArray ?? []).map((cmd) => cmd.join(" ")).join(" ");
}

/**
 * PDF 배경 이미지를 캔버스 크기에 맞게 stretch해서 배경으로 설정
 */
export function loadBackgroundImage(fabric: FabricInstance, fc: FabricInstance, url: string) {
  fabric.Image.fromURL(url, (img: FabricInstance) => {
    if (!img || !img.width || !img.height) return;
    img.set({ selectable: false, evented: false });
    fc.setBackgroundImage(img, fc.renderAll.bind(fc), {
      scaleX: fc.width / img.width,
      scaleY: fc.height / img.height,
    });
  });
}

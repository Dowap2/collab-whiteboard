import { create } from "zustand";
import type { ToolType, CanvasElement } from "@whiteboard/types";

export type PropertyChanges = {
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string | null; // null = 투명(없음), undefined = 변경 안 함
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  textAlign?: "left" | "center" | "right";
};

interface CanvasStore {
  // 도구
  tool: ToolType;
  strokeColor: string;
  strokeWidth: number;
  fillColor: string | undefined;
  fontSize: number;
  fontWeight: "normal" | "bold";
  textAlign: "left" | "center" | "right";

  // 선택된 element (PropertyPanel 연동)
  selectedElement: CanvasElement | null;

  // 선택된 fabric 객체에 속성을 직접 적용하는 함수 (useFabricCanvas에서 등록)
  _applyToSelected: ((changes: PropertyChanges) => void) | null;

  setTool: (tool: ToolType) => void;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setFillColor: (color: string | undefined) => void;
  setFontSize: (size: number) => void;
  setFontWeight: (weight: "normal" | "bold") => void;
  setTextAlign: (align: "left" | "center" | "right") => void;
  setSelectedElement: (el: CanvasElement | null) => void;
  setApplyToSelected: (fn: ((changes: PropertyChanges) => void) | null) => void;

  // store 값 업데이트 + 선택된 객체에 즉시 반영
  applyToSelectedChanges: (changes: PropertyChanges) => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  tool: "pen",
  strokeColor: "#000000",
  strokeWidth: 2,
  fillColor: undefined,
  fontSize: 20,
  fontWeight: "normal",
  textAlign: "left",
  selectedElement: null,
  _applyToSelected: null,

  setTool: (tool) => set({ tool }),
  setStrokeColor: (color) => set({ strokeColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setFillColor: (color) => set({ fillColor: color }),
  setFontSize: (size) => set({ fontSize: size }),
  setFontWeight: (weight) => set({ fontWeight: weight }),
  setTextAlign: (align) => set({ textAlign: align }),
  setSelectedElement: (el) => set({ selectedElement: el }),
  setApplyToSelected: (fn) => set({ _applyToSelected: fn }),

  applyToSelectedChanges: (changes) => {
    // store 값 업데이트
    const updates: Partial<CanvasStore> = {};
    if (changes.strokeColor !== undefined) updates.strokeColor = changes.strokeColor;
    if (changes.strokeWidth !== undefined) updates.strokeWidth = changes.strokeWidth;
    if (changes.fillColor !== undefined) updates.fillColor = changes.fillColor ?? undefined;
    if (changes.fontSize !== undefined) updates.fontSize = changes.fontSize;
    if (changes.fontWeight !== undefined) updates.fontWeight = changes.fontWeight;
    if (changes.textAlign !== undefined) updates.textAlign = changes.textAlign;
    set(updates);
    // 선택된 fabric 객체에 즉시 반영
    get()._applyToSelected?.(changes);
  },
}));

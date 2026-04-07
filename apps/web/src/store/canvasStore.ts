import { create } from "zustand";
import type { ToolType } from "@whiteboard/types";

interface CanvasStore {
  tool: ToolType;
  strokeColor: string;
  strokeWidth: number;
  fillColor: string | undefined;

  setTool: (tool: ToolType) => void;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setFillColor: (color: string | undefined) => void;
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  tool: "pen",
  strokeColor: "#ffffff",
  strokeWidth: 2,
  fillColor: undefined,

  setTool: (tool) => set({ tool }),
  setStrokeColor: (color) => set({ strokeColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setFillColor: (color) => set({ fillColor: color }),
}));

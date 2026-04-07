export type ToolType = "pen" | "line" | "rect" | "ellipse" | "text" | "eraser" | "select";

export interface Point {
  x: number;
  y: number;
}

export interface BaseElement {
  id: string;
  type: ToolType;
  strokeColor: string;
  strokeWidth: number;
  createdBy: string;
}

export interface PenElement extends BaseElement {
  type: "pen";
  points: Point[];
}

export interface LineElement extends BaseElement {
  type: "line";
  start: Point;
  end: Point;
}

export interface RectElement extends BaseElement {
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor?: string;
}

export interface EllipseElement extends BaseElement {
  type: "ellipse";
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  fillColor?: string;
}

export interface TextElement extends BaseElement {
  type: "text";
  x: number;
  y: number;
  content: string;
  fontSize: number;
}

export type CanvasElement =
  | PenElement
  | LineElement
  | RectElement
  | EllipseElement
  | TextElement;

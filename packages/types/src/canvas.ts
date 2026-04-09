export type ToolType =
  | "select"
  | "pen"
  | "line"
  | "rect"
  | "ellipse"
  | "text"
  | "image"
  | "eraser"
  | "laser";

export type PageSize = "A4" | "16:9" | "4:3";

export interface Point {
  x: number;
  y: number;
}

export interface Page {
  id: string;
  index: number;
  size: PageSize;
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
  /** fabric.js Path의 SVG path 문자열 (M, L, Q, C 등 곡선 명령 포함) */
  pathData: string;
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
  angle: number;
}

export interface EllipseElement extends BaseElement {
  type: "ellipse";
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  fillColor?: string;
  angle: number;
}

export interface TextElement extends BaseElement {
  type: "text";
  left: number;
  top: number;
  width: number;
  content: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  align: "left" | "center" | "right";
  color: string;
  angle: number;
}

export interface ImageElement extends BaseElement {
  type: "image";
  left: number;
  top: number;
  width: number;
  height: number;
  src: string;
  hash: string;
  scaleX: number;
  scaleY: number;
  angle: number;
}

export type CanvasElement =
  | PenElement
  | LineElement
  | RectElement
  | EllipseElement
  | TextElement
  | ImageElement;

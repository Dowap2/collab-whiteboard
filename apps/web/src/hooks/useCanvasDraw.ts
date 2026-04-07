"use client";

import { useRef, useCallback } from "react";
import * as Y from "yjs";
import { v4 as uuidv4 } from "uuid";
import { useCanvasStore } from "@/store/canvasStore";
import type { CanvasElement, PenElement, Point } from "@whiteboard/types";

export function useCanvasDraw(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  ydoc: Y.Doc,
  yElements: Y.Array<CanvasElement>,
  participantId: string,
) {
  const isDrawing = useRef(false);
  const currentId = useRef<string | null>(null);
  const { tool, strokeColor, strokeWidth } = useCanvasStore();

  const getCtx = useCallback(() => canvasRef.current?.getContext("2d") ?? null, [canvasRef]);

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const el of yElements.toArray()) {
      drawElement(ctx, el);
    }
  }, [canvasRef, getCtx, yElements]);

  const startDrawing = useCallback(
    (point: Point) => {
      if (tool === "select") return;
      isDrawing.current = true;
      const id = uuidv4();
      currentId.current = id;

      if (tool === "pen") {
        const el: PenElement = {
          id,
          type: "pen",
          strokeColor,
          strokeWidth,
          createdBy: participantId,
          points: [point],
        };
        ydoc.transact(() => yElements.push([el]), "local");
      }
    },
    [tool, strokeColor, strokeWidth, participantId, ydoc, yElements],
  );

  const continueDrawing = useCallback(
    (point: Point) => {
      if (!isDrawing.current || !currentId.current) return;
      if (tool !== "pen") return;

      const elements = yElements.toArray();
      const idx = elements.findIndex((el) => el.id === currentId.current);
      if (idx === -1) return;

      const el = elements[idx] as PenElement;
      // Yjs Map을 쓰지 않고 Array 방식 유지하되, 단일 transact으로 처리
      const updated: PenElement = { ...el, points: [...el.points, point] };
      ydoc.transact(() => {
        yElements.delete(idx, 1);
        yElements.insert(idx, [updated]);
      }, "local");
    },
    [tool, ydoc, yElements],
  );

  const stopDrawing = useCallback(() => {
    isDrawing.current = false;
    currentId.current = null;
  }, []);

  return { startDrawing, continueDrawing, stopDrawing, redrawAll };
}

function drawElement(ctx: CanvasRenderingContext2D, el: CanvasElement) {
  ctx.save();
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (el.type) {
    case "pen": {
      const { points } = el;
      if (points.length === 0) break;
      if (points.length === 1) {
        ctx.beginPath();
        ctx.arc(points[0].x, points[0].y, el.strokeWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = el.strokeColor;
        ctx.fill();
        break;
      }
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      break;
    }
    case "line": {
      ctx.beginPath();
      ctx.moveTo(el.start.x, el.start.y);
      ctx.lineTo(el.end.x, el.end.y);
      ctx.stroke();
      break;
    }
    case "rect": {
      if (el.fillColor) {
        ctx.fillStyle = el.fillColor;
        ctx.fillRect(el.x, el.y, el.width, el.height);
      }
      ctx.strokeRect(el.x, el.y, el.width, el.height);
      break;
    }
    case "ellipse": {
      ctx.beginPath();
      ctx.ellipse(el.cx, el.cy, el.rx, el.ry, 0, 0, Math.PI * 2);
      if (el.fillColor) {
        ctx.fillStyle = el.fillColor;
        ctx.fill();
      }
      ctx.stroke();
      break;
    }
    case "text": {
      ctx.font = `${el.fontSize}px sans-serif`;
      ctx.fillStyle = el.strokeColor;
      ctx.fillText(el.content, el.x, el.y);
      break;
    }
  }

  ctx.restore();
}

"use client";

import { useRef, useEffect, useCallback } from "react";
import { css } from "@emotion/css";
import { useCanvasStore } from "@/store/canvasStore";
import { useYjsCanvas } from "@/hooks/useYjsCanvas";
import { useCanvasDraw } from "@/hooks/useCanvasDraw";
import { getSocket } from "@/lib/socket";

interface Props {
  roomId: string;
  participantId: string;
}

export function Canvas({ roomId, participantId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { tool } = useCanvasStore();

  const { ydoc, yElements } = useYjsCanvas(roomId);
  const { startDrawing, continueDrawing, stopDrawing, redrawAll } = useCanvasDraw(
    canvasRef,
    ydoc,
    yElements,
    participantId,
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      redrawAll();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [redrawAll]);

  useEffect(() => {
    const handler = () => redrawAll();
    yElements.observe(handler);
    return () => yElements.unobserve(handler);
  }, [yElements, redrawAll]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      startDrawing({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    },
    [startDrawing],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      continueDrawing({ x, y });

      getSocket().emit("cursor:move", {
        roomId,
        participantId,
        position: { x, y },
      } as never);
    },
    [continueDrawing, roomId, participantId],
  );

  const handleMouseUp = useCallback(() => stopDrawing(), [stopDrawing]);

  const cursor =
    tool === "pen" ? "crosshair"
    : tool === "eraser" ? "cell"
    : tool === "text" ? "text"
    : tool === "select" ? "default"
    : "crosshair";

  return (
    <div ref={containerRef} className={styles.container}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        style={{ cursor }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}

const styles = {
  container: css`
    width: 100%;
    height: 100%;
    background: #1a1a2e;
    position: relative;
  `,
  canvas: css`
    display: block;
    width: 100%;
    height: 100%;
  `,
};

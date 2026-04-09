"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { css } from "@emotion/css";
import * as Y from "yjs";
import { getSocket } from "@/lib/socket";
import { useCanvasStore } from "@/store/canvasStore";
import { useFabricCanvas } from "@/hooks/useFabricCanvas";
import { CursorOverlay } from "./CursorOverlay";
import type { CanvasElement, PageSize, Point } from "@whiteboard/types";

const PAGE_SIZES: Record<PageSize, { width: number; height: number }> = {
  "A4":   { width: 794,  height: 1123 },
  "16:9": { width: 1280, height: 720  },
  "4:3":  { width: 1024, height: 768  },
};

const BG_COLORS = [
  { color: "#ffffff", label: "흰색" },
  { color: "#fef9f0", label: "크림" },
  { color: "#f0f4ff", label: "하늘" },
  { color: "#f0fff4", label: "연두" },
  { color: "#1a1a2e", label: "다크" },
  { color: "#111827", label: "블랙" },
];

interface Props {
  roomId: string;
  participantId: string;
  pageId: string;
  yPages: Y.Map<Y.Array<CanvasElement>>;
  yMeta: Y.Map<string>;
  ydoc: Y.Doc;
  isTeacher: boolean;
  drawPermission: "teacher-only" | "all";
}

export function FabricCanvas({
  roomId,
  participantId,
  pageId,
  yPages,
  yMeta,
  ydoc,
  isTeacher,
  drawPermission,
}: Props) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageClickPointRef = useRef<Point | null>(null);
  const scaleRef = useRef(1);
  const [scale, setScale] = useState(1);

  const { tool } = useCanvasStore();
  const canDraw = isTeacher || drawPermission === "all";

  const [pageSize, setPageSize] = useState<PageSize>(
    () => (yMeta.get("pageSize") as PageSize) ?? "A4",
  );
  const [backgroundColor, setBackgroundColor] = useState<string>(
    () => (yMeta.get("backgroundColor") as string) ?? "#ffffff",
  );

  // yMeta 구독 (pageSize, backgroundColor)
  useEffect(() => {
    const handler = () => {
      const s = yMeta.get("pageSize") as PageSize;
      if (s) setPageSize(s);
      const bg = yMeta.get("backgroundColor") as string;
      if (bg) setBackgroundColor(bg);
    };
    handler();
    yMeta.observe(handler);
    return () => yMeta.unobserve(handler);
  }, [yMeta]);

  const { width: canvasW, height: canvasH } = PAGE_SIZES[pageSize];

  const { addRect, addEllipse, addLine, addTextBox, addImage, deleteSelected, resizeTo } =
    useFabricCanvas({
      canvasElRef,
      pageId,
      yPages,
      yMeta,
      ydoc,
      participantId,
      isTeacher,
      drawPermission,
    });

  // 고정 크기 적용
  useEffect(() => {
    resizeTo(canvasW, canvasH);
  }, [resizeTo, canvasW, canvasH]);

  // canvasWrapper 크기에 맞게 scale 계산 (스크롤바 없이 fit-to-viewport)
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const update = (width: number, height: number) => {
      const padding = 48; // 24px * 2
      const s = Math.min(
        (width - padding) / canvasW,
        (height - padding) / canvasH,
        1, // 뷰포트가 캔버스보다 크면 1:1 유지
      );
      const clamped = Math.max(s, 0.1);
      scaleRef.current = clamped;
      setScale(clamped);
    };

    // 초기값
    update(wrapper.clientWidth, wrapper.clientHeight);

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      update(width, height);
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [canvasW, canvasH]);

  // 화면 좌표 → canvas 내부 좌표 (CSS scale 보정)
  const getPoint = useCallback((e: React.MouseEvent): Point => {
    const rect = canvasElRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left) / scaleRef.current,
      y: (e.clientY - rect.top) / scaleRef.current,
    };
  }, []);

  const lineStartRef = useRef<Point | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!canDraw) return;
      const point = getPoint(e);
      if (tool === "rect") addRect(point);
      else if (tool === "ellipse") addEllipse(point);
      else if (tool === "line") lineStartRef.current = point;
      else if (tool === "text") addTextBox(point);
      else if (tool === "image") {
        imageClickPointRef.current = point;
        fileInputRef.current?.click();
      }
    },
    [canDraw, tool, getPoint, addRect, addEllipse, addTextBox],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (tool === "line" && lineStartRef.current) {
        addLine(lineStartRef.current, getPoint(e));
        lineStartRef.current = null;
      }
    },
    [tool, getPoint, addLine],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasElRef.current?.getBoundingClientRect();
      if (!rect) return;
      getSocket().emit("cursor:move", {
        roomId,
        participantId,
        position: {
          x: (e.clientX - rect.left) / scaleRef.current,
          y: (e.clientY - rect.top) / scaleRef.current,
        },
        isLaser: tool === "laser",
      });
    },
    [roomId, participantId, tool],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && tool === "select") {
        deleteSelected();
      }
    },
    [tool, deleteSelected],
  );

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      const point = imageClickPointRef.current ?? { x: 100, y: 100 };
      imageClickPointRef.current = null;

      const formData = new FormData();
      formData.append("file", file);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
      const res = await fetch(`${apiUrl}/upload`, { method: "POST", body: formData });
      const { url, hash } = await res.json() as { url: string; hash: string };
      addImage(`${apiUrl}${url}`, hash, point);
    },
    [addImage],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      if (!canDraw) return;
      const file = e.dataTransfer.files[0];
      if (!file?.type.startsWith("image/")) return;

      const rect = canvasElRef.current?.getBoundingClientRect();
      const point: Point = rect
        ? {
            x: (e.clientX - rect.left) / scaleRef.current,
            y: (e.clientY - rect.top) / scaleRef.current,
          }
        : { x: 0, y: 0 };

      const formData = new FormData();
      formData.append("file", file);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
      const res = await fetch(`${apiUrl}/upload`, { method: "POST", body: formData });
      const { url, hash } = await res.json() as { url: string; hash: string };
      addImage(`${apiUrl}${url}`, hash, point);
    },
    [canDraw, addImage],
  );

  const cursor =
    tool === "pen" ? "crosshair"
    : tool === "eraser" ? "cell"
    : tool === "text" ? "text"
    : tool === "select" ? "default"
    : tool === "laser" ? "none"
    : "crosshair";

  return (
    <div className={styles.viewport}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileInput}
      />

      {/* overflow: hidden으로 스크롤바 없이 scale로 캔버스 크기 맞춤 */}
      <div ref={wrapperRef} className={styles.canvasWrapper}>
        <div
          className={styles.canvasArea}
          style={{ transform: `scale(${scale})`, cursor }}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { lineStartRef.current = null; }}
        >
          <canvas
            ref={canvasElRef}
            width={canvasW}
            height={canvasH}
            className={styles.canvas}
            style={{ width: canvasW, height: canvasH }}
          />
          <CursorOverlay />
        </div>
      </div>

      {/* 하단 컨트롤 (teacher only) */}
      {isTeacher && (
        <div className={styles.bottomControls}>
          {/* 페이지 크기 */}
          <div className={styles.controlGroup}>
            {(["A4", "16:9", "4:3"] as PageSize[]).map((s) => (
              <button
                key={s}
                className={`${styles.controlBtn} ${pageSize === s ? styles.controlBtnActive : ""}`}
                onClick={() => ydoc.transact(() => yMeta.set("pageSize", s))}
              >
                {s}
              </button>
            ))}
          </div>

          <div className={styles.controlDivider} />

          {/* 배경색 */}
          <div className={styles.controlGroup}>
            <span className={styles.controlLabel}>배경</span>
            {BG_COLORS.map(({ color, label }) => (
              <button
                key={color}
                className={styles.bgColorBtn}
                style={{
                  background: color,
                  border: backgroundColor === color ? "2px solid #2563eb" : "2px solid #374151",
                }}
                title={label}
                onClick={() => ydoc.transact(() => yMeta.set("backgroundColor", color))}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  viewport: css`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #0a0a0f;
    position: relative;
  `,
  canvasWrapper: css`
    flex: 1;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  `,
  canvasArea: css`
    position: relative;
    flex-shrink: 0;
    box-shadow: 0 4px 32px rgba(0,0,0,0.6);
    outline: none;
    transform-origin: center center;
  `,
  canvas: css`
    display: block;
  `,
  bottomControls: css`
    position: absolute;
    bottom: 48px;
    right: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: #111827dd;
    padding: 5px 8px;
    border-radius: 8px;
    backdrop-filter: blur(6px);
    border: 1px solid #1f2937;
  `,
  controlGroup: css`
    display: flex;
    align-items: center;
    gap: 4px;
  `,
  controlLabel: css`
    font-size: 10px;
    color: #6b7280;
    margin-right: 2px;
  `,
  controlDivider: css`
    width: 1px;
    height: 18px;
    background: #374151;
  `,
  controlBtn: css`
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    color: #9ca3af;
    border: 1px solid #374151;
    background: transparent;
    cursor: pointer;
    &:hover { color: #f3f4f6; }
  `,
  controlBtnActive: css`
    background: #2563eb;
    border-color: #2563eb;
    color: #fff;
  `,
  bgColorBtn: css`
    width: 18px;
    height: 18px;
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.1s;
    &:hover { transform: scale(1.2); }
  `,
};

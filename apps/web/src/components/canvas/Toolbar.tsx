"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { css } from "@emotion/css";
import { useCanvasStore } from "@/store/canvasStore";
import type { ToolType } from "@whiteboard/types";

function SvgIcon({ type }: { type: ToolType }) {
  const s = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (type) {
    case "select": return <svg {...s}><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>;
    case "pen": return <svg {...s}><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>;
    case "line": return <svg {...s}><line x1="5" y1="19" x2="19" y2="5"/></svg>;
    case "rect": return <svg {...s}><rect x="3" y="3" width="18" height="18" rx="2"/></svg>;
    case "ellipse": return <svg {...s}><ellipse cx="12" cy="12" rx="10" ry="8"/></svg>;
    case "text": return <svg {...s}><polyline points="4 7 4 4 20 4 20 7"/><line x1="9.5" y1="20" x2="14.5" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>;
    case "image": return <svg {...s}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>;
    case "eraser": return <svg {...s}><path d="M20 20H7l-4-4a1 1 0 010-1.41l9.59-9.59a2 2 0 012.82 0L20 9.59a2 2 0 010 2.82L13 19"/></svg>;
    case "laser": return <svg {...s}><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>;
    default: return null;
  }
}

const TOOLS: { type: ToolType; label: string; shortcut: string }[] = [
  { type: "select",  label: "선택",   shortcut: "V" },
  { type: "pen",     label: "브러쉬", shortcut: "B" },
  { type: "line",    label: "선",     shortcut: "L" },
  { type: "rect",    label: "사각형", shortcut: "U" },
  { type: "ellipse", label: "원",     shortcut: "O" },
  { type: "text",    label: "텍스트", shortcut: "T" },
  { type: "image",   label: "이미지", shortcut: "I" },
  { type: "eraser",  label: "지우개", shortcut: "E" },
  { type: "laser",   label: "레이저", shortcut: "G" },
];

const PALETTE = [
  "#000000", "#ffffff", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#3b82f6", "#8b5cf6",
  "#ec4899", "#6b7280",
];
const WIDTHS = [1, 2, 4, 8];

export function Toolbar() {
  const {
    tool,
    strokeColor,
    strokeWidth,
    fontSize,
    fontWeight,
    textAlign,
    setTool,
    setStrokeColor,
    setStrokeWidth,
    setFontSize,
    setFontWeight,
    setTextAlign,
  } = useCanvasStore();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [hexInput, setHexInput] = useState(strokeColor);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const openPicker = useCallback(() => {
    if (colorBtnRef.current) {
      const rect = colorBtnRef.current.getBoundingClientRect();
      setPopupPos({ top: rect.top, left: rect.right + 8 });
    }
    setPickerOpen((prev) => !prev);
  }, []);

  // 외부 클릭 시 피커 닫기
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popupRef.current && !popupRef.current.contains(target) &&
        colorBtnRef.current && !colorBtnRef.current.contains(target)
      ) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

  // strokeColor 변경 시 hexInput 동기화
  useEffect(() => {
    setHexInput(strokeColor);
  }, [strokeColor]);

  const handleHexSubmit = () => {
    const hex = hexInput.startsWith("#") ? hexInput : `#${hexInput}`;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      setStrokeColor(hex);
    } else {
      setHexInput(strokeColor);
    }
  };

  const pickerPopup = pickerOpen
    ? createPortal(
        <div
          ref={popupRef}
          className={styles.pickerPopup}
          style={{ top: popupPos.top, left: popupPos.left }}
        >
          <div className={styles.paletteGrid}>
            {PALETTE.map((c) => (
              <button
                key={c}
                className={`${styles.colorButton} ${strokeColor === c ? styles.colorActive : ""}`}
                style={{ background: c }}
                onClick={() => setStrokeColor(c)}
                title={c}
              />
            ))}
          </div>
          <div className={styles.pickerDivider} />
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
            className={styles.nativeColorInput}
            title="색상 팔레트"
          />
          <div className={styles.hexRow}>
            <span className={styles.hexLabel}>#</span>
            <input
              type="text"
              className={styles.hexInput}
              value={hexInput.replace("#", "")}
              onChange={(e) => setHexInput(`#${e.target.value}`)}
              onBlur={handleHexSubmit}
              onKeyDown={(e) => { if (e.key === "Enter") handleHexSubmit(); }}
              maxLength={6}
              placeholder="000000"
            />
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className={styles.toolbar}>
      <div className={styles.section}>
        {TOOLS.map((t) => (
          <button
            key={t.type}
            className={`${styles.toolButton} ${tool === t.type ? styles.toolActive : ""}`}
            onClick={() => setTool(t.type)}
            title={`${t.label} (${t.shortcut})`}
          >
            <span className={styles.toolIcon}><SvgIcon type={t.type} /></span>
            <span className={styles.shortcutBadge}>{t.shortcut}</span>
          </button>
        ))}
      </div>

      <div className={styles.divider} />

      {/* 컬러피커 트리거 */}
      <div className={styles.section}>
        <button
          ref={colorBtnRef}
          className={styles.colorPreview}
          style={{ background: strokeColor }}
          onClick={openPicker}
          title="색상 선택"
        />
      </div>

      {pickerPopup}

      <div className={styles.divider} />

      <div className={styles.section}>
        {WIDTHS.map((w) => (
          <button
            key={w}
            className={`${styles.widthButton} ${strokeWidth === w ? styles.widthActive : ""}`}
            onClick={() => setStrokeWidth(w)}
            title={`${w}px`}
          >
            <div className={styles.widthLine} style={{ height: w }} />
          </button>
        ))}
      </div>

      {/* 텍스트 도구 전용 옵션 */}
      {tool === "text" && (
        <>
          <div className={styles.divider} />
          <div className={styles.section}>
            <select
              className={styles.select}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              title="폰트 크기"
            >
              {[12, 16, 20, 24, 32, 48].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              className={`${styles.toolButton} ${fontWeight === "bold" ? styles.toolActive : ""}`}
              onClick={() => setFontWeight(fontWeight === "bold" ? "normal" : "bold")}
              title="굵게"
            >
              B
            </button>
            <button
              className={`${styles.toolButton} ${textAlign === "left" ? styles.toolActive : ""}`}
              onClick={() => setTextAlign("left")}
              title="왼쪽"
            >
              ≡
            </button>
            <button
              className={`${styles.toolButton} ${textAlign === "center" ? styles.toolActive : ""}`}
              onClick={() => setTextAlign("center")}
              title="가운데"
            >
              ☰
            </button>
            <button
              className={`${styles.toolButton} ${textAlign === "right" ? styles.toolActive : ""}`}
              onClick={() => setTextAlign("right")}
              title="오른쪽"
            >
              ≡
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  toolbar: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 8px;
    background: #1a1a1a;
    border-right: 1px solid #2a2a2a;
    width: 52px;
    flex-shrink: 0;
    overflow: hidden;
  `,
  section: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
  `,
  divider: css`
    width: 100%;
    height: 1px;
    background: #2a2a2a;
    margin: 4px 0;
  `,
  toolButton: css`
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    color: #888;
    transition: all 0.15s;
    &:hover { background: #2a2a2a; color: #fff; }
  `,
  toolIcon: css`
    font-size: 15px;
    line-height: 1;
  `,
  shortcutBadge: css`
    position: absolute;
    bottom: 2px;
    right: 3px;
    font-size: 8px;
    color: #555;
    font-family: monospace;
    line-height: 1;
    pointer-events: none;
  `,
  toolActive: css`
    background: #4a9eff22;
    color: #4a9eff;
    &:hover { background: #4a9eff33; color: #4a9eff; }
  `,
  colorPreview: css`
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid #555;
    margin: 0 auto;
    cursor: pointer;
    transition: transform 0.15s;
    &:hover { transform: scale(1.1); border-color: #4a9eff; }
  `,
  pickerPopup: css`
    position: fixed;
    background: #1e1e2e;
    border: 1px solid #374151;
    border-radius: 8px;
    padding: 10px;
    z-index: 9999;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 140px;
  `,
  paletteGrid: css`
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
  `,
  colorButton: css`
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform 0.15s;
    &:hover { transform: scale(1.15); }
  `,
  colorActive: css`
    border-color: #4a9eff;
    transform: scale(1.15);
  `,
  pickerDivider: css`
    height: 1px;
    background: #374151;
  `,
  nativeColorInput: css`
    width: 100%;
    height: 32px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    background: transparent;
    padding: 0;
    &::-webkit-color-swatch-wrapper { padding: 0; }
    &::-webkit-color-swatch { border: 1px solid #374151; border-radius: 4px; }
  `,
  hexRow: css`
    display: flex;
    align-items: center;
    gap: 2px;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 4px;
    padding: 2px 6px;
  `,
  hexLabel: css`
    color: #6b7280;
    font-size: 12px;
    font-family: monospace;
  `,
  hexInput: css`
    flex: 1;
    background: transparent;
    border: none;
    color: #f3f4f6;
    font-size: 12px;
    font-family: monospace;
    outline: none;
    width: 60px;
  `,
  widthButton: css`
    width: 36px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
    &:hover { background: #2a2a2a; }
  `,
  widthActive: css`
    background: #4a9eff22;
  `,
  widthLine: css`
    width: 20px;
    background: #888;
    border-radius: 2px;
  `,
  select: css`
    width: 36px;
    background: #1f2937;
    color: #f3f4f6;
    border: 1px solid #374151;
    border-radius: 4px;
    font-size: 11px;
    padding: 2px 0;
    text-align: center;
  `,
};

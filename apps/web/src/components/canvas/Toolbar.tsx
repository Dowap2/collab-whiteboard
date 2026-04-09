"use client";

import { css } from "@emotion/css";
import { useCanvasStore } from "@/store/canvasStore";
import type { ToolType } from "@whiteboard/types";

const TOOLS: { type: ToolType; label: string; icon: string; shortcut: string }[] = [
  { type: "select",  label: "선택",   icon: "↖",  shortcut: "V" },
  { type: "pen",     label: "펜",     icon: "✏️", shortcut: "P" },
  { type: "line",    label: "선",     icon: "╱",  shortcut: "L" },
  { type: "rect",    label: "사각형", icon: "□",  shortcut: "R" },
  { type: "ellipse", label: "원",     icon: "○",  shortcut: "E" },
  { type: "text",    label: "텍스트", icon: "T",  shortcut: "T" },
  { type: "image",   label: "이미지", icon: "🖼", shortcut: "I" },
  { type: "eraser",  label: "지우개", icon: "⌫",  shortcut: "X" },
  { type: "laser",   label: "레이저", icon: "🔴", shortcut: "G" },
];

const COLORS = [
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
            <span className={styles.toolIcon}>{t.icon}</span>
            <span className={styles.shortcutBadge}>{t.shortcut}</span>
          </button>
        ))}
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        {COLORS.map((c) => (
          <button
            key={c}
            className={`${styles.colorButton} ${strokeColor === c ? styles.colorActive : ""}`}
            style={{ background: c }}
            onClick={() => setStrokeColor(c)}
            title={c}
          />
        ))}
      </div>

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
  colorButton: css`
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid transparent;
    margin: 0 auto;
    transition: transform 0.15s;
    &:hover { transform: scale(1.15); }
  `,
  colorActive: css`
    border-color: #4a9eff;
    transform: scale(1.15);
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

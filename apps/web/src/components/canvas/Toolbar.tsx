"use client";

import { css } from "@emotion/css";
import { useCanvasStore } from "@/store/canvasStore";
import type { ToolType } from "@whiteboard/types";

const TOOLS: { type: ToolType; label: string; icon: string }[] = [
  { type: "select", label: "선택", icon: "↖" },
  { type: "pen", label: "펜", icon: "✏️" },
  { type: "line", label: "선", icon: "╱" },
  { type: "rect", label: "사각형", icon: "□" },
  { type: "ellipse", label: "원", icon: "○" },
  { type: "text", label: "텍스트", icon: "T" },
  { type: "eraser", label: "지우개", icon: "⌫" },
];

const COLORS = ["#ffffff", "#ff6b6b", "#4ecdc4", "#45b7d1", "#ffeaa7", "#96ceb4", "#dda0dd", "#f7dc6f"];
const WIDTHS = [1, 2, 4, 8];

export function Toolbar() {
  const { tool, strokeColor, strokeWidth, setTool, setStrokeColor, setStrokeWidth } = useCanvasStore();

  return (
    <div className={styles.toolbar}>
      <div className={styles.section}>
        {TOOLS.map((t) => (
          <button
            key={t.type}
            className={`${styles.toolButton} ${tool === t.type ? styles.toolActive : ""}`}
            onClick={() => setTool(t.type)}
            title={t.label}
          >
            {t.icon}
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
    align-items: center;
    justify-content: center;
    font-size: 16px;
    color: #888;
    transition: all 0.15s;
    &:hover { background: #2a2a2a; color: #fff; }
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
};

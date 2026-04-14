"use client";

import { css } from "@emotion/css";
import type { ToolType } from "@whiteboard/types";

export const TOOLS: { type: ToolType; label: string; shortcut: string }[] = [
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

function SvgIcon({ type }: { type: ToolType }) {
  const s = {
    width: 18, height: 18, viewBox: "0 0 24 24",
    fill: "none", stroke: "currentColor", strokeWidth: 2,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  };
  switch (type) {
    case "select":  return <svg {...s}><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>;
    case "pen":     return <svg {...s}><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>;
    case "line":    return <svg {...s}><line x1="5" y1="19" x2="19" y2="5"/></svg>;
    case "rect":    return <svg {...s}><rect x="3" y="3" width="18" height="18" rx="2"/></svg>;
    case "ellipse": return <svg {...s}><ellipse cx="12" cy="12" rx="10" ry="8"/></svg>;
    case "text":    return <svg {...s}><polyline points="4 7 4 4 20 4 20 7"/><line x1="9.5" y1="20" x2="14.5" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>;
    case "image":   return <svg {...s}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>;
    case "eraser":  return <svg {...s}><path d="M20 20H7l-4-4a1 1 0 010-1.41l9.59-9.59a2 2 0 012.82 0L20 9.59a2 2 0 010 2.82L13 19"/></svg>;
    case "laser":   return <svg {...s}><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>;
    default:        return null;
  }
}

interface Props {
  activeTool: ToolType;
  onSelect: (tool: ToolType) => void;
}

export function ToolSelector({ activeTool, onSelect }: Props) {
  return (
    <div className={styles.section}>
      {TOOLS.map((t) => (
        <button
          key={t.type}
          className={`${styles.toolButton} ${activeTool === t.type ? styles.toolActive : ""}`}
          onClick={() => onSelect(t.type)}
          title={`${t.label} (${t.shortcut})`}
        >
          <span className={styles.toolIcon}><SvgIcon type={t.type} /></span>
          <span className={styles.shortcutBadge}>{t.shortcut}</span>
        </button>
      ))}
    </div>
  );
}

const styles = {
  section: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
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
};

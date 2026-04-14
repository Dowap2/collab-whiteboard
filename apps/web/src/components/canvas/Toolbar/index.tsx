"use client";

import { css } from "@emotion/css";
import { useCanvasStore } from "@/store/canvasStore";
import { ToolSelector } from "./ToolSelector";
import { ColorPicker } from "./ColorPicker";
import { StrokeSettings } from "./StrokeSettings";

/**
 * Toolbar — 좌측 세로 도구 모음
 *
 * 상태 접근은 여기서만 하고 각 서브 컴포넌트에 props로 전달한다.
 */
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
      <ToolSelector activeTool={tool} onSelect={setTool} />

      <div className={styles.divider} />

      <div className={styles.section}>
        <ColorPicker color={strokeColor} onChange={setStrokeColor} />
      </div>

      <div className={styles.divider} />

      <StrokeSettings
        strokeWidth={strokeWidth}
        onWidthChange={setStrokeWidth}
        showTextOptions={tool === "text"}
        fontSize={fontSize}
        fontWeight={fontWeight}
        textAlign={textAlign}
        onFontSizeChange={setFontSize}
        onFontWeightChange={setFontWeight}
        onTextAlignChange={setTextAlign}
      />
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
};

"use client";

import { css } from "@emotion/css";

const WIDTHS = [1, 2, 4, 8];

interface Props {
  strokeWidth: number;
  onWidthChange: (width: number) => void;
  /** 텍스트 도구 전용 옵션 (tool === "text" 일 때만 렌더) */
  showTextOptions: boolean;
  fontSize: number;
  fontWeight: "normal" | "bold";
  textAlign: "left" | "center" | "right";
  onFontSizeChange: (size: number) => void;
  onFontWeightChange: (weight: "normal" | "bold") => void;
  onTextAlignChange: (align: "left" | "center" | "right") => void;
}

/**
 * 선 두께 버튼 + 텍스트 도구 전용 옵션(폰트 크기, 굵기, 정렬)
 */
export function StrokeSettings({
  strokeWidth,
  onWidthChange,
  showTextOptions,
  fontSize,
  fontWeight,
  textAlign,
  onFontSizeChange,
  onFontWeightChange,
  onTextAlignChange,
}: Props) {
  return (
    <>
      <div className={styles.section}>
        {WIDTHS.map((w) => (
          <button
            key={w}
            className={`${styles.widthButton} ${strokeWidth === w ? styles.widthActive : ""}`}
            onClick={() => onWidthChange(w)}
            title={`${w}px`}
          >
            <div className={styles.widthLine} style={{ height: w }} />
          </button>
        ))}
      </div>

      {showTextOptions && (
        <>
          <div className={styles.divider} />
          <div className={styles.section}>
            <select
              className={styles.select}
              value={fontSize}
              onChange={(e) => onFontSizeChange(Number(e.target.value))}
              title="폰트 크기"
            >
              {[12, 16, 20, 24, 32, 48].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              className={`${styles.toolButton} ${fontWeight === "bold" ? styles.toolActive : ""}`}
              onClick={() => onFontWeightChange(fontWeight === "bold" ? "normal" : "bold")}
              title="굵게"
            >
              B
            </button>
            <button
              className={`${styles.toolButton} ${textAlign === "left" ? styles.toolActive : ""}`}
              onClick={() => onTextAlignChange("left")}
              title="왼쪽"
            >≡</button>
            <button
              className={`${styles.toolButton} ${textAlign === "center" ? styles.toolActive : ""}`}
              onClick={() => onTextAlignChange("center")}
              title="가운데"
            >☰</button>
            <button
              className={`${styles.toolButton} ${textAlign === "right" ? styles.toolActive : ""}`}
              onClick={() => onTextAlignChange("right")}
              title="오른쪽"
            >≡</button>
          </div>
        </>
      )}
    </>
  );
}

const styles = {
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
  toolButton: css`
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #888;
    transition: all 0.15s;
    &:hover { background: #2a2a2a; color: #fff; }
  `,
  toolActive: css`
    background: #4a9eff22;
    color: #4a9eff;
    &:hover { background: #4a9eff33; color: #4a9eff; }
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

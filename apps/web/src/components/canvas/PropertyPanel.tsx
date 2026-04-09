"use client";

import { css } from "@emotion/css";
import { useCanvasStore } from "@/store/canvasStore";

const COLORS = [
  "#ffffff", "#000000", "#ff6b6b", "#4ecdc4",
  "#45b7d1", "#ffeaa7", "#96ceb4", "#dda0dd", "#f7dc6f", "#fd79a8",
];

export function PropertyPanel() {
  const {
    selectedElement,
    strokeColor, strokeWidth, fillColor,
    fontSize, fontWeight, textAlign,
    applyToSelectedChanges,
  } = useCanvasStore();

  if (!selectedElement) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>요소를 선택하면<br />속성이 표시됩니다</div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.title}>속성</div>

      {/* 선 색상 (텍스트는 텍스트 색상) */}
      <div className={styles.section}>
        <div className={styles.label}>
          {selectedElement.type === "text" ? "텍스트 색상" : "선 색상"}
        </div>
        <div className={styles.colorGrid}>
          {COLORS.map((c) => (
            <button
              key={c}
              className={`${styles.colorDot} ${strokeColor === c ? styles.colorActive : ""}`}
              style={{ background: c }}
              onClick={() => applyToSelectedChanges({ strokeColor: c })}
            />
          ))}
        </div>
      </div>

      {/* 선 두께 (텍스트 제외) */}
      {selectedElement.type !== "text" && (
        <div className={styles.section}>
          <div className={styles.label}>선 두께</div>
          <div className={styles.row}>
            {[1, 2, 4, 8].map((w) => (
              <button
                key={w}
                className={`${styles.widthBtn} ${strokeWidth === w ? styles.activeBtn : ""}`}
                onClick={() => applyToSelectedChanges({ strokeWidth: w })}
              >
                {w}px
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 도형: 채우기 색상 */}
      {(selectedElement.type === "rect" || selectedElement.type === "ellipse") && (
        <div className={styles.section}>
          <div className={styles.label}>채우기 색상</div>
          <div className={styles.row}>
            <button
              className={`${styles.fillBtn} ${!fillColor ? styles.activeBtn : ""}`}
              onClick={() => applyToSelectedChanges({ fillColor: null })}
            >
              없음
            </button>
          </div>
          <div className={styles.colorGrid}>
            {COLORS.map((c) => (
              <button
                key={c}
                className={`${styles.colorDot} ${fillColor === c ? styles.colorActive : ""}`}
                style={{ background: c }}
                onClick={() => applyToSelectedChanges({ fillColor: c })}
              />
            ))}
          </div>
        </div>
      )}

      {/* 텍스트 전용 속성 */}
      {selectedElement.type === "text" && (
        <>
          <div className={styles.section}>
            <div className={styles.label}>폰트 크기</div>
            <select
              className={styles.select}
              value={fontSize}
              onChange={(e) => applyToSelectedChanges({ fontSize: Number(e.target.value) })}
            >
              {[12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64].map((s) => (
                <option key={s} value={s}>{s}px</option>
              ))}
            </select>
          </div>

          <div className={styles.section}>
            <div className={styles.label}>스타일</div>
            <div className={styles.row}>
              <button
                className={`${styles.styleBtn} ${fontWeight === "bold" ? styles.activeBtn : ""}`}
                onClick={() =>
                  applyToSelectedChanges({ fontWeight: fontWeight === "bold" ? "normal" : "bold" })
                }
                style={{ fontWeight: "bold" }}
              >
                B
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.label}>정렬</div>
            <div className={styles.row}>
              {(["left", "center", "right"] as const).map((a) => (
                <button
                  key={a}
                  className={`${styles.styleBtn} ${textAlign === a ? styles.activeBtn : ""}`}
                  onClick={() => applyToSelectedChanges({ textAlign: a })}
                >
                  {a === "left" ? "◀" : a === "center" ? "▐" : "▶"}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* element 타입 표시 */}
      <div className={styles.typeTag}>
        {{
          pen: "자유곡선", line: "직선", rect: "사각형",
          ellipse: "원", text: "텍스트", image: "이미지",
        }[selectedElement.type] ?? selectedElement.type}
      </div>
    </div>
  );
}

const styles = {
  panel: css`
    width: 180px;
    flex-shrink: 0;
    background: #111827;
    border-left: 1px solid #1f2937;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 12px 10px;
    gap: 4px;
  `,
  title: css`
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  `,
  empty: css`
    color: #4b5563;
    font-size: 12px;
    text-align: center;
    margin-top: 40px;
    line-height: 1.6;
  `,
  section: css`
    margin-bottom: 14px;
  `,
  label: css`
    font-size: 11px;
    color: #6b7280;
    margin-bottom: 6px;
  `,
  colorGrid: css`
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
  `,
  colorDot: css`
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid transparent;
    transition: transform 0.1s;
    &:hover { transform: scale(1.15); }
  `,
  colorActive: css`
    border-color: #4a9eff;
    transform: scale(1.1);
  `,
  row: css`
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  `,
  widthBtn: css`
    padding: 3px 7px;
    border-radius: 4px;
    font-size: 11px;
    color: #9ca3af;
    border: 1px solid #374151;
    background: #1f2937;
    cursor: pointer;
    &:hover { color: #f3f4f6; }
  `,
  styleBtn: css`
    width: 30px;
    height: 28px;
    border-radius: 4px;
    font-size: 13px;
    color: #9ca3af;
    border: 1px solid #374151;
    background: #1f2937;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    &:hover { color: #f3f4f6; }
  `,
  fillBtn: css`
    padding: 3px 7px;
    border-radius: 4px;
    font-size: 11px;
    color: #9ca3af;
    border: 1px solid #374151;
    background: #1f2937;
    cursor: pointer;
    &:hover { color: #f3f4f6; }
  `,
  activeBtn: css`
    background: #2563eb;
    border-color: #2563eb;
    color: #fff;
  `,
  select: css`
    width: 100%;
    background: #1f2937;
    color: #f3f4f6;
    border: 1px solid #374151;
    border-radius: 4px;
    padding: 4px 6px;
    font-size: 12px;
  `,
  typeTag: css`
    margin-top: auto;
    padding-top: 12px;
    border-top: 1px solid #1f2937;
    font-size: 11px;
    color: #4b5563;
    text-align: center;
  `,
};

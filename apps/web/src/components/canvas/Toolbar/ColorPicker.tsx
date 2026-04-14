"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { css } from "@emotion/css";

const PALETTE = [
  "#000000", "#ffffff", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#3b82f6", "#8b5cf6",
  "#ec4899", "#6b7280",
];

interface Props {
  color: string;
  onChange: (color: string) => void;
}

/**
 * 색상 선택 버튼 + 팝업 피커
 * - 팔레트 클릭 / native color input / hex 직접 입력 지원
 * - 팝업은 portal로 렌더링해 Toolbar 레이아웃 영향 없음
 */
export function ColorPicker({ color, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState(color);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // color prop 변경 시 hex input 동기화
  useEffect(() => {
    setHexInput(color);
  }, [color]);

  const openPicker = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPopupPos({ top: rect.top, left: rect.right + 8 });
    }
    setOpen((prev) => !prev);
  }, []);

  // 팝업 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popupRef.current && !popupRef.current.contains(target) &&
        btnRef.current && !btnRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleHexSubmit = () => {
    const hex = hexInput.startsWith("#") ? hexInput : `#${hexInput}`;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      onChange(hex);
    } else {
      setHexInput(color);
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        className={styles.colorPreview}
        style={{ background: color }}
        onClick={openPicker}
        title="색상 선택"
      />

      {open && createPortal(
        <div
          ref={popupRef}
          className={styles.pickerPopup}
          style={{ top: popupPos.top, left: popupPos.left }}
        >
          <div className={styles.paletteGrid}>
            {PALETTE.map((c) => (
              <button
                key={c}
                className={`${styles.colorButton} ${color === c ? styles.colorActive : ""}`}
                style={{ background: c }}
                onClick={() => onChange(c)}
                title={c}
              />
            ))}
          </div>
          <div className={styles.pickerDivider} />
          <input
            type="color"
            value={color}
            onChange={(e) => onChange(e.target.value)}
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
      )}
    </>
  );
}

const styles = {
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
};

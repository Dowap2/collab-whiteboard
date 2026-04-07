"use client";

import { css } from "@emotion/css";
import { useRoomStore } from "@/store/roomStore";

export function CursorOverlay() {
  const { cursors, participantId } = useRoomStore();

  return (
    <div className={styles.overlay}>
      {Object.entries(cursors)
        .filter(([id]) => id !== participantId)
        .map(([id, { x, y, color, nickname }]) => (
          <div
            key={id}
            className={styles.cursor}
            style={{ transform: `translate(${x}px, ${y}px)` }}
          >
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
              <path
                d="M0 0L0 16L4.5 12L7 18L9 17L6.5 11L12 11L0 0Z"
                fill={color}
                stroke="#000"
                strokeWidth="1"
              />
            </svg>
            <span className={styles.label} style={{ background: color }}>
              {nickname}
            </span>
          </div>
        ))}
    </div>
  );
}

const styles = {
  overlay: css`
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  `,
  cursor: css`
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    align-items: flex-start;
    gap: 4px;
  `,
  label: css`
    font-size: 11px;
    font-weight: 600;
    color: #000;
    padding: 2px 6px;
    border-radius: 4px;
    margin-top: 16px;
    white-space: nowrap;
  `,
};

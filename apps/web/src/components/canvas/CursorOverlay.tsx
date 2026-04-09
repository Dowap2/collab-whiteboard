"use client";

import { css, keyframes } from "@emotion/css";
import { useRoomStore } from "@/store/roomStore";

export function CursorOverlay() {
  const { cursors, participantId } = useRoomStore();

  return (
    <div className={styles.overlay}>
      {Object.entries(cursors)
        .filter(([id]) => id !== participantId)
        .map(([id, { x, y, color, nickname, isLaser }]) =>
          isLaser ? (
            // 레이저 포인터
            <div
              key={id}
              className={styles.laser}
              style={{ transform: `translate(${x}px, ${y}px)` }}
            >
              <div className={styles.laserDot} />
              <div className={styles.laserRing} />
            </div>
          ) : (
            // 일반 커서
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
          ),
        )}
    </div>
  );
}

const pulse = keyframes`
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
  50% { transform: translate(-50%, -50%) scale(1.8); opacity: 0; }
`;

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
  laser: css`
    position: absolute;
    top: 0;
    left: 0;
  `,
  laserDot: css`
    position: absolute;
    width: 12px;
    height: 12px;
    background: #ef4444;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    box-shadow: 0 0 6px 2px rgba(239,68,68,0.8);
  `,
  laserRing: css`
    position: absolute;
    width: 24px;
    height: 24px;
    border: 2px solid #ef4444;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    animation: ${pulse} 1s ease-in-out infinite;
    opacity: 0.6;
  `,
};

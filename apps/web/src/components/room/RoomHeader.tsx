"use client";

import { css } from "@emotion/css";
import { useRouter } from "next/navigation";
import { useRoomStore } from "@/store/roomStore";
import type { Room } from "@whiteboard/types";

interface Props {
  room: Room;
}

export function RoomHeader({ room }: Props) {
  const router = useRouter();
  const reset = useRoomStore((s) => s.reset);

  const handleLeave = () => {
    reset();
    router.push("/");
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code);
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <span className={styles.roomName}>{room.name}</span>
      </div>

      <div className={styles.center}>
        <button className={styles.codeButton} onClick={handleCopyCode} title="클릭하여 복사">
          <span className={styles.codeLabel}>방 코드</span>
          <span className={styles.code}>{room.code}</span>
        </button>
      </div>

      <div className={styles.right}>
        <div className={styles.participants}>
          {room.participants.slice(0, 5).map((p) => (
            <div
              key={p.id}
              className={styles.avatar}
              style={{ background: p.color }}
              title={p.nickname}
            >
              {p.nickname[0].toUpperCase()}
            </div>
          ))}
          {room.participants.length > 5 && (
            <div className={styles.avatarMore}>+{room.participants.length - 5}</div>
          )}
        </div>
        <button className={styles.leaveButton} onClick={handleLeave}>
          나가기
        </button>
      </div>
    </header>
  );
}

const styles = {
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 52px;
    padding: 0 16px;
    background: #1a1a1a;
    border-bottom: 1px solid #2a2a2a;
    flex-shrink: 0;
  `,
  left: css`
    flex: 1;
  `,
  roomName: css`
    font-size: 15px;
    font-weight: 600;
    color: #fff;
  `,
  center: css`
    flex: 1;
    display: flex;
    justify-content: center;
  `,
  codeButton: css`
    display: flex;
    align-items: center;
    gap: 8px;
    background: #111;
    border: 1px solid #2a2a2a;
    border-radius: 8px;
    padding: 6px 12px;
    cursor: pointer;
    transition: border-color 0.2s;
    &:hover { border-color: #4a9eff; }
  `,
  codeLabel: css`
    font-size: 11px;
    color: #666;
  `,
  code: css`
    font-size: 14px;
    font-weight: 700;
    color: #4a9eff;
    letter-spacing: 2px;
    font-family: monospace;
  `,
  right: css`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
  `,
  participants: css`
    display: flex;
    align-items: center;
  `,
  avatar: css`
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: #fff;
    margin-left: -6px;
    border: 2px solid #1a1a1a;
    &:first-child { margin-left: 0; }
  `,
  avatarMore: css`
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #333;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: #fff;
    margin-left: -6px;
    border: 2px solid #1a1a1a;
  `,
  leaveButton: css`
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 13px;
    color: #ff6b6b;
    border: 1px solid #ff6b6b33;
    transition: all 0.2s;
    &:hover {
      background: #ff6b6b22;
    }
  `,
};

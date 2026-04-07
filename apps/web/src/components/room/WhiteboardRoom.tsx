"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { css } from "@emotion/css";
import { useRoomStore } from "@/store/roomStore";
import { Canvas } from "@/components/canvas/Canvas";
import { Toolbar } from "@/components/canvas/Toolbar";
import { CursorOverlay } from "@/components/canvas/CursorOverlay";
import { RoomHeader } from "./RoomHeader";
import { useSocketRoom } from "@/hooks/useSocketRoom";

interface Props {
  roomId: string;
}

export function WhiteboardRoom({ roomId }: Props) {
  const router = useRouter();
  const { room, participantId, nickname } = useRoomStore();
  // 최초 마운트 시에만 유효성 체크 → 이후 store 변경(참가자 추가/제거)에 반응하지 않도록
  const initializedRef = useRef(false);

  useSocketRoom(roomId);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (!room || !participantId) {
      router.replace("/");
    }
  }, [room, participantId, router]);

  if (!room || !participantId || !nickname) return null;

  return (
    <div className={styles.container}>
      <RoomHeader room={room} />
      <div className={styles.workspace}>
        <Toolbar />
        <div className={styles.canvasWrapper}>
          <Canvas roomId={roomId} participantId={participantId} />
          <CursorOverlay />
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: css`
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #0f0f0f;
    overflow: hidden;
  `,
  workspace: css`
    display: flex;
    flex: 1;
    overflow: hidden;
  `,
  canvasWrapper: css`
    position: relative;
    flex: 1;
    overflow: hidden;
  `,
};

"use client";

import { useEffect } from "react";
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

  useSocketRoom(roomId);

  useEffect(() => {
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

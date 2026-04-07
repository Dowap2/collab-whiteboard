"use client";

import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { useRoomStore } from "@/store/roomStore";
import type { Participant, Room } from "@whiteboard/types";

export function useSocketRoom(roomId: string) {
  const { room, participantId, nickname, addParticipant, removeParticipant, updateCursor } = useRoomStore();

  // room을 ref로 관리해 이벤트 핸들러에서 항상 최신값 참조 (effect 재실행 없이)
  const roomRef = useRef<Room | null>(room);
  roomRef.current = room;

  useEffect(() => {
    if (!participantId || !nickname || !roomRef.current) return;

    const socket = getSocket();
    socket.connect();

    const me = roomRef.current.participants.find((p) => p.id === participantId);

    socket.emit("room:join" as never, {
      roomId,
      participantId,
      nickname,
      color: me?.color ?? "#ffffff",
    });

    socket.on("participant:joined", ({ participantId: id, nickname: nick, color }) => {
      const participant: Participant = { id, nickname: nick, color };
      addParticipant(participant);
    });

    socket.on("participant:left", ({ participantId: id }) => {
      removeParticipant(id);
    });

    socket.on("cursor:updated", ({ participantId: id, position }) => {
      const participant = roomRef.current?.participants.find((p) => p.id === id);
      updateCursor(id, position.x, position.y, participant?.color ?? "#ffffff", participant?.nickname ?? "");
    });

    return () => {
      socket.off("participant:joined");
      socket.off("participant:left");
      socket.off("cursor:updated");
      socket.disconnect();
    };
  }, [roomId, participantId, nickname, addParticipant, removeParticipant, updateCursor]);
}

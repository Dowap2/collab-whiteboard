"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import { useRoomStore } from "@/store/roomStore";
import type { Participant } from "@whiteboard/types";

export function useSocketRoom(roomId: string) {
  const { room, participantId, nickname, addParticipant, removeParticipant, updateCursor } = useRoomStore();

  useEffect(() => {
    if (!room || !participantId || !nickname) return;

    const socket = getSocket();
    socket.connect();

    const me = room.participants.find((p) => p.id === participantId);

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
      const participant = room.participants.find((p) => p.id === id);
      updateCursor(id, position.x, position.y, participant?.color ?? "#ffffff", participant?.nickname ?? "");
    });

    return () => {
      socket.off("participant:joined");
      socket.off("participant:left");
      socket.off("cursor:updated");
      socket.disconnect();
    };
  }, [roomId, room, participantId, nickname, addParticipant, removeParticipant, updateCursor]);
}

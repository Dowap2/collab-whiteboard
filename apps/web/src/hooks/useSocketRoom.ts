"use client";

import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { useRoomStore } from "@/store/roomStore";
import type { Participant, Room, Role } from "@whiteboard/types";

export function useSocketRoom(roomId: string) {
  const { room, participantId, nickname, addParticipant, removeParticipant, updateCursor } =
    useRoomStore();

  const roomRef = useRef<Room | null>(room);
  roomRef.current = room;

  useEffect(() => {
    if (!participantId || !nickname || !roomRef.current) return;

    const socket = getSocket();
    socket.connect();

    const me = roomRef.current.participants.find((p) => p.id === participantId);
    const role: Role = me?.role ?? "student";

    socket.emit("room:join", {
      roomId,
      participantId,
      nickname,
      color: me?.color ?? "#ffffff",
      role,
    });

    socket.on("participant:joined", ({ participantId: id, nickname: nick, color, role: r }) => {
      const participant: Participant = { id, nickname: nick, color, role: r };
      addParticipant(participant);
    });

    socket.on("participant:left", ({ participantId: id }) => {
      removeParticipant(id);
    });

    socket.on("cursor:updated", ({ participantId: id, position, isLaser }) => {
      const participant = roomRef.current?.participants.find((p) => p.id === id);
      updateCursor(id, position.x, position.y, participant?.color ?? "#ffffff", participant?.nickname ?? "", isLaser);
    });

    return () => {
      socket.off("participant:joined");
      socket.off("participant:left");
      socket.off("cursor:updated");
      socket.disconnect();
    };
  }, [roomId, participantId, nickname, addParticipant, removeParticipant, updateCursor]);
}

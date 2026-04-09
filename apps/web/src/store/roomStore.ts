import { create } from "zustand";
import type { Room, Participant } from "@whiteboard/types";

interface RoomStore {
  room: Room | null;
  participantId: string | null;
  nickname: string | null;
  cursors: Record<string, { x: number; y: number; color: string; nickname: string; isLaser?: boolean }>;

  setRoom: (room: Room, participantId: string, nickname: string) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
  updateCursor: (participantId: string, x: number, y: number, color: string, nickname: string, isLaser?: boolean) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  room: null,
  participantId: null,
  nickname: null,
  cursors: {},

  setRoom: (room, participantId, nickname) =>
    set({ room, participantId, nickname }),

  addParticipant: (participant) =>
    set((state) => {
      if (!state.room) return state;
      return {
        room: {
          ...state.room,
          participants: [...state.room.participants, participant],
        },
      };
    }),

  removeParticipant: (participantId) =>
    set((state) => {
      if (!state.room) return state;
      const cursors = { ...state.cursors };
      delete cursors[participantId];
      return {
        room: {
          ...state.room,
          participants: state.room.participants.filter((p) => p.id !== participantId),
        },
        cursors,
      };
    }),

  updateCursor: (participantId, x, y, color, nickname, isLaser) =>
    set((state) => ({
      cursors: { ...state.cursors, [participantId]: { x, y, color, nickname, isLaser } },
    })),

  reset: () => set({ room: null, participantId: null, nickname: null, cursors: {} }),
}));

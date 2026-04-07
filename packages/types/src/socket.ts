import type { CursorPosition } from "./room";

export interface ServerToClientEvents {
  "participant:joined": (data: { participantId: string; nickname: string; color: string }) => void;
  "participant:left": (data: { participantId: string }) => void;
  "cursor:updated": (data: { participantId: string; position: CursorPosition }) => void;
  "room:error": (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  "cursor:move": (data: { position: CursorPosition }) => void;
}

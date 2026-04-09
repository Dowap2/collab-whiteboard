import type { CursorPosition, Role } from "./room";

export interface ServerToClientEvents {
  // 참가자
  "participant:joined": (data: {
    participantId: string;
    nickname: string;
    color: string;
    role: Role;
  }) => void;
  "participant:left": (data: { participantId: string }) => void;

  // 커서
  "cursor:updated": (data: {
    participantId: string;
    position: CursorPosition;
    isLaser?: boolean;
  }) => void;

  // Yjs
  "yjs:sync": (base64: string) => void;
  "yjs:update": (base64: string) => void;

  // 에러
  "room:error": (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  // 방 입장
  "room:join": (data: {
    roomId: string;
    participantId: string;
    nickname: string;
    color: string;
    role: Role;
  }) => void;

  // 커서
  "cursor:move": (data: {
    roomId: string;
    participantId: string;
    position: CursorPosition;
    isLaser?: boolean;
  }) => void;

  // Yjs
  "yjs:update": (data: { roomId: string; update: string }) => void;
}

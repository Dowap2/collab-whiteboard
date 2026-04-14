export enum DrawPermission {
  TEACHER_ONLY = "teacher-only",
  ALL = "all",
}

export type Role = "teacher" | "student";

export interface Room {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  hostId: string;
  participants: Participant[];
  drawPermission: DrawPermission;
}

export interface Participant {
  id: string;
  nickname: string;
  color: string;
  role: Role;
  cursor?: CursorPosition;
}

export interface CursorPosition {
  x: number;
  y: number;
}

export interface CreateRoomDto {
  nickname: string;
  roomName: string;
}

export interface JoinRoomDto {
  code: string;
  nickname: string;
  participantId?: string; // 재입장 시 기존 ID 복원
}

export interface JoinRoomResponse {
  room: Room;
  participantId: string;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  hostId: string;
  participants: Participant[];
}

export interface Participant {
  id: string;
  nickname: string;
  color: string;
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
}

export interface JoinRoomResponse {
  room: Room;
  participantId: string;
}

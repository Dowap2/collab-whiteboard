import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as Y from 'yjs';
import type { Room, Participant, CreateRoomDto, JoinRoomDto, JoinRoomResponse } from '@whiteboard/types';

const PARTICIPANT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
];

@Injectable()
export class RoomsService {
  private rooms = new Map<string, Room>();
  private ydocs = new Map<string, Y.Doc>();

  createRoom(dto: CreateRoomDto): JoinRoomResponse {
    const roomId = uuidv4();
    const code = this.generateCode();
    const participantId = uuidv4();

    const participant: Participant = {
      id: participantId,
      nickname: dto.nickname,
      color: PARTICIPANT_COLORS[0],
    };

    const room: Room = {
      id: roomId,
      code,
      name: dto.roomName,
      createdAt: new Date().toISOString(),
      hostId: participantId,
      participants: [participant],
    };

    this.rooms.set(code, room);
    this.ydocs.set(roomId, new Y.Doc());

    return { room, participantId };
  }

  joinRoom(dto: JoinRoomDto): JoinRoomResponse {
    const room = this.rooms.get(dto.code);
    if (!room) throw new NotFoundException('Room not found');

    const alreadyExists = room.participants.some(p => p.nickname === dto.nickname);
    if (alreadyExists) throw new BadRequestException('Nickname already taken in this room');

    const participantId = uuidv4();
    const color = PARTICIPANT_COLORS[room.participants.length % PARTICIPANT_COLORS.length];

    const participant: Participant = {
      id: participantId,
      nickname: dto.nickname,
      color,
    };

    room.participants.push(participant);

    return { room, participantId };
  }

  getRoom(code: string): Room {
    const room = this.rooms.get(code);
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  getYDoc(roomId: string): Y.Doc | undefined {
    return this.ydocs.get(roomId);
  }

  removeParticipant(roomId: string, participantId: string): void {
    for (const room of this.rooms.values()) {
      if (room.id === roomId) {
        room.participants = room.participants.filter(p => p.id !== participantId);
        if (room.participants.length === 0) {
          this.rooms.delete(room.code);
          this.ydocs.delete(roomId);
        }
        return;
      }
    }
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code: string;
    do {
      code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (this.rooms.has(code));
    return code;
  }
}

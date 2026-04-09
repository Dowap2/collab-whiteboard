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
      role: 'teacher',
    };

    const room: Room = {
      id: roomId,
      code,
      name: dto.roomName,
      createdAt: new Date().toISOString(),
      hostId: participantId,
      participants: [participant],
      drawPermission: 'teacher-only',
    };

    this.rooms.set(code, room);
    this.ydocs.set(roomId, new Y.Doc());

    return { room, participantId };
  }

  joinRoom(dto: JoinRoomDto): JoinRoomResponse {
    const room = this.rooms.get(dto.code);
    if (!room) throw new NotFoundException('Room not found');

    // 재입장: 기존 participantId가 있고 hostId와 일치하면 teacher로 복원
    if (dto.participantId) {
      const existing = room.participants.find(p => p.id === dto.participantId);
      if (existing) {
        // 이미 목록에 있으면 그대로 반환 (재연결)
        return { room, participantId: existing.id };
      }
      // hostId와 일치하면 teacher로 재입장
      if (dto.participantId === room.hostId) {
        const participant: Participant = {
          id: dto.participantId,
          nickname: dto.nickname,
          color: PARTICIPANT_COLORS[0],
          role: 'teacher',
        };
        room.participants.push(participant);
        return { room, participantId: dto.participantId };
      }
    }

    const nicknameConflict = room.participants.some(p => p.nickname === dto.nickname);
    if (nicknameConflict) throw new BadRequestException('Nickname already taken in this room');

    const participantId = uuidv4();
    const color = PARTICIPANT_COLORS[room.participants.length % PARTICIPANT_COLORS.length];

    const participant: Participant = {
      id: participantId,
      nickname: dto.nickname,
      color,
      role: 'student',
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

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as Y from 'yjs';
import { RoomsService } from './rooms.service';
import type { CursorPosition, Role } from '@whiteboard/types';

interface SocketData {
  roomId: string;
  participantId: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RoomsGateway.name);
  private socketData = new Map<string, SocketData>();

  constructor(private readonly roomsService: RoomsService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const data = this.socketData.get(client.id);
    if (data) {
      const { roomId, participantId } = data;
      try {
        this.roomsService.removeParticipant(roomId, participantId);
        client.to(roomId).emit('participant:left', { participantId });
      } catch (err) {
        this.logger.error(`handleDisconnect error [${client.id}]:`, err);
      } finally {
        this.socketData.delete(client.id);
      }
    }
  }

  @SubscribeMessage('room:join')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      roomId: string;
      participantId: string;
      nickname: string;
      color: string;
      role: Role;
    },
  ) {
    try {
      client.join(data.roomId);
      this.socketData.set(client.id, { roomId: data.roomId, participantId: data.participantId });

      client.to(data.roomId).emit('participant:joined', {
        participantId: data.participantId,
        nickname: data.nickname,
        color: data.color,
        role: data.role,
      });

      // 현재 Yjs 상태 전송 (신규 입장자에게 sync)
      const ydoc = this.roomsService.getYDoc(data.roomId);
      if (ydoc) {
        const state = Y.encodeStateAsUpdate(ydoc);
        client.emit('yjs:sync', Buffer.from(state).toString('base64'));
      }
    } catch (err) {
      this.logger.error(`handleJoinRoom error [${client.id}]:`, err);
      client.emit('room:error', { message: '방 입장 중 오류가 발생했습니다.' });
    }
  }

  @SubscribeMessage('yjs:update')
  handleYjsUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; update: string },
  ) {
    try {
      const ydoc = this.roomsService.getYDoc(data.roomId);
      if (!ydoc) return;

      const update = Uint8Array.from(Buffer.from(data.update, 'base64'));
      Y.applyUpdate(ydoc, update, 'remote');

      client.to(data.roomId).emit('yjs:update', data.update);
    } catch (err) {
      this.logger.error(`handleYjsUpdate error [${client.id}]:`, err);
      client.emit('room:error', { message: '동기화 중 오류가 발생했습니다.' });
    }
  }

  @SubscribeMessage('cursor:move')
  handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; participantId: string; position: CursorPosition; isLaser?: boolean },
  ) {
    try {
      client.to(data.roomId).emit('cursor:updated', {
        participantId: data.participantId,
        position: data.position,
        isLaser: data.isLaser,
      });
    } catch (err) {
      this.logger.error(`handleCursorMove error [${client.id}]:`, err);
    }
  }
}

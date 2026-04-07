import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as Y from 'yjs';
import { RoomsService } from './rooms.service';
import type { CursorPosition } from '@whiteboard/types';

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

  private socketData = new Map<string, SocketData>();

  constructor(private readonly roomsService: RoomsService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const data = this.socketData.get(client.id);
    if (data) {
      const { roomId, participantId } = data;
      this.roomsService.removeParticipant(roomId, participantId);
      client.to(roomId).emit('participant:left', { participantId });
      this.socketData.delete(client.id);
    }
  }

  @SubscribeMessage('room:join')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; participantId: string; nickname: string; color: string },
  ) {
    client.join(data.roomId);
    this.socketData.set(client.id, { roomId: data.roomId, participantId: data.participantId });

    client.to(data.roomId).emit('participant:joined', {
      participantId: data.participantId,
      nickname: data.nickname,
      color: data.color,
    });

    const ydoc = this.roomsService.getYDoc(data.roomId);
    if (ydoc) {
      const state = Y.encodeStateAsUpdate(ydoc);
      client.emit('yjs:sync', Buffer.from(state).toString('base64'));
    }
  }

  @SubscribeMessage('yjs:update')
  handleYjsUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; update: string },
  ) {
    const ydoc = this.roomsService.getYDoc(data.roomId);
    if (!ydoc) return;

    const update = Uint8Array.from(Buffer.from(data.update, 'base64'));
    Y.applyUpdate(ydoc, update);

    client.to(data.roomId).emit('yjs:update', data.update);
  }

  @SubscribeMessage('cursor:move')
  handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; participantId: string; position: CursorPosition },
  ) {
    client.to(data.roomId).emit('cursor:updated', {
      participantId: data.participantId,
      position: data.position,
    });
  }
}

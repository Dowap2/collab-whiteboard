import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import type { CreateRoomDto, JoinRoomDto } from '@whiteboard/types';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  createRoom(@Body() dto: CreateRoomDto) {
    return this.roomsService.createRoom(dto);
  }

  @Post('join')
  joinRoom(@Body() dto: JoinRoomDto) {
    return this.roomsService.joinRoom(dto);
  }

  @Get(':code')
  getRoom(@Param('code') code: string) {
    return this.roomsService.getRoom(code);
  }
}

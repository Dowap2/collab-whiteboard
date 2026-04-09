import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';
import { RoomsModule } from './rooms/rooms.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    RoomsModule,
    UploadModule,
    ServeStaticModule.forRoot({
      rootPath: path.join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
  ],
})
export class AppModule {}

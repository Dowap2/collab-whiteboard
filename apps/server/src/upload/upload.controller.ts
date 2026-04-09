import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (_req, file, cb) => {
          // 임시 파일명 — 실제 hash 기반 파일명은 핸들러에서 rename
          cb(null, `tmp_${Date.now()}${path.extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIMES.includes(file.mimetype)) {
          cb(new BadRequestException('Only image files are allowed'), false);
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: MAX_SIZE },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');

    // SHA-256 hash 계산
    const buffer = fs.readFileSync(file.path);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const finalName = `${hash}${ext}`;
    const finalPath = path.join(UPLOADS_DIR, finalName);

    if (fs.existsSync(finalPath)) {
      // 중복 — 임시 파일 삭제
      fs.unlinkSync(file.path);
    } else {
      fs.renameSync(file.path, finalPath);
    }

    return {
      url: `/uploads/${finalName}`,
      hash,
    };
  }
}

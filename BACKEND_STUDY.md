# 백엔드 학습 가이드 — collab-whiteboard

> 이 프로젝트의 백엔드(NestJS)가 어떤 역할을 하는지, 이해하기 위해 무엇을 공부해야 하는지,  
> 그리고 포트폴리오에서 어떤 점을 강조하면 좋은지 정리한 문서입니다.

---

## 1. 백엔드가 하는 일 (전체 구조)

```
apps/server/src/
├── main.ts               ← 서버 진입점 (CORS, 포트 설정)
├── app.module.ts         ← 루트 모듈 (RoomsModule, UploadModule 조합)
├── rooms/
│   ├── rooms.module.ts   ← rooms 기능 묶음
│   ├── rooms.controller.ts ← REST API (방 생성/참가/조회)
│   ├── rooms.service.ts  ← 비즈니스 로직 (방 상태, Yjs 문서 관리)
│   └── rooms.gateway.ts  ← WebSocket 실시간 통신 (Socket.IO + Yjs)
└── upload/
    ├── upload.module.ts
    └── upload.controller.ts ← 이미지 업로드 (Multer, SHA-256 중복 제거)
```

### 핵심 역할 요약

| 역할 | 구현 위치 | 설명 |
|------|-----------|------|
| 방 생성/참가 REST API | `rooms.controller.ts` | POST /rooms, POST /rooms/join, GET /rooms/:code |
| 참가자 상태 관리 | `rooms.service.ts` | 방 목록, 참가자 목록 메모리 관리 |
| **실시간 Yjs 동기화** | `rooms.gateway.ts` | WebSocket으로 캔버스 상태 브로드캐스트 |
| **실시간 커서 공유** | `rooms.gateway.ts` | cursor:move → cursor:updated 중계 |
| 이미지 업로드 | `upload.controller.ts` | Multer + SHA-256 해시 기반 중복 제거 |
| 정적 파일 서빙 | `app.module.ts` | /uploads/* 경로로 이미지 직접 제공 |

---

## 2. 핵심 기술 상세 설명

### 2-1. NestJS — 전체 프레임워크

NestJS는 Node.js 위에서 동작하는 백엔드 프레임워크로, Angular에서 영감을 받은 모듈 구조를 사용합니다.

**이 프로젝트에서 쓰인 핵심 개념:**

```
Module → 기능 단위 묶음 (RoomsModule, UploadModule)
Controller → HTTP 요청 처리 (REST API)
Service → 비즈니스 로직 (Injectable 싱글톤)
Gateway → WebSocket 처리
```

**공부할 것:**
- `@Module`, `@Controller`, `@Injectable`, `@Get`, `@Post`, `@Body`, `@Param` 데코레이터
- NestJS의 의존성 주입(DI) 시스템 — `constructor(private readonly roomsService: RoomsService)`가 어떻게 동작하는지
- `@nestjs/platform-express` — NestJS가 Express 위에서 동작하는 방식

---

### 2-2. Socket.IO + NestJS WebSocket Gateway

이 프로젝트에서 **가장 중요한 부분**입니다.

**동작 흐름:**

```
클라이언트                      서버 (Gateway)
    |                               |
    |-- room:join ----------------> |  소켓 룸 입장 + Yjs 전체 상태 전송
    |<-- yjs:sync (base64) -------- |
    |                               |
    |-- yjs:update (base64) ------> |  applyUpdate → 다른 클라이언트에 브로드캐스트
    |<-- yjs:update (base64) ------ |  (emit to room except sender)
    |                               |
    |-- cursor:move --------------> |  커서 위치 → 다른 클라이언트에 중계
    |<-- cursor:updated ----------- |
    |                               |
    | (연결 끊김)                    |
    |                               |-- participant:left → 남은 참가자에게 알림
```

**핵심 코드 포인트:**

```typescript
// rooms.gateway.ts
@WebSocketGateway(...)
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  @SubscribeMessage('room:join')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: ...) {
    client.join(data.roomId);          // Socket.IO 룸 입장
    client.to(data.roomId).emit(...)   // sender 제외 브로드캐스트
    client.emit('yjs:sync', ...)       // 신규 입장자에게만 전송
  }
}
```

**공부할 것:**
- Socket.IO의 **Room** 개념 (`client.join`, `client.to(room).emit`)
- `emit` vs `broadcast` vs `to(room).emit` 차이
- NestJS Gateway 데코레이터: `@WebSocketGateway`, `@SubscribeMessage`, `@ConnectedSocket`, `@MessageBody`
- `OnGatewayConnection`, `OnGatewayDisconnect` 인터페이스

---

### 2-3. Yjs — CRDT 기반 실시간 협업

이 프로젝트에서 **두 번째로 중요한 기술**입니다.

**Yjs란?**  
여러 클라이언트가 동시에 같은 데이터를 수정해도 충돌 없이 자동으로 병합하는 CRDT(Conflict-free Replicated Data Type) 라이브러리입니다.

**서버에서 Yjs의 역할:**

```typescript
// rooms.service.ts
private ydocs = new Map<string, Y.Doc>();  // 방별 Yjs 문서 서버에 보관

// 신규 입장자에게 현재 전체 상태 전송
const state = Y.encodeStateAsUpdate(ydoc);
client.emit('yjs:sync', Buffer.from(state).toString('base64'));

// 기존 참가자의 업데이트 수신 → 서버 문서에 반영 → 다른 클라이언트에 중계
const update = Uint8Array.from(Buffer.from(data.update, 'base64'));
Y.applyUpdate(ydoc, update, 'remote');
client.to(data.roomId).emit('yjs:update', data.update);
```

**왜 base64 인코딩?**  
Yjs 업데이트는 바이너리(Uint8Array)이고, Socket.IO JSON 전송에서는 문자열이 안전하므로 base64로 변환합니다.

**공부할 것:**
- CRDT의 기본 개념 (Operational Transformation과의 차이)
- `Y.Doc`, `Y.Map`, `Y.Array` — Yjs의 공유 자료구조
- `Y.encodeStateAsUpdate` / `Y.applyUpdate` — 상태 직렬화와 병합
- `Y.UndoManager` — 클라이언트에서 undo/redo 구현 방식
- origin 파라미터 (`'remote'`) — 무한 루프 방지 원리

---

### 2-4. Multer + 파일 업로드 보안

```typescript
// upload.controller.ts
FileInterceptor('file', {
  storage: diskStorage({ ... }),
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {  // MIME 타입 검사
      cb(new BadRequestException(...), false);
    }
  },
  limits: { fileSize: MAX_SIZE },  // 10MB 제한
})
```

**SHA-256 기반 중복 제거:**
```typescript
const hash = crypto.createHash('sha256').update(buffer).digest('hex');
const finalName = `${hash}${ext}`;
if (fs.existsSync(finalPath)) {
  fs.unlinkSync(file.path);  // 같은 파일이면 임시 파일 삭제
} else {
  fs.renameSync(file.path, finalPath);
}
```

**공부할 것:**
- Multer의 `diskStorage` vs `memoryStorage`
- `FileInterceptor` (NestJS) — `@UseInterceptors` 패턴
- SHA-256 해시의 개념과 Node.js `crypto` 모듈 사용법
- Content-Addressable Storage (CAS) 패턴 — 해시를 파일명으로 사용하는 이유

---

### 2-5. 메모리 기반 상태 관리 (현재 구현의 특징과 한계)

현재 서버는 데이터베이스 없이 **메모리(Map)**에 방 정보와 Yjs 문서를 저장합니다.

```typescript
private rooms = new Map<string, Room>();    // code → Room
private ydocs = new Map<string, Y.Doc>();   // roomId → Y.Doc
```

**장점:** 구현이 단순, 레이턴시 낮음  
**한계:** 서버 재시작 시 모든 데이터 소실, 수평 확장(scale-out) 불가

**포트폴리오 어필 포인트:** "현재 구조의 한계를 이해하고 있으며, Redis Pub/Sub + y-redis를 활용한 확장 가능한 구조로 개선할 수 있다"고 설명할 수 있습니다.

---

## 3. 포트폴리오 강조 포인트

### 강조할 것 (상위 3가지)

#### 1. Yjs CRDT를 이용한 충돌 없는 실시간 협업 구현
> "Operational Transformation 없이 CRDT 기반의 Yjs를 선택해 클라이언트 간 충돌 없는 실시간 동기화를 구현했습니다. 서버는 Yjs 문서의 권위 있는 복사본(authoritative copy)을 보관하며, 신규 입장자에게 전체 상태를 즉시 동기화합니다."

- 기술적 선택 이유 설명 가능 (OT vs CRDT)
- 무한 루프 방지 (`origin === 'remote'` 처리) 같은 세부 구현 이해

#### 2. Socket.IO Room을 활용한 선생님/학생 역할 분리 아키텍처
> "WebSocket Room으로 방을 격리하고, teacher/student 역할에 따라 그리기 권한을 제어하는 교육용 화이트보드를 구현했습니다."

- `drawPermission: 'teacher-only' | 'all'` 설계
- 참가자 이탈 시 자동 정리 (`handleDisconnect`)

#### 3. Content-Addressable Storage 패턴으로 이미지 중복 제거
> "SHA-256 해시를 파일명으로 사용해 동일 이미지 재업로드 시 저장 공간 낭비를 방지했습니다."

---

### 추가로 설명할 수 있으면 좋은 것

- **모노레포 구조** (Turborepo + pnpm workspace): `@whiteboard/types`를 서버/클라이언트가 공유해 타입 불일치 방지
- **CORS 설정**: `CLIENT_URL` 환경변수로 운영/개발 환경 분리
- **현재 한계와 개선 방향**: Redis Pub/Sub, y-redis, 데이터베이스 도입 방안

---

## 4. 공부 우선순위 로드맵

```
1단계 (필수 — 이 프로젝트 이해에 직결)
├── Socket.IO 기본 — emit, on, join, to(room)
├── NestJS 기본 — Module/Controller/Service/Gateway 구조
└── Yjs 기본 — Y.Doc, applyUpdate, encodeStateAsUpdate

2단계 (심화 — 면접/포트폴리오 설명에 필요)
├── CRDT vs OT 개념 차이
├── NestJS DI(의존성 주입) 동작 원리
├── Multer 파일 업로드 처리 흐름
└── base64 인코딩이 필요한 이유 (바이너리 → 텍스트 직렬화)

3단계 (확장 — "개선할 수 있다"는 것을 보여주기 위해)
├── Redis Pub/Sub — WebSocket 수평 확장 방법
├── y-redis — Yjs + Redis 통합
└── JWT 인증 — 현재 없는 인증 시스템 추가 방법
```

---

## 5. 참고 자료

- NestJS 공식 문서: https://docs.nestjs.com
  - WebSockets 섹션: https://docs.nestjs.com/websockets/gateways
  - File Upload 섹션: https://docs.nestjs.com/techniques/file-upload
- Socket.IO 공식 문서 (Rooms): https://socket.io/docs/v4/rooms/
- Yjs 공식 문서: https://docs.yjs.dev
- CRDT 개념 설명 (한국어): https://josephg.com/blog/crdts-are-the-future/

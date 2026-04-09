# Collab Whiteboard — 구조 및 구현 이해 가이드

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [디렉토리 구조](#3-디렉토리-구조)
4. [데이터 흐름 전체 그림](#4-데이터-흐름-전체-그림)
5. [서버 — NestJS](#5-서버--nestjs)
6. [클라이언트 — Next.js](#6-클라이언트--nextjs)
7. [실시간 동기화 핵심: Yjs](#7-실시간-동기화-핵심-yjs)
8. [소켓 이벤트 목록](#8-소켓-이벤트-목록)
9. [공유 타입 패키지](#9-공유-타입-패키지)
10. [주요 버그와 수정 내역](#10-주요-버그와-수정-내역)
11. [시나리오별 전체 흐름](#11-시나리오별-전체-흐름)
12. [TypeScript 활용](#12-typescript-활용)
13. [React 훅 구성 방식](#13-react-훅-구성-방식)

---

## 1. 프로젝트 개요

여러 명이 동시에 같은 캔버스에 그림을 그릴 수 있는 **실시간 협업 화이트보드** 앱이다.

- 방을 만들고 6자리 코드를 공유하면 다른 사람이 입장할 수 있다.
- 입장한 모든 사람이 그리는 내용이 **실시간으로 모든 화면에 동기화**된다.
- 다른 사람의 마우스 커서도 실시간으로 보인다.

---

## 2. 기술 스택

| 영역 | 기술 | 역할 |
|---|---|---|
| **서버** | NestJS | 백엔드 프레임워크 |
| **서버** | Socket.IO | WebSocket 실시간 통신 |
| **서버** | Yjs | 서버 측 캔버스 상태 보관 |
| **클라이언트** | Next.js 16 | 프론트엔드 프레임워크 |
| **클라이언트** | React 19 | UI 렌더링 |
| **클라이언트** | Socket.IO Client | WebSocket 연결 |
| **클라이언트** | Yjs | 클라이언트 측 캔버스 CRDT |
| **클라이언트** | Zustand | 전역 상태 관리 |
| **클라이언트** | Emotion CSS | 스타일링 (CSS-in-JS) |
| **공통** | TypeScript | 타입 안전성 |
| **모노레포** | Turborepo + pnpm | 멀티 패키지 관리 |

### 왜 Yjs인가?

Yjs는 **CRDT(Conflict-free Replicated Data Type)** 라이브러리다.  
여러 사람이 동시에 데이터를 수정해도 자동으로 충돌 없이 병합된다.  
Google Docs가 내부적으로 쓰는 방식과 동일한 원리다.

```
일반 방식:  A가 수정 → B가 수정 → 충돌 발생 → 누가 옳은지 판단 필요
CRDT 방식:  A가 수정 + B가 수정 → 알고리즘이 자동으로 합쳐줌 (항상 같은 결과)
```

---

## 3. 디렉토리 구조

```
collab-whiteboard/
├── apps/
│   ├── server/                      # NestJS 서버 (포트 4000)
│   │   └── src/
│   │       ├── main.ts              # 서버 진입점
│   │       ├── app.module.ts        # 루트 모듈
│   │       └── rooms/
│   │           ├── rooms.gateway.ts   # WebSocket 이벤트 처리
│   │           ├── rooms.service.ts   # 방/참여자/Yjs 비즈니스 로직
│   │           ├── rooms.controller.ts # REST API (/rooms)
│   │           └── rooms.module.ts
│   │
│   └── web/                         # Next.js 클라이언트 (포트 3000)
│       └── src/
│           ├── app/
│           │   ├── page.tsx          # 홈 화면 (방 만들기/참여)
│           │   └── room/[roomId]/
│           │       └── page.tsx      # 화이트보드 화면
│           ├── components/
│           │   ├── canvas/
│           │   │   ├── Canvas.tsx        # 실제 그림 영역
│           │   │   ├── Toolbar.tsx       # 도구 선택 UI
│           │   │   └── CursorOverlay.tsx # 다른 유저 커서 표시
│           │   └── room/
│           │       ├── HomeScreen.tsx    # 방 생성/참여 폼
│           │       ├── WhiteboardRoom.tsx # 화이트보드 최상위 컴포넌트
│           │       └── RoomHeader.tsx    # 상단 참여자 목록, 방 코드
│           ├── hooks/
│           │   ├── useSocketRoom.ts  # 소켓 연결 & 참여자 이벤트
│           │   ├── useYjsCanvas.ts   # Yjs 동기화 로직
│           │   └── useCanvasDraw.ts  # 드로잉 로직
│           ├── store/
│           │   ├── roomStore.ts      # 방/참여자 전역 상태 (Zustand)
│           │   └── canvasStore.ts    # 캔버스 도구 전역 상태 (Zustand)
│           └── lib/
│               ├── socket.ts         # Socket.IO 싱글턴
│               ├── api.ts            # REST API 호출 함수
│               └── encoding.ts       # Base64 인코딩/디코딩 유틸
│
└── packages/
    └── types/                        # 서버-클라이언트 공유 타입
        └── src/
            ├── room.ts               # Room, Participant 타입
            ├── canvas.ts             # CanvasElement 타입들
            └── socket.ts             # 소켓 이벤트 타입
```

---

## 4. 데이터 흐름 전체 그림

```
[브라우저 A]                [NestJS 서버]               [브라우저 B]
    │                           │                           │
    │── POST /rooms ──────────► │                           │
    │◄─ { room, participantId } │                           │
    │                           │                           │
    │── socket connect ────────►│                           │
    │── room:join ─────────────►│                           │
    │◄─ yjs:sync ───────────────│                           │
    │                           │                           │
    │                           │◄── socket connect ────────│
    │                           │◄── room:join ─────────────│
    │◄─ participant:joined ─────│── yjs:sync ──────────────►│
    │                           │                           │
    │   [마우스로 그림]          │                           │
    │── yjs:update ────────────►│                           │
    │                     (Yjs 적용)                        │
    │                           │── yjs:update ────────────►│
    │                           │                    (Yjs 적용 → 화면 갱신)
    │                           │                           │
    │   [마우스 이동]            │                           │
    │── cursor:move ───────────►│                           │
    │                           │── cursor:updated ─────────►│
    │                           │                    (커서 위치 렌더링)
```

---

## 5. 서버 — NestJS

### 5-1. `rooms.service.ts` — 데이터 관리

서버는 **메모리(Map)** 에 모든 데이터를 저장한다. DB 없음.

```typescript
private rooms = new Map<string, Room>();   // code → Room
private ydocs = new Map<string, Y.Doc>();  // roomId → Yjs 문서
```

**방 생성 (`createRoom`)**
1. UUID로 `roomId` 생성
2. 6자리 알파뉴메릭 `code` 생성 (충돌 방지: while 루프로 중복 검사)
3. 방 생성자를 첫 참여자로 추가, 색상은 배열 첫 번째 `#FF6B6B`
4. `new Y.Doc()` 으로 빈 Yjs 문서 생성 → roomId로 저장

**방 참여 (`joinRoom`)**
1. `code`로 방 조회, 없으면 404
2. 닉네임 중복이면 400
3. `참여자 수 % 8` 으로 색상 순환 배정
4. 기존 `room.participants` 배열에 push

**참여자 제거 (`removeParticipant`)**
- 소켓 연결이 끊어지면 호출됨
- 참여자가 0명이 되면 **방과 Yjs 문서를 함께 삭제** (메모리 누수 방지)

**참여자 색상 팔레트**
```typescript
const PARTICIPANT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
];
```

---

### 5-2. `rooms.gateway.ts` — WebSocket 이벤트

NestJS의 `@WebSocketGateway` 데코레이터로 Socket.IO 서버를 내장한다.

**소켓-방 매핑 관리**
```typescript
private socketData = new Map<string, { roomId: string; participantId: string }>();
// key: socket.id, value: 이 소켓이 어느 방의 누구인지
```
이 Map이 필요한 이유: 소켓 연결이 끊어질 때(`handleDisconnect`) 어느 방의 누가 나갔는지 알아야 하기 때문이다.

**`handleJoinRoom` (room:join 이벤트)**
```
1. socket.join(roomId)     → Socket.IO 내장 방에 참여 (브로드캐스트용)
2. socketData에 기록       → disconnect 시 참조하기 위해
3. 방 안의 다른 사람들에게  participant:joined 이벤트 전송
4. 현재 Yjs 상태를 Base64로 인코딩해서 새 참가자에게 yjs:sync 전송
```

**`handleYjsUpdate` (yjs:update 이벤트)**
```
1. Base64 → Uint8Array 디코딩
2. Y.applyUpdate(ydoc, update, 'remote') → 서버 Yjs에 반영
3. 방 안의 다른 사람들에게 그대로 브로드캐스트
```

**`handleDisconnect`**
```
1. socketData에서 roomId, participantId 조회
2. roomsService.removeParticipant() 호출
3. 방에 남은 사람들에게 participant:left 이벤트 전송
```

---

### 5-3. `rooms.controller.ts` — REST API

| 메서드 | 경로 | 역할 |
|---|---|---|
| POST | `/rooms` | 방 생성 |
| POST | `/rooms/join` | 코드로 방 참여 |
| GET | `/rooms/:code` | 방 정보 조회 |

---

## 6. 클라이언트 — Next.js

### 6-1. 상태 관리: Zustand

전역 상태를 두 개의 store로 나눈다.

**`roomStore.ts`** — 방과 참여자 정보
```typescript
{
  room: Room | null,          // 현재 방 전체 정보 (참여자 목록 포함)
  participantId: string | null, // 내 참여자 ID
  nickname: string | null,
  cursors: Record<string, {   // 다른 참여자들의 커서 위치
    x: number; y: number; color: string; nickname: string
  }>
}
```

**`canvasStore.ts`** — 현재 선택된 도구 정보
```typescript
{
  tool: ToolType,       // "pen" | "line" | "rect" | ...
  strokeColor: string,
  strokeWidth: number,
}
```

Zustand를 쓰는 이유: Redux보다 훨씬 간단하고, `useRoomStore()` 한 줄로 어느 컴포넌트에서든 상태를 읽고 쓸 수 있다.

---

### 6-2. 소켓 싱글턴: `lib/socket.ts`

```typescript
let socket: AppSocket | null = null;

export function getSocket(): AppSocket {
  if (!socket) {
    socket = io("http://localhost:4000", { autoConnect: false });
  }
  return socket;
}
```

`autoConnect: false` 로 만들어두고, `socket.connect()`를 명시적으로 호출할 때만 연결한다.  
싱글턴 패턴으로 앱 전체에서 **같은 소켓 인스턴스**를 공유한다. (여러 개 생기면 이벤트 핸들러가 중복 등록됨)

---

### 6-3. `useSocketRoom.ts` — 참여자 이벤트 처리

방에 입장했을 때 소켓을 연결하고, 참여자 관련 이벤트를 처리한다.

```typescript
useEffect(() => {
  if (!participantId || !nickname || !roomRef.current) return;

  socket.connect();
  socket.emit("room:join", { roomId, participantId, nickname, color });

  socket.on("participant:joined", ...) // addParticipant() 호출
  socket.on("participant:left", ...)   // removeParticipant() 호출
  socket.on("cursor:updated", ...)     // updateCursor() 호출

  return () => {
    socket.off(...);
    socket.disconnect();
  };
}, [roomId, participantId, nickname, ...]); // room은 의존성에 없음!
```

**핵심 설계 포인트: `room`을 의존성 배열에 넣지 않는다**

`room`을 넣으면 누군가 참여할 때마다 `addParticipant` → `room` 객체 변경 → effect 재실행 → 소켓 재연결 무한 루프가 생긴다.  
대신 `roomRef.current = room` 으로 ref를 항상 최신으로 유지하고, 이벤트 핸들러 내부에서는 ref로 참조한다.

---

### 6-4. `useYjsCanvas.ts` — Yjs 동기화

클라이언트 측 Yjs 문서를 초기화하고 소켓과 연결한다.

```typescript
// Yjs 문서와 캔버스 요소 배열 생성 (컴포넌트 생명주기 동안 유지)
const ydocRef = useRef(new Y.Doc());
const yElementsRef = useRef(ydocRef.current.getArray<CanvasElement>("elements"));
```

**세 가지 이벤트 연결**

```
yjs:sync   → 처음 입장할 때 서버가 현재 전체 상태를 전송
             Y.applyUpdate(ydoc, update, 'remote') 로 적용

yjs:update → 다른 사람이 그릴 때 서버가 브로드캐스트
             Y.applyUpdate(ydoc, update, 'remote') 로 적용
             ※ 'remote' origin 지정이 핵심 (아래 버그 설명 참고)

ydoc.on("update") → 내가 그릴 때 Yjs 내부에서 발생하는 이벤트
                    origin이 'remote'면 다시 보내지 않음 (내가 받은 건 재전송 X)
                    origin이 'local' 또는 다른 값이면 서버로 emit
```

---

### 6-5. `useCanvasDraw.ts` — 드로잉 로직

마우스 이벤트를 Yjs 트랜잭션으로 변환한다.

**startDrawing (mousedown)**
```typescript
const el: PenElement = { id: uuid(), type: "pen", points: [point], ... };
ydoc.transact(() => yElements.push([el]), "local");
//                                        ^^^^^^ origin = "local"
// → useYjsCanvas의 handleYDocUpdate 실행 → 서버로 yjs:update 전송
```

**continueDrawing (mousemove)**
```typescript
// 현재 그리는 요소를 찾아서 점 하나 추가
const updated = { ...el, points: [...el.points, point] };
ydoc.transact(() => {
  yElements.delete(idx, 1);   // 기존 요소 삭제
  yElements.insert(idx, [updated]); // 새 요소로 교체
}, "local");
```

Yjs Array는 개별 필드를 수정하는 게 아니라 **삭제 후 삽입** 방식으로 업데이트한다.

**redrawAll**
```typescript
// Canvas 2D Context로 전체 요소 다시 그리기
ctx.clearRect(0, 0, canvas.width, canvas.height);
for (const el of yElements.toArray()) {
  drawElement(ctx, el);
}
```

`yElements.observe()` 가 변경을 감지하면 `redrawAll()`을 호출한다. 모든 참여자의 업데이트가 Yjs를 통해 반영되므로 **서버에서 받은 그림도 자동으로 화면에 나타난다**.

---

### 6-6. `Canvas.tsx` — 컴포넌트 조립

```
Canvas
 ├── useYjsCanvas()     → ydoc, yElements
 ├── useCanvasDraw()    → startDrawing, continueDrawing, stopDrawing, redrawAll
 ├── ResizeObserver     → 창 크기 변경 시 canvas 크기 재조정 + redrawAll
 ├── yElements.observe  → Yjs 데이터 변경 시 redrawAll
 └── 마우스 이벤트
      ├── onMouseDown   → startDrawing()
      ├── onMouseMove   → continueDrawing() + cursor:move emit
      ├── onMouseUp     → stopDrawing()
      └── onMouseLeave  → stopDrawing()
```

---

### 6-7. `WhiteboardRoom.tsx` — 화이트보드 페이지

```
WhiteboardRoom
 ├── useSocketRoom()  → 소켓 연결 & 참여자 이벤트
 ├── RoomHeader       → 참여자 목록, 방 코드, 나가기 버튼
 ├── Toolbar          → 도구 선택 (pen, eraser 등)
 ├── Canvas           → 그림 영역
 └── CursorOverlay    → 다른 사람 커서 SVG 레이어
```

---

## 7. 실시간 동기화 핵심: Yjs

### Yjs 데이터 구조

```
Y.Doc (ydoc)
 └── Y.Array<CanvasElement> ("elements")  ← getArray("elements")로 접근
      ├── PenElement   { id, type:"pen", points:[{x,y},...], strokeColor, ... }
      ├── LineElement  { id, type:"line", start, end, ... }
      ├── RectElement  { id, type:"rect", x, y, width, height, ... }
      └── ...
```

### 업데이트 전파 경로

```
[내가 그림]
ydoc.transact(() => ..., "local")
  → Yjs 내부: update 이벤트 발생 (origin = "local")
  → handleYDocUpdate: origin이 "local"이므로 서버로 전송
  → socket.emit("yjs:update", { roomId, update: base64 })
  → 서버: Y.applyUpdate(ydoc, update, 'remote')
  → 서버: socket.to(roomId).emit("yjs:update", base64) (나 제외 브로드캐스트)

[상대방 화면]
  socket.on("yjs:update", onUpdate)
  → Y.applyUpdate(ydoc, update, 'remote')   ← origin = 'remote'
  → Yjs 내부: update 이벤트 발생 (origin = 'remote')
  → handleYDocUpdate: origin이 'remote'이므로 return (재전송 안 함)
  → yElements.observe 콜백 실행 → redrawAll() → 화면에 그림 나타남
```

### 처음 입장할 때 상태 동기화

```
[새 참가자 B]
socket.emit("room:join", ...)
  → 서버: Y.encodeStateAsUpdate(ydoc) → base64 변환
  → socket.emit("yjs:sync", base64)

[B의 클라이언트]
socket.on("yjs:sync", base64)
  → Y.applyUpdate(ydoc, decoded, 'remote')
  → 기존에 그려진 내용이 모두 B 화면에 나타남
```

---

## 8. 소켓 이벤트 목록

### 클라이언트 → 서버

| 이벤트 | 데이터 | 시점 |
|---|---|---|
| `room:join` | `{ roomId, participantId, nickname, color }` | 화이트보드 페이지 진입 시 |
| `yjs:update` | `{ roomId, update: base64 }` | 그림을 그릴 때마다 |
| `cursor:move` | `{ roomId, participantId, position: {x,y} }` | 마우스를 움직일 때마다 |

### 서버 → 클라이언트

| 이벤트 | 데이터 | 시점 |
|---|---|---|
| `yjs:sync` | `base64 string` | 새 참가자 입장 직후 (해당 참가자만) |
| `participant:joined` | `{ participantId, nickname, color }` | 누군가 입장할 때 (입장자 제외) |
| `participant:left` | `{ participantId }` | 누군가 퇴장할 때 |
| `yjs:update` | `base64 string` | 누군가 그릴 때 (그린 사람 제외) |
| `cursor:updated` | `{ participantId, position }` | 누군가 마우스 이동 시 (해당 사람 제외) |

---

## 9. 공유 타입 패키지

`packages/types` 는 서버와 클라이언트가 **동일한 타입 정의를 공유**하는 패키지다.

```typescript
// room.ts
interface Room { id, code, name, createdAt, hostId, participants[] }
interface Participant { id, nickname, color, cursor? }

// canvas.ts
type ToolType = "pen" | "line" | "rect" | "ellipse" | "text" | "eraser" | "select"
type CanvasElement = PenElement | LineElement | RectElement | EllipseElement | TextElement

// socket.ts (Socket.IO 제네릭 타입에 주입)
interface ServerToClientEvents { "participant:joined", "participant:left", "cursor:updated", "room:error" }
interface ClientToServerEvents { "cursor:move" }
```

이 패키지 덕분에 서버에서 보내는 이벤트의 타입과 클라이언트에서 받는 이벤트의 타입이 자동으로 일치한다.

---

## 10. 주요 버그와 수정 내역

### 버그 1: 참여자 수가 이상하게 표시됨

**원인**

`useSocketRoom.ts`의 `useEffect` 의존성 배열에 `room`이 포함되어 있었다.

```
누군가 입장
→ addParticipant() 호출
→ room 객체 새로 생성 (participants 배열이 바뀌었으므로)
→ useEffect 의존성 변경 감지
→ cleanup 실행: socket.off(...), socket.disconnect()
→ effect 재실행: socket.connect(), room:join 재전송
→ 서버가 participant:joined를 다시 브로드캐스트
→ addParticipant() 또 호출 → 루프
```

**수정**

`room`을 의존성 배열에서 제거하고, ref로 최신값을 유지한다.

```typescript
// 변경 전
}, [roomId, room, participantId, nickname, addParticipant, removeParticipant, updateCursor]);

// 변경 후
const roomRef = useRef(room);
roomRef.current = room;  // 매 렌더마다 최신값으로 갱신
// ...
}, [roomId, participantId, nickname, addParticipant, removeParticipant, updateCursor]);
```

---

### 버그 2: 서로 그리는 내용이 동기화되지 않음

**원인**

`useYjsCanvas.ts`의 `onUpdate` 핸들러가 업데이트를 적용할 때 origin을 지정하지 않았다.

```typescript
// 변경 전 (버그)
const onUpdate = (base64: string) => {
  Y.applyUpdate(ydoc, update);  // origin 없음 → origin = undefined
};

// handleYDocUpdate에서:
if (origin === "remote") return; // undefined !== "remote" → 통과
socket.emit("yjs:update", ...); // 받은 걸 다시 서버로 보냄!
```

이러면 A가 그린 내용을 B가 받아서 다시 서버에 보내고, 서버는 A에게 다시 보내고, A는 또 서버에 보내는 **무한 루프**가 발생한다.

**수정**

```typescript
// 변경 후
const onUpdate = (base64: string) => {
  Y.applyUpdate(ydoc, update, 'remote');  // 'remote' origin 지정
};
// → handleYDocUpdate: origin === 'remote' → return → 재전송 안 함
```

---

## 11. 시나리오별 전체 흐름

### 시나리오 A: 방 생성 후 입장

```
1. HomeScreen에서 닉네임 + 방이름 입력 후 "방 만들기"
2. POST /rooms → 서버: Room 생성, Yjs Doc 생성, 첫 참여자 추가
3. 응답: { room, participantId }
4. roomStore.setRoom(room, participantId, nickname)
5. router.push("/room/{roomId}")
6. WhiteboardRoom 마운트 → useSocketRoom 실행
7. socket.connect() + socket.emit("room:join", ...)
8. 서버: socketData에 기록, yjs:sync 전송 (빈 상태)
9. 화이트보드 화면 표시
```

### 시나리오 B: 코드로 방 참여

```
1. HomeScreen에서 6자리 코드 입력 후 "참여하기"
2. POST /rooms/join → 서버: 방 조회, 참여자 추가
3. 응답: { room, participantId } (기존 참여자들 포함)
4. roomStore.setRoom(room, participantId, nickname)
5. router.push("/room/{roomId}")
6. useSocketRoom: socket.emit("room:join", ...)
7. 서버: 기존 참여자들에게 participant:joined 이벤트
   기존 참여자들: addParticipant() → 헤더에 새 참가자 표시
8. 새 참가자에게 yjs:sync 전송 → 기존 그림이 화면에 나타남
```

### 시나리오 C: 동시에 그리기

```
[A가 그림]
mousedown → startDrawing → ydoc.transact(..., "local")
→ handleYDocUpdate(origin="local") → socket.emit("yjs:update")
→ 서버: Y.applyUpdate + socket.to(room).emit("yjs:update")
→ B의 socket.on("yjs:update") → Y.applyUpdate(ydoc, update, 'remote')
→ yElements.observe → redrawAll() → B 화면에 A의 그림 표시

[B도 동시에 그림]
같은 방식으로 진행, Yjs CRDT가 두 사람의 변경사항을 자동 병합
```

### 시나리오 D: 참가자 퇴장

```
[B가 탭을 닫음]
socket.disconnect()
→ 서버: handleDisconnect(client)
→ socketData에서 roomId, participantId 조회
→ roomsService.removeParticipant(roomId, participantId)
→ socket.to(roomId).emit("participant:left", { participantId })
→ A의 socket.on("participant:left") → removeParticipant(id)
→ roomStore.room.participants 업데이트 → RoomHeader에서 B 아바타 사라짐

[참가자가 0명이 되면]
rooms.delete(room.code)
ydocs.delete(roomId)
→ 방과 Yjs 문서 메모리에서 완전 삭제
```

---

## 12. TypeScript 활용

### 12-1. `interface` vs `type`

이 프로젝트에서는 두 키워드를 목적에 따라 구분해서 쓴다.

| 키워드 | 사용 상황 | 예시 |
|---|---|---|
| `interface` | 객체 형태를 정의할 때 | `Room`, `Participant`, `RoomStore` |
| `type` | 유니온 타입, 별칭 | `ToolType`, `CanvasElement` |

```typescript
// interface — 확장 가능한 객체 구조 정의
interface Room {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  hostId: string;
  participants: Participant[];
}

// type — 여러 타입의 합집합(유니온)
type ToolType = "pen" | "line" | "rect" | "ellipse" | "text" | "eraser" | "select";

type CanvasElement = PenElement | LineElement | RectElement | EllipseElement | TextElement;
```

---

### 12-2. 제네릭(Generic)

타입을 매개변수처럼 받아서 재사용 가능한 구조를 만든다.

**`Y.Array<CanvasElement>` — Yjs 배열에 타입 부여**

```typescript
// Yjs Array는 기본적으로 어떤 값이든 담을 수 있음
// 제네릭으로 CanvasElement만 담는다고 명시
const yElementsRef = useRef<Y.Array<CanvasElement>>(
  ydocRef.current.getArray<CanvasElement>("elements")
);

// 이렇게 하면 yElements.toArray()의 반환값이 자동으로 CanvasElement[]
for (const el of yElements.toArray()) {
  drawElement(ctx, el); // el: CanvasElement
}
```

**`Socket<ServerToClientEvents, ClientToServerEvents>` — 소켓 이벤트 타입 적용**

```typescript
// 서버→클라이언트 이벤트, 클라이언트→서버 이벤트를 각각 타입으로 주입
type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// 이후 socket.on(), socket.emit() 호출 시 잘못된 이벤트명/데이터 구조를 컴파일 단계에서 감지
```

**`request<T>()` — 제네릭 fetch 래퍼**

```typescript
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { ... });
  return res.json(); // 반환 타입이 T
}

// 호출할 때 T를 지정하면 반환값 타입이 결정됨
const data = await request<JoinRoomResponse>("/rooms", { method: "POST", ... });
// data: JoinRoomResponse — 타입 추론 자동 완성
```

**`create<RoomStore>()` — Zustand 스토어 타입**

```typescript
// Zustand의 create 함수에 스토어 인터페이스를 제네릭으로 전달
export const useRoomStore = create<RoomStore>((set) => ({ ... }));
// 이후 useRoomStore()로 꺼낸 값은 자동으로 RoomStore 타입
```

**`useRef<HTMLCanvasElement>()` — DOM 요소 타입**

```typescript
const canvasRef = useRef<HTMLCanvasElement>(null);
// canvasRef.current: HTMLCanvasElement | null — 정확한 타입으로 DOM API 자동완성
```

---

### 12-3. 판별 유니온 (Discriminated Union)

`CanvasElement`는 `type` 필드를 기준으로 어떤 구체적인 타입인지 구분된다.  
TypeScript가 `switch` 문에서 타입을 자동으로 좁혀준다(Type Narrowing).

```typescript
// 각 요소마다 type 필드가 고정된 문자열 리터럴
interface PenElement extends BaseElement {
  type: "pen";        // ← 리터럴 타입
  points: Point[];
}
interface RectElement extends BaseElement {
  type: "rect";       // ← 리터럴 타입
  x: number; y: number; width: number; height: number;
}

// drawElement 함수에서 switch로 타입을 좁힌다
function drawElement(ctx: CanvasRenderingContext2D, el: CanvasElement) {
  switch (el.type) {
    case "pen":
      // 이 블록 안에서 el은 자동으로 PenElement 타입
      // → el.points 사용 가능, el.x는 오류
      const { points } = el;
      break;
    case "rect":
      // 이 블록 안에서 el은 자동으로 RectElement 타입
      ctx.strokeRect(el.x, el.y, el.width, el.height);
      break;
  }
}
```

이 패턴 덕분에 `el as PenElement` 같은 강제 캐스팅 없이도 타입 안전하게 각 도형을 처리할 수 있다.

---

### 12-4. 옵셔널 프로퍼티와 유니온 `undefined`

```typescript
interface Participant {
  id: string;
  nickname: string;
  color: string;
  cursor?: CursorPosition;  // ?: 있을 수도 없을 수도 있음
}

interface CanvasStore {
  fillColor: string | undefined;  // 값이 없는 상태를 명시적으로 표현
  setFillColor: (color: string | undefined) => void;
}
```

`cursor?`와 `cursor: CursorPosition | undefined`는 사실상 같지만,  
`?`는 "이 속성 자체가 없을 수 있다"는 의도를 더 명확하게 전달한다.

---

### 12-5. `Record<K, V>` 유틸리티 타입

```typescript
// roomStore.ts
cursors: Record<string, { x: number; y: number; color: string; nickname: string }>;

// Record<string, V>는 { [key: string]: V }와 동일
// participantId를 키로, 커서 정보를 값으로 갖는 객체
```

`Record`를 쓰면 동적 키(participantId)를 가진 객체를 타입 안전하게 정의할 수 있다.  
`Object.entries(cursors)` 결과도 `[string, { x, y, color, nickname }][]`로 자동 추론된다.

---

### 12-6. `import type`

```typescript
// 타입만 임포트 — 런타임 번들에 포함되지 않음
import type { Room, Participant } from "@whiteboard/types";
import type { CanvasElement, PenElement, Point } from "@whiteboard/types";
```

`import type`은 TypeScript 3.8+에서 추가된 문법이다.  
타입 정보는 컴파일 후 JS에서 사라지므로, `import type`으로 명시하면 번들러가 해당 임포트를  
완전히 제거해 불필요한 런타임 의존성을 줄일 수 있다.

---

### 12-7. 인터페이스로 내부 타입 정의

공유 패키지에 없는 모듈 내부 타입은 해당 파일에서 직접 정의한다.

```typescript
// rooms.gateway.ts (서버)
interface SocketData {
  roomId: string;
  participantId: string;
}
private socketData = new Map<string, SocketData>();

// RoomHeader.tsx (클라이언트)
interface Props {
  room: Room;
}
export function RoomHeader({ room }: Props) { ... }

// useCanvasDraw.ts
// React.RefObject<HTMLCanvasElement | null> — HTMLCanvasElement가 없을 수 있음을 명시
export function useCanvasDraw(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  ydoc: Y.Doc,
  yElements: Y.Array<CanvasElement>,
  participantId: string,
) { ... }
```

---

### 12-8. `as never` 타입 단언

```typescript
// useSocketRoom.ts, useYjsCanvas.ts에서 반복적으로 등장
socket.emit("room:join" as never, { ... });
socket.on("yjs:sync" as never, onSync);
```

Socket.IO 클라이언트의 제네릭 타입(`ClientToServerEvents`, `ServerToClientEvents`)에  
`yjs:update`, `room:join` 같은 이벤트가 정의되어 있지 않아서 발생하는 타입 오류를 우회한다.  
`as never`는 "이 값을 어떤 타입으로도 취급해라"는 의미의 타입 단언이다.

> **개선 여지**: `socket.ts`의 타입 정의에 Yjs 관련 이벤트를 추가하면 `as never` 없이 타입 안전하게 쓸 수 있다.

---

## 13. React 훅 구성 방식

### 13-1. 훅 계층 구조

컴포넌트와 훅의 관계를 계층으로 나타내면 다음과 같다.

```
WhiteboardRoom (컴포넌트)
 └── useSocketRoom()          ← 소켓 연결 & 참여자 이벤트
      └── useRoomStore()      ← Zustand: 방/참여자 상태 읽기+쓰기

Canvas (컴포넌트)
 ├── useYjsCanvas()           ← Yjs 문서 초기화 & 소켓 동기화
 │    └── getSocket()         ← 소켓 싱글턴 참조
 ├── useCanvasDraw()          ← 드로잉 트랜잭션 로직
 │    └── useCanvasStore()    ← Zustand: 도구/색상 상태 읽기
 └── useCanvasStore()         ← 커서 모양 결정용

RoomHeader (컴포넌트)
 └── useRoomStore((s) => s.reset)  ← Zustand 셀렉터 패턴

CursorOverlay (컴포넌트)
 └── useRoomStore()           ← cursors, participantId 읽기
```

관심사를 훅 단위로 분리해서 각 훅이 **한 가지 역할**만 담당하도록 설계했다.

---

### 13-2. `useRef` — 렌더링과 무관한 값 보관

```typescript
// 1. DOM 요소 참조
const canvasRef = useRef<HTMLCanvasElement>(null);
const containerRef = useRef<HTMLDivElement>(null);
// → canvasRef.current로 Canvas DOM에 직접 접근 (이벤트, 크기 등)

// 2. Yjs 객체 — 렌더링을 유발하지 않아야 함
const ydocRef = useRef<Y.Doc>(new Y.Doc());
const yElementsRef = useRef<Y.Array<CanvasElement>>(
  ydocRef.current.getArray<CanvasElement>("elements")
);
// → Y.Doc은 내부적으로 mutable하고 React 상태로 관리하면 안 됨
// → useRef로 인스턴스를 고정시키고 렌더링과 분리

// 3. 드로잉 진행 상태 — 렌더링 불필요
const isDrawing = useRef(false);
const currentId = useRef<string | null>(null);
// → 마우스를 누르고 있는지, 어떤 요소를 그리는 중인지
// → 이 값이 바뀐다고 화면이 갱신될 필요는 없음

// 4. 최신 상태 캡처 (roomRef 패턴)
const roomRef = useRef<Room | null>(room);
roomRef.current = room;  // 매 렌더에서 최신값으로 갱신
// → useEffect 내부 클로저가 stale한 값을 참조하는 문제 방지
```

**핵심 원칙**: 값이 바뀌어도 화면을 다시 그릴 필요가 없으면 `useRef`, 바뀌면 화면도 갱신해야 하면 `useState`나 Zustand.

---

### 13-3. `useEffect` — 사이드 이펙트와 클린업

이 프로젝트에서 `useEffect`가 담당하는 역할은 크게 세 가지다.

**① 소켓 연결 — `useSocketRoom.ts`**

```typescript
useEffect(() => {
  if (!participantId || !nickname || !roomRef.current) return; // 조건 불만족 시 조기 탈출

  const socket = getSocket();
  socket.connect();                  // 사이드 이펙트: 외부 연결
  socket.emit("room:join", ...);

  socket.on("participant:joined", addParticipant);

  return () => {                     // 클린업: 컴포넌트 언마운트 시 정리
    socket.off("participant:joined");
    socket.disconnect();
  };
}, [roomId, participantId, nickname, ...]); // room은 제외 (ref로 대체)
```

**② Yjs 이벤트 등록 — `useYjsCanvas.ts`**

```typescript
useEffect(() => {
  const ydoc = ydocRef.current;
  const socket = getSocket();

  socket.on("yjs:sync" as never, onSync);
  socket.on("yjs:update" as never, onUpdate);
  ydoc.on("update", handleYDocUpdate);  // Yjs 문서 변경 감지

  return () => {
    socket.off("yjs:sync", onSync);
    socket.off("yjs:update", onUpdate);
    ydoc.off("update", handleYDocUpdate); // 클린업: 리스너 제거
  };
}, [roomId]); // roomId가 바뀌면 새 방의 소켓 이벤트로 교체
```

**③ Canvas 크기 감지 — `Canvas.tsx`**

```typescript
useEffect(() => {
  const canvas = canvasRef.current;
  const container = containerRef.current;
  if (!canvas || !container) return;

  const resize = () => {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    redrawAll();
  };

  resize(); // 마운트 직후 1회 실행
  const observer = new ResizeObserver(resize); // 창 크기 변경 감지
  observer.observe(container);

  return () => observer.disconnect(); // 클린업: 옵저버 해제
}, [redrawAll]);
```

**의존성 배열 설계 원칙**

| 상황 | 배열 |
|---|---|
| 마운트 시 1회만 실행 | `[]` |
| 특정 값이 바뀔 때 재실행 | `[roomId]`, `[participantId]` |
| 매 렌더마다 실행 | 배열 생략 (이 프로젝트에선 사용 안 함) |
| 값은 필요하지만 재실행 트리거는 아님 | 의존성에서 제외하고 ref로 대체 |

---

### 13-4. `useCallback` — 함수 참조 안정화

```typescript
// useCanvasDraw.ts
const startDrawing = useCallback(
  (point: Point) => {
    if (tool === "select") return;
    // ...
    ydoc.transact(() => yElements.push([el]), "local");
  },
  [tool, strokeColor, strokeWidth, participantId, ydoc, yElements], // 이 값들이 바뀌면 새 함수 생성
);

const redrawAll = useCallback(() => {
  const canvas = canvasRef.current;
  const ctx = getCtx();
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const el of yElements.toArray()) drawElement(ctx, el);
}, [canvasRef, getCtx, yElements]); // yElements가 바뀌면 재생성
```

`useCallback`이 필요한 이유:
- `startDrawing`이 `Canvas.tsx`의 `useEffect` 의존성으로 전달됨
- 함수 참조가 매 렌더마다 바뀌면 `useEffect`가 계속 재실행됨
- `useCallback`으로 의존성이 바뀔 때만 새 함수를 생성

---

### 13-5. Zustand 훅 사용 패턴

**전체 스토어 구독**

```typescript
// 스토어 전체를 구독 — 어떤 값이 바뀌어도 리렌더링
const { room, participantId, nickname, addParticipant } = useRoomStore();
```

**셀렉터 패턴 — 필요한 값만 구독**

```typescript
// RoomHeader.tsx
const reset = useRoomStore((s) => s.reset);
// reset 함수만 구독 — 다른 값이 바뀌어도 이 컴포넌트는 리렌더링 안 됨

// CursorOverlay.tsx
const { cursors, participantId } = useRoomStore();
// cursors나 participantId가 바뀔 때만 리렌더링
```

셀렉터를 쓰면 불필요한 리렌더링을 방지해 성능을 높일 수 있다.

---

### 13-6. 커스텀 훅 조합 패턴

`Canvas.tsx`에서 두 커스텀 훅을 조합해 사용한다.

```typescript
export function Canvas({ roomId, participantId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 훅 1: Yjs 문서와 소켓 동기화 담당
  const { ydoc, yElements } = useYjsCanvas(roomId);

  // 훅 2: ydoc과 yElements를 받아서 드로잉 로직 담당
  //        Canvas DOM(canvasRef)과 내 ID(participantId)도 필요
  const { startDrawing, continueDrawing, stopDrawing, redrawAll } = useCanvasDraw(
    canvasRef,
    ydoc,
    yElements,
    participantId,
  );

  // 이후 useEffect와 이벤트 핸들러에서 위 훅의 반환값을 조합
}
```

**각 훅이 외부에 노출하는 값만 명확히 반환**하기 때문에, 내부 구현(Yjs 트랜잭션, 소켓 이벤트 등)을 알지 않아도 `Canvas`에서 쓸 수 있다.

---

### 13-7. `useEffect` 조기 탈출 패턴

```typescript
// WhiteboardRoom.tsx
const initializedRef = useRef(false);

useEffect(() => {
  if (initializedRef.current) return; // 이미 실행됐으면 탈출
  initializedRef.current = true;

  if (!room || !participantId) {
    router.replace("/");
  }
}, [room, participantId, router]);
```

`initializedRef`를 사용하는 이유: `room`이 의존성에 있으면 `room`이 바뀔 때마다 effect가 재실행된다.  
하지만 홈으로 리다이렉트하는 체크는 **최초 마운트 시 1회만** 해야 한다.  
`useRef`로 플래그를 두어 두 번째 실행부터는 즉시 탈출한다.

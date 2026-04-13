# Collab Whiteboard

**실시간 협업 교육용 화이트보드** — 선생님과 학생이 같은 캔버스를 함께 사용하는 웹 애플리케이션

**[→ 데모 보기](https://whiteboardweb-production.up.railway.app/)**

---

## 주요 기능

### 역할 기반 협업
- **선생님(Teacher)** — 방 개설, 페이지 제어, 그리기 권한 설정
- **학생(Student)** — 6자리 코드로 입장, 권한에 따라 참여 또는 관람

### 실시간 동기화
- **Yjs CRDT** 기반 — 여러 명이 동시에 수정해도 충돌 없이 자동 병합
- **커서 공유** — 모든 참가자의 마우스 위치를 실시간으로 표시
- **레이저 포인터** — 선생님이 설명할 때 시선 유도

### 그리기 도구
| 도구 | 설명 |
|------|------|
| 펜 | 자유 곡선, SVG path 직렬화 |
| 선 / 사각형 / 원 | 도형 추가 및 수정 |
| 텍스트 | 폰트 크기, 굵기, 정렬 설정 |
| 이미지 | 업로드 후 캔버스에 배치 |
| 지우개 | 클릭으로 요소 삭제 |
| 선택 도구 | 이동, 크기 조절, 속성 변경 |

### 페이지 관리
- 페이지 추가 / 삭제 / 순서 변경
- 선생님이 페이지를 넘기면 학생 화면도 자동 이동
- PDF 가져오기(페이지별 배경 렌더링) / PDF로 내보내기

---

## 기술 스택

### Frontend
| 기술 | 용도 |
|------|------|
| Next.js 16 | App Router 기반 React 프레임워크 |
| Fabric.js 5 | 캔버스 렌더링 및 객체 조작 |
| Yjs | CRDT 기반 실시간 상태 동기화 |
| Socket.IO Client | WebSocket 통신 |
| Zustand | 클라이언트 상태 관리 |
| Emotion | CSS-in-JS 스타일링 |
| jsPDF / pdfjs-dist | PDF 내보내기 / 가져오기 |

### Backend
| 기술 | 용도 |
|------|------|
| NestJS 10 | 모듈 기반 Node.js 프레임워크 |
| Socket.IO | WebSocket 서버 (Gateway) |
| Yjs | 서버 측 CRDT 문서 관리 |
| Multer | 이미지 업로드 처리 |

### 인프라 / 공통
| 기술 | 용도 |
|------|------|
| Turborepo | 모노레포 빌드 오케스트레이션 |
| pnpm workspace | 패키지 관리 및 타입 공유 |
| Railway | 배포 플랫폼 |

---

## 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                      클라이언트                       │
│                                                     │
│  Next.js App                                        │
│  ┌──────────────┐   ┌───────────────────────────┐   │
│  │ Fabric.js    │◄──│ useYjsRoom                │   │
│  │ Canvas       │   │  Y.Doc (pages, pageOrder) │   │
│  └──────┬───────┘   └────────────┬──────────────┘   │
│         │ 로컬 변경                │ update / sync    │
└─────────┼────────────────────────┼─────────────────-┘
          │                        │ Socket.IO (WS)
          │              ┌─────────▼──────────────┐
          │              │     NestJS 서버          │
          │              │                        │
          │              │  RoomsGateway           │
          │              │  ┌──────────────────┐  │
          │              │  │ Y.Doc (권위 복사본) │  │
          │              │  │ 참가자 상태       │  │
          │              │  └──────────────────┘  │
          │              │                        │
          │              │  RoomsController (REST) │
          │              │  POST /rooms           │
          │              │  POST /rooms/join       │
          │              │  GET  /rooms/:code     │
          │              │                        │
          │              │  UploadController       │
          └──────────────│  POST /upload          │
                         │  GET  /uploads/*       │
                         └────────────────────────┘
```

### 실시간 동기화 흐름

```
신규 입장자              서버                  기존 참가자
    │                    │                        │
    │── room:join ──────►│                        │
    │◄─ yjs:sync ────────│  (전체 상태 전송)        │
    │                    │                        │
    │── yjs:update ─────►│                        │
    │                    │── yjs:update ─────────►│  (브로드캐스트)
    │                    │                        │
    │── cursor:move ─────►│                        │
    │                    │── cursor:updated ──────►│
    │                    │                        │
  (연결 끊김)             │                        │
                         │── participant:left ────►│
```

---

## 로컬 실행

### 사전 요구사항
- Node.js 20+
- pnpm 9+

### 설치 및 실행

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행 (frontend + backend 동시)
pnpm dev
```

| 서비스 | 주소 |
|--------|------|
| 웹 (Next.js) | http://localhost:3000 |
| 서버 (NestJS) | http://localhost:4000 |

### 개별 실행

```bash
# 백엔드만
pnpm --filter @whiteboard/server dev

# 프론트엔드만
pnpm --filter @whiteboard/web dev
```

---

## 프로젝트 구조

```
collab-whiteboard/
├── apps/
│   ├── server/                 # NestJS 백엔드
│   │   └── src/
│   │       ├── rooms/
│   │       │   ├── rooms.controller.ts   # REST API
│   │       │   ├── rooms.gateway.ts      # WebSocket (Yjs + 커서)
│   │       │   └── rooms.service.ts      # 방/참가자 상태 관리
│   │       └── upload/
│   │           └── upload.controller.ts  # 이미지 업로드 (SHA-256)
│   └── web/                    # Next.js 프론트엔드
│       └── src/
│           ├── hooks/
│           │   ├── useFabricCanvas.ts    # Fabric.js ↔ Yjs 연동
│           │   ├── useYjsRoom.ts         # Yjs ↔ Socket.IO 동기화
│           │   ├── usePageManager.ts     # 페이지 CRUD
│           │   ├── usePdfImport.ts       # PDF → 캔버스 배경
│           │   └── usePdfExport.ts       # 캔버스 → PDF
│           ├── store/
│           │   ├── canvasStore.ts        # 도구/색상 상태 (Zustand)
│           │   └── roomStore.ts          # 방/참가자 상태 (Zustand)
│           └── lib/
│               ├── socket.ts             # Socket.IO 싱글톤
│               └── api.ts                # REST API 클라이언트
└── packages/
    └── types/                  # 서버·클라이언트 공유 타입
        └── src/
            ├── room.ts         # Room, Participant, Role
            ├── canvas.ts       # CanvasElement 유니온 타입
            └── socket.ts       # Socket 이벤트 타입
```

---

## 설계 포인트

### Yjs CRDT로 충돌 없는 실시간 협업
Operational Transformation 대신 CRDT 기반의 Yjs를 선택해, 네트워크 지연이나 동시 편집 상황에서도 모든 클라이언트가 동일한 최종 상태를 보장합니다. 서버는 Yjs 문서의 권위 있는 복사본을 보관하며, 신규 입장자에게 `yjs:sync`로 전체 상태를 즉시 전달합니다.

### 무한 루프 방지 (origin 파라미터)
원격 업데이트(`origin === 'remote'`)는 다시 서버에 전송하지 않아, 업데이트가 네트워크 상에서 무한히 순환하는 문제를 방지합니다.

### Content-Addressable Storage (이미지 중복 제거)
업로드된 이미지는 SHA-256 해시를 파일명으로 저장합니다. 동일한 파일을 여러 번 업로드해도 서버에는 하나만 보관되며, 캔버스에서는 같은 URL을 재사용합니다.

### 공유 타입 패키지 (`@whiteboard/types`)
서버와 클라이언트가 같은 타입을 참조해 Socket 이벤트 페이로드, CanvasElement, Room 구조에서 타입 불일치가 발생하지 않습니다.

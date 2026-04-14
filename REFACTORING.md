# 리팩토링 완료 보고서

> 작업일: 2026-04-14  
> 브랜치: master  
> 기존 기능은 그대로 유지하면서 코드 구조만 개선

---

## 변경 요약

| 단계 | 내용 | 영향 파일 수 |
|------|------|------------|
| 1단계 | Magic strings → `DrawPermission` enum | 7개 |
| 2단계 | `useFabricCanvas.ts` 744줄 → 5개 파일로 분리 | 5개 신규 |
| 3단계 | `Toolbar.tsx` 409줄 → 4개 컴포넌트로 분리 | 4개 신규 |
| 4단계 | WebSocket 에러 핸들링 + ErrorBoundary | 3개 |

---

## 1단계: DrawPermission Enum 도입

### 변경 전
```typescript
// 문자열 리터럴이 코드 전체에 중복 산재
drawPermission: "teacher-only" | "all"
drawPermission === "teacher-only"
```

### 변경 후
```typescript
// packages/types/src/room.ts
export enum DrawPermission {
  TEACHER_ONLY = "teacher-only",
  ALL = "all",
}
```

### 적용 파일
- `packages/types/src/room.ts` — enum 추가, `Room.drawPermission` 타입 변경
- `apps/server/src/rooms/rooms.service.ts` — `DrawPermission.TEACHER_ONLY` 사용
- `apps/web/src/components/canvas/FabricCanvas.tsx`
- `apps/web/src/components/room/WhiteboardRoom.tsx`
- `apps/web/src/components/room/TeacherControlBar.tsx`
- `apps/web/src/hooks/useFabricCanvas.ts`

### 효과
- 오타로 인한 버그 방지 (컴파일 타임 검증)
- IDE 자동완성 지원
- 값 변경 시 한 곳만 수정

---

## 2단계: useFabricCanvas.ts 훅 분리

### 변경 전 구조
```
useFabricCanvas.ts (744줄)
  ├── Effect 1: fabric 초기화 + 모든 이벤트 핸들러
  ├── Effect 2: 페이지 전환 시 캔버스 내용 교체
  ├── Effect 3: Yjs → fabric 부분 업데이트
  ├── Effect 4: 배경색 변경 동기화
  ├── Effect 5: 도구/권한 변경 → fabric 설정
  ├── addRect / addEllipse / addLine / addTextBox / addImage
  ├── applyToSelected / deleteSelected
  └── loadPage / patchCanvas / deserialize / ... (헬퍼 함수 7개)
```

### 변경 후 구조
```
hooks/
  useFabricCanvas.ts          (60줄)  — 얇은 오케스트레이터
  useCanvasSetup.ts           (125줄) — fabric 초기화 + 이벤트 핸들러
  useCanvasSync.ts            (80줄)  — Yjs ↔ 캔버스 동기화 (Effect 2,3,4)
  useCanvasTool.ts            (70줄)  — 도구/권한 → fabric 설정 (Effect 5)
  useCanvasDrawing.ts         (200줄) — 도형 추가 + 속성 편집 + 삭제
  fabricCanvas.utils.ts       (180줄) — 순수 헬퍼 함수 (React 의존 없음)
```

### 각 파일 책임

| 파일 | 책임 | 외부 의존 |
|------|------|-----------|
| `useFabricCanvas.ts` | 공유 ref 생성, 서브훅 조합, API 노출 | 서브훅 전체 |
| `useCanvasSetup.ts` | fabric 인스턴스 생성·정리, 이벤트 바인딩 | fabricCanvas.utils |
| `useCanvasSync.ts` | 페이지 로드, 원격 diff 패치, 배경색 동기화 | fabricCanvas.utils |
| `useCanvasTool.ts` | isDrawingMode, 커서 SVG, selectable 갱신 | 없음 |
| `useCanvasDrawing.ts` | 도형 추가, 속성 편집, 삭제, 스토어 등록 | fabricCanvas.utils |
| `fabricCanvas.utils.ts` | 직렬화/역직렬화 순수 함수 | 없음 (React-free) |

### 공유 ref 전략 (stale closure 방지)
오케스트레이터(`useFabricCanvas`)에서 ref를 생성하고 서브훅에 주입한다.
```typescript
const pageIdRef  = useRef(pageId);
const yPagesRef  = useRef(yPages);
const canDrawRef = useRef(canDraw);
pageIdRef.current  = pageId;   // 렌더마다 최신 값 갱신
yPagesRef.current  = yPages;
canDrawRef.current = canDraw;
```
이벤트 핸들러는 ref를 통해 항상 최신 값에 접근하므로 `useEffect` 의존성 배열 재등록이 불필요하다.

---

## 3단계: Toolbar.tsx 컴포넌트 분리

### 변경 전 구조
```
Toolbar.tsx (409줄)
  ├── SvgIcon 함수 (아이콘 렌더)
  ├── TOOLS / PALETTE / WIDTHS 상수
  ├── Toolbar 컴포넌트
  │   ├── 색상 피커 상태/로직 (pickerOpen, hexInput, popupPos)
  │   ├── 도구 선택 UI
  │   ├── 색상 피커 UI (portal)
  │   ├── 선 두께 UI
  │   └── 텍스트 옵션 UI
  └── styles 객체 (전체 스타일)
```

### 변경 후 구조
```
components/canvas/Toolbar/
  index.tsx           (60줄)  — 조합 + 스토어 접근
  ToolSelector.tsx    (90줄)  — 도구 버튼 + SvgIcon
  ColorPicker.tsx     (130줄) — 팔레트 + hex입력 + portal 팝업
  StrokeSettings.tsx  (100줄) — 선 두께 + 텍스트 옵션
```

### 컴포넌트 설계 원칙
- `index.tsx`만 `useCanvasStore`에 접근 → 하위 컴포넌트는 props만 받음
- 각 컴포넌트는 자신의 스타일을 직접 소유
- 기존 import 경로(`@/components/canvas/Toolbar`)는 변경 없음 (디렉토리 index 자동 해석)

---

## 4단계: 에러 핸들링 추가

### WebSocket Gateway (서버)
```typescript
// 변경 전: try/catch 없음, console.log 사용
handleJoinRoom(...) {
  client.join(data.roomId);
  // ...
}

// 변경 후: try/catch + NestJS Logger + 클라이언트 에러 이벤트
handleJoinRoom(...) {
  try {
    client.join(data.roomId);
    // ...
  } catch (err) {
    this.logger.error(`handleJoinRoom error [${client.id}]:`, err);
    client.emit('room:error', { message: '방 입장 중 오류가 발생했습니다.' });
  }
}
```

적용 핸들러: `handleDisconnect`, `handleJoinRoom`, `handleYjsUpdate`, `handleCursorMove`

### ErrorBoundary (프론트엔드)
```
components/providers/ErrorBoundary.tsx
```
- React class 컴포넌트 기반 (React 19 호환)
- `getDerivedStateFromError` + `componentDidCatch`
- 기본 fallback UI (에러 메시지 + 다시 시도 버튼)
- 커스텀 `fallback` prop으로 교체 가능
- `app/room/[roomId]/page.tsx`에 적용

---

## 파일 변경 목록

### 신규 생성 (9개)
```
packages/types/src/room.ts           DrawPermission enum 추가
apps/web/src/hooks/fabricCanvas.utils.ts
apps/web/src/hooks/useCanvasSetup.ts
apps/web/src/hooks/useCanvasSync.ts
apps/web/src/hooks/useCanvasTool.ts
apps/web/src/hooks/useCanvasDrawing.ts
apps/web/src/components/canvas/Toolbar/index.tsx
apps/web/src/components/canvas/Toolbar/ToolSelector.tsx
apps/web/src/components/canvas/Toolbar/ColorPicker.tsx
apps/web/src/components/canvas/Toolbar/StrokeSettings.tsx
apps/web/src/components/providers/ErrorBoundary.tsx
```

### 수정 (7개)
```
apps/web/src/hooks/useFabricCanvas.ts          744줄 → 60줄 (오케스트레이터)
apps/web/src/components/room/WhiteboardRoom.tsx DrawPermission enum + ErrorBoundary
apps/web/src/components/canvas/FabricCanvas.tsx DrawPermission enum
apps/web/src/components/room/TeacherControlBar.tsx DrawPermission enum
apps/server/src/rooms/rooms.gateway.ts         Logger + try/catch
apps/server/src/rooms/rooms.service.ts         DrawPermission enum
apps/web/src/app/room/[roomId]/page.tsx        ErrorBoundary 적용
```

### 삭제 (1개)
```
apps/web/src/components/canvas/Toolbar.tsx     → Toolbar/ 디렉토리로 대체
```

---

## 기능 동작 검증 체크리스트

리팩토링 후 아래 항목을 직접 테스트해 회귀를 확인한다.

- [ ] 방 생성 / 입장 정상 동작
- [ ] 브러쉬(pen) 그리기 → 두 탭에서 실시간 동기화 확인
- [ ] 도형 추가 (rect, ellipse, line, text, image)
- [ ] 선택 도구 → PropertyPanel 속성 표시 및 수정
- [ ] 지우개 동작
- [ ] 레이저 포인터 커서 표시
- [ ] 페이지 추가 / 삭제 / 전환
- [ ] PDF 불러오기 → 페이지 배경 설정
- [ ] 단축키 동작 (V/B/L/U/O/T/I/E/G, Ctrl+Z/Y)
- [ ] 학생 잠금 / 열기 토글 (DrawPermission 변경)
- [ ] 줌 인/아웃 / 화면 맞춤
- [ ] 배경색 변경 동기화

---

## 향후 개선 제안

1. **fabric.js 타입 개선**: `FabricInstance = any` 대신 [fabric-types](https://www.npmjs.com/package/@types/fabric) 적용
2. **Yjs 에러 처리**: `Y.applyUpdate` 실패 시 상태 복구 로직
3. **테스트 추가**: `fabricCanvas.utils.ts`는 React 의존이 없어 단위 테스트 작성 용이
4. **FabricCanvas.tsx 분리**: 줌/패닝 로직을 `useCanvasZoom` 훅으로 추출 (현재 490줄)

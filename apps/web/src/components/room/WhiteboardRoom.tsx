"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { css } from "@emotion/css";
import dynamic from "next/dynamic";
import { useRoomStore } from "@/store/roomStore";
import { useCanvasStore } from "@/store/canvasStore";
import type { ToolType } from "@whiteboard/types";
import { useSocketRoom } from "@/hooks/useSocketRoom";
import { useYjsRoom } from "@/hooks/useYjsRoom";
import { usePageManager } from "@/hooks/usePageManager";
import { usePdfImport } from "@/hooks/usePdfImport";
import { Toolbar } from "@/components/canvas/Toolbar";
import { PageTabs } from "@/components/canvas/PageTabs";
import { PagePanel } from "@/components/canvas/PagePanel";
import { PropertyPanel } from "@/components/canvas/PropertyPanel";
import { TeacherControlBar } from "./TeacherControlBar";
import { RoomHeader } from "./RoomHeader";

const FabricCanvas = dynamic(
  () => import("@/components/canvas/FabricCanvas").then((m) => m.FabricCanvas),
  { ssr: false },
);

interface Props {
  roomId: string;
}

export function WhiteboardRoom({ roomId }: Props) {
  const router = useRouter();
  const { room, participantId, nickname } = useRoomStore();
  const initializedRef = useRef(false);

  useSocketRoom(roomId);

  const { ydoc, yPages, yPageOrder, yMeta, undo, redo } = useYjsRoom(roomId);

  const isTeacher = !!(room && participantId && room.hostId === participantId);

  const { pageOrder, currentPageId, goToPage, addPage, deletePage, clearPage, movePage } =
    usePageManager({ yPages, yPageOrder, yMeta, ydoc, isTeacher });

  const { triggerImport, importing, importProgress, fileInputRef: pdfInputRef, handleFileChange: handlePdfFileChange } =
    usePdfImport({ yPages, yPageOrder, yMeta, ydoc, isTeacher });

  // drawPermission 구독
  const [drawPermission, setDrawPermission] = useState<"teacher-only" | "all">("teacher-only");
  useEffect(() => {
    const existing = yMeta.get("drawPermission") as "teacher-only" | "all" | undefined;
    if (existing) setDrawPermission(existing);

    const handler = () => {
      const p = yMeta.get("drawPermission") as "teacher-only" | "all";
      if (p) setDrawPermission(p);
    };
    yMeta.observe(handler);
    return () => yMeta.unobserve(handler);
  }, [yMeta]);

  // 전역 키보드 단축키 (Ctrl+Z/Y, 도구 전환, 방향키 페이지 이동)
  useEffect(() => {
    const TOOL_SHORTCUTS: Record<string, ToolType> = {
      v: "select", p: "pen", l: "line", r: "rect",
      e: "ellipse", t: "text", i: "image", x: "eraser", g: "laser",
    };

    const handler = (e: KeyboardEvent) => {
      // input/textarea에 포커스 중이면 무시 (fabric 텍스트 편집 포함)
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      if (e.ctrlKey || e.metaKey) {
        if (!isTeacher) return;
        if (e.key === "z") { e.preventDefault(); undo(); }
        if (e.key === "y") { e.preventDefault(); redo(); }
        return;
      }

      // 방향키 → 페이지 이동 (teacher만)
      if (isTeacher && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        const idx = pageOrder.indexOf(currentPageId);
        if (idx === -1) return;
        const nextIdx = e.key === "ArrowLeft" ? idx - 1 : idx + 1;
        if (nextIdx >= 0 && nextIdx < pageOrder.length) {
          goToPage(pageOrder[nextIdx]);
        }
        return;
      }

      // 도구 단축키 (수정키 없이)
      if (!e.altKey) {
        if (e.key === "Escape") {
          useCanvasStore.getState().setTool("select");
          return;
        }
        const tool = TOOL_SHORTCUTS[e.key.toLowerCase()];
        if (tool) {
          e.preventDefault();
          useCanvasStore.getState().setTool(tool);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isTeacher, undo, redo, pageOrder, currentPageId, goToPage]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (!room || !participantId) router.replace("/");
  }, [room, participantId, router]);

  if (!room || !participantId || !nickname) return null;

  // PDF import hidden input (isTeacher일 때만 동작)
  const pdfFileInput = isTeacher ? (
    <input
      ref={pdfInputRef}
      type="file"
      accept="application/pdf"
      style={{ display: "none" }}
      onChange={handlePdfFileChange}
    />
  ) : null;

  if (!currentPageId) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner} />
        <span>캔버스 준비 중...</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {pdfFileInput}
      <RoomHeader
        room={room}
        isTeacher={isTeacher}
        ydoc={ydoc}
        yPages={yPages}
        yPageOrder={yPageOrder}
      />

      <div className={styles.workspace}>
        {/* 좌측: 도구 모음 */}
        <Toolbar />

        {/* 중앙: 캔버스 영역 */}
        <div className={styles.center}>
          {!isTeacher && (
            <div className={styles.studentBanner}>
              선생님:{" "}
              {room.participants.find((p) => p.id === room.hostId)?.nickname ?? ""}
              {drawPermission === "teacher-only" && (
                <span className={styles.lockBadge}>읽기 전용</span>
              )}
            </div>
          )}

          <FabricCanvas
            roomId={roomId}
            participantId={participantId}
            pageId={currentPageId}
            yPages={yPages}
            yMeta={yMeta}
            ydoc={ydoc}
            isTeacher={isTeacher}
            drawPermission={drawPermission}
          />
        </div>

        {/* 우측: 속성 패널 + 페이지 패널 (teacher only) */}
        {isTeacher && (
          <div className={styles.rightSidebar}>
            <PropertyPanel />
            <div className={styles.sidebarDivider} />
            <PagePanel
              pageOrder={pageOrder}
              currentPageId={currentPageId}
              yPages={yPages}
              ydoc={ydoc}
              isTeacher={isTeacher}
              onGoToPage={goToPage}
              onAddPage={addPage}
              onDeletePage={deletePage}
              onMovePage={movePage}
            />
          </div>
        )}
      </div>

      {/* 하단: 선생님 컨트롤바 + 페이지 탭 */}
      {isTeacher && (
        <TeacherControlBar
          yMeta={yMeta}
          ydoc={ydoc}
          currentPageId={currentPageId}
          onClearPage={clearPage}
          onImportPdf={triggerImport}
          importing={importing}
          importProgress={importProgress}
        />
      )}

      <PageTabs
        pageOrder={pageOrder}
        currentPageId={currentPageId}
        isTeacher={isTeacher}
        onGoToPage={goToPage}
        onAddPage={addPage}
        onDeletePage={deletePage}
      />
    </div>
  );
}

const styles = {
  container: css`
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #0f0f0f;
    overflow: hidden;
  `,
  workspace: css`
    display: flex;
    flex: 1;
    overflow: hidden;
  `,
  center: css`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `,
  rightSidebar: css`
    display: flex;
    flex-direction: row;
    border-left: 1px solid #1f2937;
  `,
  sidebarDivider: css`
    width: 1px;
    background: #1f2937;
    flex-shrink: 0;
  `,
  studentBanner: css`
    padding: 6px 14px;
    background: #1f2937;
    color: #9ca3af;
    font-size: 13px;
    border-bottom: 1px solid #374151;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  `,
  lockBadge: css`
    padding: 2px 8px;
    background: #374151;
    border-radius: 4px;
    font-size: 11px;
    color: #6b7280;
  `,
  loading: css`
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #0f0f0f;
    color: #6b7280;
    font-size: 14px;
    gap: 12px;
  `,
  loadingSpinner: css`
    width: 28px;
    height: 28px;
    border: 3px solid #1f2937;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    @keyframes spin { to { transform: rotate(360deg); } }
  `,
};

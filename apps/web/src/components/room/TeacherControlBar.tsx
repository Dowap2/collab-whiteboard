"use client";

import { css } from "@emotion/css";
import * as Y from "yjs";

interface Props {
  yMeta: Y.Map<string>;
  ydoc: Y.Doc;
  currentPageId: string;
  onClearPage: (pageId: string) => void;
  onImportPdf: () => void;
  importing?: boolean;
  importProgress?: { current: number; total: number } | null;
}

export function TeacherControlBar({
  yMeta,
  ydoc,
  currentPageId,
  onClearPage,
  onImportPdf,
  importing,
  importProgress,
}: Props) {
  // drawPermission은 props로 받는 게 맞지만 여기선 yMeta에서 직접 읽음
  // WhiteboardRoom에서 이미 observer가 설정되어 있으므로 재렌더 시 최신 값 반영됨
  const drawPermission = (yMeta.get("drawPermission") ?? "teacher-only") as
    | "teacher-only"
    | "all";

  const togglePermission = () => {
    const next = drawPermission === "teacher-only" ? "all" : "teacher-only";
    ydoc.transact(() => yMeta.set("drawPermission", next));
  };

  return (
    <div className={styles.bar}>
      <button className={styles.btn} onClick={togglePermission}>
        {drawPermission === "teacher-only" ? "학생 잠금" : "학생 열기"}
      </button>

      <button
        className={`${styles.btn} ${styles.pdfBtn}`}
        onClick={onImportPdf}
        disabled={importing}
        title="PDF를 불러와 각 페이지를 배경으로 설정합니다"
      >
        {importing
          ? importProgress
            ? `PDF 변환 중... (${importProgress.current}/${importProgress.total})`
            : "PDF 처리 중..."
          : "PDF 불러오기"}
      </button>

      <button
        className={`${styles.btn} ${styles.danger}`}
        onClick={() => {
          if (confirm("현재 페이지를 초기화하시겠습니까?")) {
            onClearPage(currentPageId);
          }
        }}
      >
        페이지 초기화
      </button>
    </div>
  );
}

const styles = {
  bar: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: #111827;
    border-top: 1px solid #374151;
  `,
  btn: css`
    padding: 6px 14px;
    border-radius: 6px;
    border: 1px solid #4b5563;
    background: #1f2937;
    color: #f3f4f6;
    font-size: 13px;
    cursor: pointer;
    &:hover {
      background: #374151;
    }
  `,
  danger: css`
    border-color: #dc2626;
    color: #fca5a5;
    &:hover {
      background: #7f1d1d;
    }
  `,
  pdfBtn: css`
    border-color: #7c3aed;
    color: #c4b5fd;
    &:hover {
      background: #4c1d95;
    }
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `,
};

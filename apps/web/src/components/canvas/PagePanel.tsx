"use client";

import { css } from "@emotion/css";
import * as Y from "yjs";
import type { CanvasElement } from "@whiteboard/types";

interface Props {
  pageOrder: string[];
  currentPageId: string;
  yPages: Y.Map<Y.Array<CanvasElement>>;
  ydoc: Y.Doc;
  isTeacher: boolean;
  onGoToPage: (pageId: string) => void;
  onAddPage: () => void;
  onDeletePage: (pageId: string) => void;
  onMovePage: (fromIdx: number, toIdx: number) => void;
}

export function PagePanel({
  pageOrder,
  currentPageId,
  yPages,
  ydoc,
  isTeacher,
  onGoToPage,
  onAddPage,
  onDeletePage,
  onMovePage,
}: Props) {
  const dragRef = { current: -1 };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>페이지</span>
        {isTeacher && (
          <button className={styles.addBtn} onClick={onAddPage} title="페이지 추가">
            +
          </button>
        )}
      </div>

      <div className={styles.list}>
        {pageOrder.map((pageId, idx) => {
          const elementCount = yPages.get(pageId)?.length ?? 0;
          return (
            <div
              key={pageId}
              className={`${styles.pageItem} ${pageId === currentPageId ? styles.active : ""}`}
              onClick={() => isTeacher && onGoToPage(pageId)}
              draggable={isTeacher}
              onDragStart={() => { dragRef.current = idx; }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragRef.current !== -1 && dragRef.current !== idx) {
                  onMovePage(dragRef.current, idx);
                  dragRef.current = -1;
                }
              }}
            >
              <div className={styles.thumbnail}>
                <div className={styles.thumbnailInner}>
                  <span className={styles.thumbnailText}>{idx + 1}</span>
                  <span className={styles.elementCount}>{elementCount}개</span>
                </div>
              </div>
              <div className={styles.pageInfo}>
                <span className={styles.pageLabel}>페이지 {idx + 1}</span>
                {isTeacher && pageOrder.length > 1 && (
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePage(pageId);
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  panel: css`
    width: 160px;
    flex-shrink: 0;
    background: #0f172a;
    border-left: 1px solid #1f2937;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px 8px;
    border-bottom: 1px solid #1f2937;
  `,
  title: css`
    font-size: 11px;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `,
  addBtn: css`
    width: 22px;
    height: 22px;
    border-radius: 4px;
    background: #1f2937;
    border: 1px solid #374151;
    color: #9ca3af;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    &:hover { color: #f3f4f6; background: #374151; }
  `,
  list: css`
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  `,
  pageItem: css`
    border-radius: 6px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: border-color 0.15s;
    &:hover { border-color: #374151; }
  `,
  active: css`
    border-color: #2563eb !important;
  `,
  thumbnail: css`
    width: 100%;
    aspect-ratio: 210 / 297;
    background: #1a1a2e;
    border-radius: 4px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  `,
  thumbnailInner: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  `,
  thumbnailText: css`
    font-size: 20px;
    font-weight: 700;
    color: #374151;
  `,
  elementCount: css`
    font-size: 10px;
    color: #4b5563;
  `,
  pageInfo: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 6px;
  `,
  pageLabel: css`
    font-size: 11px;
    color: #6b7280;
  `,
  deleteBtn: css`
    background: none;
    border: none;
    color: #4b5563;
    font-size: 14px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    &:hover { color: #ef4444; }
  `,
};

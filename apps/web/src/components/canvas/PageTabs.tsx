"use client";

import { css } from "@emotion/css";

interface Props {
  pageOrder: string[];
  currentPageId: string;
  isTeacher: boolean;
  onGoToPage: (pageId: string) => void;
  onAddPage: () => void;
  onDeletePage: (pageId: string) => void;
}

export function PageTabs({
  pageOrder,
  currentPageId,
  isTeacher,
  onGoToPage,
  onAddPage,
  onDeletePage,
}: Props) {
  return (
    <div className={styles.tabs}>
      {pageOrder.map((pageId, idx) => (
        <div
          key={pageId}
          className={`${styles.tab} ${pageId === currentPageId ? styles.active : ""}`}
          onClick={() => isTeacher && onGoToPage(pageId)}
        >
          <span>{idx + 1}</span>
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
      ))}
      {isTeacher && (
        <button className={styles.addBtn} onClick={onAddPage}>
          +
        </button>
      )}
    </div>
  );
}

const styles = {
  tabs: css`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 12px;
    background: #111827;
    border-top: 1px solid #374151;
    overflow-x: auto;
  `,
  tab: css`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 12px;
    border-radius: 4px;
    background: #1f2937;
    color: #9ca3af;
    font-size: 13px;
    cursor: pointer;
    user-select: none;
    &:hover {
      background: #374151;
    }
  `,
  active: css`
    background: #2563eb;
    color: #fff;
  `,
  deleteBtn: css`
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 14px;
    padding: 0;
    line-height: 1;
    opacity: 0.7;
    &:hover {
      opacity: 1;
    }
  `,
  addBtn: css`
    padding: 4px 10px;
    border-radius: 4px;
    border: 1px dashed #4b5563;
    background: transparent;
    color: #9ca3af;
    font-size: 16px;
    cursor: pointer;
    &:hover {
      color: #f3f4f6;
      border-color: #6b7280;
    }
  `,
};

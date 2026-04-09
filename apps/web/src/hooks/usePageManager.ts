"use client";

import { useEffect, useState, useCallback } from "react";
import * as Y from "yjs";
import { v4 as uuidv4 } from "uuid";
import type { CanvasElement } from "@whiteboard/types";

interface UsePageManagerOptions {
  yPages: Y.Map<Y.Array<CanvasElement>>;
  yPageOrder: Y.Array<string>;
  yMeta: Y.Map<string>;
  ydoc: Y.Doc;
  isTeacher: boolean;
}

export function usePageManager({
  yPages,
  yPageOrder,
  yMeta,
  ydoc,
  isTeacher,
}: UsePageManagerOptions) {
  const [pageOrder, setPageOrder] = useState<string[]>(() => yPageOrder.toArray());
  const [currentPageId, setCurrentPageId] = useState<string>(() => {
    return yMeta.get("currentPage") ?? "";
  });

  // 초기 페이지 생성 (teacher만, 페이지가 없을 때)
  useEffect(() => {
    if (!isTeacher) return;
    if (yPageOrder.length > 0) return;

    const pageId = uuidv4();
    ydoc.transact(() => {
      yPages.set(pageId, new Y.Array<CanvasElement>());
      yPageOrder.push([pageId]);
      yMeta.set("currentPage", pageId);
      yMeta.set("drawPermission", "teacher-only");
    });
  }, [isTeacher, ydoc, yMeta, yPageOrder, yPages]);

  // pageOrder 구독
  useEffect(() => {
    setPageOrder(yPageOrder.toArray()); // 현재 값 즉시 반영
    const handler = () => setPageOrder(yPageOrder.toArray());
    yPageOrder.observe(handler);
    return () => yPageOrder.unobserve(handler);
  }, [yPageOrder]);

  // currentPage 구독 (teacher 변경 → 학생 자동 이동)
  // ※ observer 등록 시점에 이미 init effect가 실행됐을 수 있으므로 현재 값도 즉시 읽음
  useEffect(() => {
    const existing = yMeta.get("currentPage");
    if (existing) setCurrentPageId(existing);

    const handler = () => {
      const page = yMeta.get("currentPage");
      if (page) setCurrentPageId(page);
    };
    yMeta.observe(handler);
    return () => yMeta.unobserve(handler);
  }, [yMeta]);

  const goToPage = useCallback(
    (pageId: string) => {
      if (!isTeacher) return;
      ydoc.transact(() => yMeta.set("currentPage", pageId));
    },
    [isTeacher, ydoc, yMeta],
  );

  const addPage = useCallback(() => {
    if (!isTeacher) return;
    const pageId = uuidv4();
    ydoc.transact(() => {
      yPages.set(pageId, new Y.Array<CanvasElement>());
      yPageOrder.push([pageId]);
      yMeta.set("currentPage", pageId);
    });
  }, [isTeacher, ydoc, yMeta, yPageOrder, yPages]);

  const deletePage = useCallback(
    (pageId: string) => {
      if (!isTeacher || yPageOrder.length <= 1) return;
      const idx = yPageOrder.toArray().indexOf(pageId);
      if (idx === -1) return;

      ydoc.transact(() => {
        yPages.delete(pageId);
        yPageOrder.delete(idx, 1);
        // 삭제 후 currentPage 조정
        const newOrder = yPageOrder.toArray();
        const nextId = newOrder[Math.max(0, idx - 1)];
        if (nextId) yMeta.set("currentPage", nextId);
      });
    },
    [isTeacher, ydoc, yMeta, yPageOrder, yPages],
  );

  const clearPage = useCallback(
    (pageId: string) => {
      if (!isTeacher) return;
      const yArr = yPages.get(pageId);
      if (!yArr) return;
      ydoc.transact(() => yArr.delete(0, yArr.length));
    },
    [isTeacher, ydoc, yPages],
  );

  const movePage = useCallback(
    (fromIdx: number, toIdx: number) => {
      if (!isTeacher) return;
      const order = yPageOrder.toArray();
      if (fromIdx < 0 || toIdx < 0 || fromIdx >= order.length || toIdx >= order.length) return;
      const [moved] = order.splice(fromIdx, 1);
      order.splice(toIdx, 0, moved);
      ydoc.transact(() => {
        yPageOrder.delete(0, yPageOrder.length);
        yPageOrder.push(order);
      });
    },
    [isTeacher, ydoc, yPageOrder],
  );

  return {
    pageOrder,
    currentPageId,
    goToPage,
    addPage,
    deletePage,
    clearPage,
    movePage,
  };
}

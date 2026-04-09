"use client";

import { useEffect, useRef, useCallback } from "react";
import * as Y from "yjs";
import { getSocket } from "@/lib/socket";
import { encodeBase64, decodeBase64 } from "@/lib/encoding";
import type { CanvasElement } from "@whiteboard/types";

export interface YjsRoom {
  ydoc: Y.Doc;
  yPages: Y.Map<Y.Array<CanvasElement>>;
  yPageOrder: Y.Array<string>;
  yMeta: Y.Map<string>;
  undo: () => void;
  redo: () => void;
}

export function useYjsRoom(roomId: string): YjsRoom {
  const ydocRef = useRef<Y.Doc>(new Y.Doc());
  const undoManagerRef = useRef<Y.UndoManager | null>(null);

  const yPages = ydocRef.current.getMap<Y.Array<CanvasElement>>("pages");
  const yPageOrder = ydocRef.current.getArray<string>("pageOrder");
  const yMeta = ydocRef.current.getMap<string>("meta");

  // UndoManager: yPages와 yPageOrder 변경 추적
  useEffect(() => {
    undoManagerRef.current = new Y.UndoManager([yPages, yPageOrder], {
      trackedOrigins: new Set(["local"]),
    });
    return () => undoManagerRef.current?.destroy();
  }, [yPages, yPageOrder]);

  const undo = useCallback(() => undoManagerRef.current?.undo(), []);
  const redo = useCallback(() => undoManagerRef.current?.redo(), []);

  useEffect(() => {
    const ydoc = ydocRef.current;
    const socket = getSocket();

    const onSync = (base64: string) => {
      const update = decodeBase64(base64);
      Y.applyUpdate(ydoc, update);
    };

    const onUpdate = (base64: string) => {
      const update = decodeBase64(base64);
      Y.applyUpdate(ydoc, update, "remote");
    };

    socket.on("yjs:sync", onSync);
    socket.on("yjs:update", onUpdate);

    const handleYDocUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === "remote") return;
      const base64 = encodeBase64(update);
      socket.emit("yjs:update", { roomId, update: base64 });
    };

    ydoc.on("update", handleYDocUpdate);

    return () => {
      socket.off("yjs:sync", onSync);
      socket.off("yjs:update", onUpdate);
      ydoc.off("update", handleYDocUpdate);
    };
  }, [roomId]);

  return {
    ydoc: ydocRef.current,
    yPages,
    yPageOrder,
    yMeta,
    undo,
    redo,
  };
}

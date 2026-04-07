"use client";

import { useEffect, useRef } from "react";
import * as Y from "yjs";
import { getSocket } from "@/lib/socket";
import { encodeBase64, decodeBase64 } from "@/lib/encoding";
import type { CanvasElement } from "@whiteboard/types";

export function useYjsCanvas(roomId: string) {
  const ydocRef = useRef<Y.Doc>(new Y.Doc());
  const yElementsRef = useRef<Y.Array<CanvasElement>>(
    ydocRef.current.getArray<CanvasElement>("elements"),
  );

  useEffect(() => {
    const ydoc = ydocRef.current;
    const socket = getSocket();

    const onSync = (base64: string) => {
      const update = decodeBase64(base64);
      Y.applyUpdate(ydoc, update);
    };

    const onUpdate = (base64: string) => {
      const update = decodeBase64(base64);
      Y.applyUpdate(ydoc, update, 'remote');
    };

    socket.on("yjs:sync" as never, onSync);
    socket.on("yjs:update" as never, onUpdate);

    const handleYDocUpdate = (update: Uint8Array, origin: unknown) => {
      // origin이 "remote"면 소켓에서 받은 업데이트 → 다시 보내지 않음
      if (origin === "remote") return;
      const base64 = encodeBase64(update);
      socket.emit("yjs:update" as never, { roomId, update: base64 });
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
    yElements: yElementsRef.current,
  };
}

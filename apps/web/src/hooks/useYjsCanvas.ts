"use client";

import { useEffect, useRef } from "react";
import * as Y from "yjs";
import { getSocket } from "@/lib/socket";
import type { CanvasElement } from "@whiteboard/types";

export function useYjsCanvas(roomId: string) {
  const ydocRef = useRef<Y.Doc>(new Y.Doc());
  const yElementsRef = useRef<Y.Array<CanvasElement>>(ydocRef.current.getArray<CanvasElement>("elements"));

  useEffect(() => {
    const ydoc = ydocRef.current;
    const socket = getSocket();

    socket.on("yjs:sync" as never, (base64: string) => {
      const update = Uint8Array.from(Buffer.from(base64, "base64"));
      Y.applyUpdate(ydoc, update);
    });

    socket.on("yjs:update" as never, (base64: string) => {
      const update = Uint8Array.from(Buffer.from(base64, "base64"));
      Y.applyUpdate(ydoc, update);
    });

    ydoc.on("update", (update: Uint8Array) => {
      const base64 = Buffer.from(update).toString("base64");
      socket.emit("yjs:update" as never, { roomId, update: base64 });
    });

    return () => {
      socket.off("yjs:sync");
      socket.off("yjs:update");
    };
  }, [roomId]);

  return {
    ydoc: ydocRef.current,
    yElements: yElementsRef.current,
  };
}

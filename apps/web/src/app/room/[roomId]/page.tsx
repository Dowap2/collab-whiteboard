"use client";

import { use } from "react";
import { WhiteboardRoom } from "@/components/room/WhiteboardRoom";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

interface Props {
  params: Promise<{ roomId: string }>;
}

export default function RoomPage({ params }: Props) {
  const { roomId } = use(params);
  return (
    <ErrorBoundary>
      <WhiteboardRoom roomId={roomId} />
    </ErrorBoundary>
  );
}

"use client";

import { use } from "react";
import { WhiteboardRoom } from "@/components/room/WhiteboardRoom";

interface Props {
  params: Promise<{ roomId: string }>;
}

export default function RoomPage({ params }: Props) {
  const { roomId } = use(params);
  return <WhiteboardRoom roomId={roomId} />;
}

import type { CreateRoomDto, JoinRoomDto, JoinRoomResponse, Room } from "@whiteboard/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message ?? "Request failed");
  }
  return res.json();
}

export const api = {
  createRoom: (dto: CreateRoomDto) =>
    request<JoinRoomResponse>("/rooms", {
      method: "POST",
      body: JSON.stringify(dto),
    }),

  joinRoom: (dto: JoinRoomDto) =>
    request<JoinRoomResponse>("/rooms/join", {
      method: "POST",
      body: JSON.stringify(dto),
    }),

  getRoom: (code: string) =>
    request<Room>(`/rooms/${code}`),
};

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { css } from "@emotion/css";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRoomStore } from "@/store/roomStore";
import { QueryProvider } from "@/components/providers/QueryProvider";

function HomeScreenInner() {
  const router = useRouter();
  const setRoom = useRoomStore((s) => s.setRoom);

  const [tab, setTab] = useState<"create" | "join">("create");
  const [nickname, setNickname] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");

  const createMutation = useMutation({
    mutationFn: api.createRoom,
    onSuccess: ({ room, participantId }) => {
      setRoom(room, participantId, nickname);
      router.push(`/room/${room.id}`);
    },
    onError: (e: Error) => setError(e.message),
  });

  const joinMutation = useMutation({
    mutationFn: api.joinRoom,
    onSuccess: ({ room, participantId }) => {
      setRoom(room, participantId, nickname);
      router.push(`/room/${room.id}`);
    },
    onError: (e: Error) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!nickname.trim()) return setError("닉네임을 입력해주세요");

    if (tab === "create") {
      if (!roomName.trim()) return setError("방 이름을 입력해주세요");
      createMutation.mutate({ nickname: nickname.trim(), roomName: roomName.trim() });
    } else {
      if (!roomCode.trim()) return setError("방 코드를 입력해주세요");
      joinMutation.mutate({ nickname: nickname.trim(), code: roomCode.trim().toUpperCase() });
    }
  };

  const isPending = createMutation.isPending || joinMutation.isPending;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Collab Whiteboard</h1>
        <p className={styles.subtitle}>실시간 협업 화이트보드</p>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === "create" ? styles.tabActive : ""}`}
            onClick={() => setTab("create")}
          >
            방 만들기
          </button>
          <button
            className={`${styles.tab} ${tab === "join" ? styles.tabActive : ""}`}
            onClick={() => setTab("join")}
          >
            방 참여
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            placeholder="닉네임"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
          />

          {tab === "create" ? (
            <input
              className={styles.input}
              placeholder="방 이름"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              maxLength={30}
            />
          ) : (
            <input
              className={styles.input}
              placeholder="방 코드 (예: ABC123)"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              maxLength={6}
              style={{ textTransform: "uppercase" }}
            />
          )}

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.button} type="submit" disabled={isPending}>
            {isPending ? "처리 중..." : tab === "create" ? "방 만들기" : "입장하기"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function HomeScreen() {
  return (
    <QueryProvider>
      <HomeScreenInner />
    </QueryProvider>
  );
}

const styles = {
  container: css`
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0f0f0f;
  `,
  card: css`
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    border-radius: 16px;
    padding: 40px;
    width: 100%;
    max-width: 400px;
  `,
  title: css`
    font-size: 28px;
    font-weight: 700;
    text-align: center;
    color: #ffffff;
    margin-bottom: 4px;
  `,
  subtitle: css`
    text-align: center;
    color: #666;
    font-size: 14px;
    margin-bottom: 32px;
  `,
  tabs: css`
    display: flex;
    background: #111;
    border-radius: 8px;
    padding: 4px;
    margin-bottom: 24px;
  `,
  tab: css`
    flex: 1;
    padding: 8px;
    border-radius: 6px;
    font-size: 14px;
    color: #666;
    transition: all 0.2s;
    &:hover { color: #fff; }
  `,
  tabActive: css`
    background: #2a2a2a;
    color: #ffffff;
  `,
  form: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  input: css`
    background: #111;
    border: 1px solid #2a2a2a;
    border-radius: 8px;
    padding: 12px 16px;
    color: #fff;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
    &:focus { border-color: #4a9eff; }
    &::placeholder { color: #444; }
  `,
  error: css`
    color: #ff6b6b;
    font-size: 13px;
    text-align: center;
  `,
  button: css`
    background: #4a9eff;
    color: #fff;
    border-radius: 8px;
    padding: 12px;
    font-size: 15px;
    font-weight: 600;
    margin-top: 8px;
    transition: background 0.2s;
    &:hover:not(:disabled) { background: #3a8eef; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  `,
};

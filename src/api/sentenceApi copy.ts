import type { SentenceSceneData } from "../types/SentenceSceneData";

export type NextResponse =
  | { done: true; message?: string }
  | { done: false; data: SentenceSceneData };

function getTabPlayerId(): string {
  const key = "player_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export async function fetchNextSentence(): Promise<NextResponse> {
  const playerId = getTabPlayerId();

  const res = await fetch("http://localhost:5000/api/next", {
    method: "GET",
    headers: {
      "X-Player-Id": playerId,
    },
  });

  if (!res.ok) {
    throw new Error(`Server error: ${res.status}`);
  }

  return (await res.json()) as NextResponse;
}

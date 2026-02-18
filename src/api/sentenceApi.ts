import type { SentenceSceneData } from "../types/SentenceSceneData";

// const API_BASE = "http://46.62.200.84:5000" //"http://localhost:5000";
const API_BASE = `${window.location.protocol}//${window.location.hostname}:5000`;

console.log(API_BASE);

export type ScreenKind = "sentence" | "vocab";

export type SequenceInfo = { id: string; name: string; kind: ScreenKind };
export type SequencesResponse = { sequences: SequenceInfo[] };


// export type PronunciationEntry = { key: string; url: string };

export type SelectResponse =
  | { ok: true; sequenceId: string; pronunciations: Record<string,string>; images: Record<string,string> }
  | { ok: false; error: string };

export type NextResponse =
  | { done: true; message?: string }
  | { done: false; data: SentenceSceneData };

function getTabPlayerId(): string {
  const key = "player_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = generateUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

function generateUUID(): string {
  // Use native randomUUID if available
 if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
   return crypto.randomUUID();
  }

  // Fallback (RFC4122-ish, good enough for session IDs)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/*******************
function getTabPlayerId(): string {
  const key = "player_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = generateUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}
*****************/


function playerHeaders(): HeadersInit {
  return {
    "X-Player-Id": getTabPlayerId(),
    "Content-Type": "application/json",
  };
}

export async function fetchSequences(): Promise<SequencesResponse> {
       console.log('Fetching..')
  const res = await fetch(`${API_BASE}/api/sequences`, {
    method: "GET",
    headers: { "X-Player-Id": getTabPlayerId() },
  });
  console.log(res)
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return (await res.json()) as SequencesResponse;
}

export async function selectSequence(sequenceId: string): Promise<SelectResponse> {
  const res = await fetch(`${API_BASE}/api/select`, {
    method: "POST",
    headers: playerHeaders(),
    body: JSON.stringify({ sequenceId }),
  });


  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return (await res.json()) as SelectResponse;
}

export async function fetchNextSentence(payload?: { attempt?: string[]; success?: boolean }): Promise<NextResponse> {
  const res = await fetch(`${API_BASE}/api/next`, {
    method: "POST",
    headers: playerHeaders(),
    body: JSON.stringify(payload ?? {}),
  });

  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return (await res.json()) as NextResponse;
}

/** Helper for turning server-relative resource URLs into absolute ones. */
export function toAbsoluteServerUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
}

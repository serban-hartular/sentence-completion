import type {
  ScreenDataByKind,
  ScreenDataTypeNameByKind,
} from "../types/screenData";
import { APP_CONTEXT } from "./appContext";
import type { ScreenKind } from "../scenes/screenRegistry";
import type { ScreenResourceManifests } from "../scenes/screenFlow";

// const API_BASE = "http://46.62.200.84:5000" //"http://localhost:5000";
//const API_BASE = `${window.location.protocol}//${window.location.hostname}:5000`;
const API_BASE = ''


export type SequenceInfo = { id: string; name: string; color: string };
export type SequencesResponse = { sequences: SequenceInfo[] };


// export type PronunciationEntry = { key: string; url: string };

export type SelectResponse =
  | { ok: true; sequenceId: string }
  | { ok: false; error: string };

export type NextScreenResponseByKind = {
  [K in ScreenKind]: {
    done: false;
    kind: K;
    data: ScreenDataByKind[K];
    dataTypeName?: ScreenDataTypeNameByKind[K];
  } & ScreenResourceManifests;
}[ScreenKind];

export type NextResponse =
  | { done: true; message?: string }
  | NextScreenResponseByKind;

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
       console.log(APP_CONTEXT)
  const res = await fetch(`${API_BASE}/api/sequences`, {
    method: "POST",
    headers: {  "X-Player-Id": getTabPlayerId() ,
       "Content-Type": "application/json",
                // "X-App-Lang": APP_CONTEXT.lang,
                // "X-App-Unit": APP_CONTEXT.unit ?? ""
    },
    body: JSON.stringify({
      "lang": APP_CONTEXT.lang,
      "unit": APP_CONTEXT.unit ?? ""
    }),
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

export async function fetchNextSentence(payload?: { attempt?: unknown; success?: boolean }): Promise<NextResponse> {
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

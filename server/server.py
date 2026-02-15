from __future__ import annotations

import random
import time
import uuid
from typing import Any, Dict, Optional, Tuple

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)

# Allow your Vite dev server to talk to Flask
CORS(app, supports_credentials=False, origins=["http://localhost:5173"])


# ----------------------------
# Data: sequences + resources
# ----------------------------

SEQUENCES = [
    {
        "id": "animals_1",
        "name": "Animals (Easy)",
        "sentences": [
            {
                "prompt": "Build the sentence!",
                "slots": ["The", "", "", ""],
                "bankWords": ["cat", "is", "sleeping", "running"],
                "correct": ["The", "cat", "is", "sleeping"],
                "initialMovable": False,
            },
            {
                "prompt": "Build the sentence!",
                "slots": ["The", "", ""],
                "bankWords": ["dog", "runs", "barks"],
                "correct": ["The", "dog", "runs"],
                "initialMovable": False,
            },
            {
                "prompt": "Build the sentence!",
                "slots": ["I", "", ""],
                "bankWords": ["see", "a", "cat"],
                "correct": ["I", "see", "cat"],
                "initialMovable": False,
            },
        ],
        "pronunciations": {
            "cat": "/assets/pron/Meow.ogg",
            "dog": "/assets/pron/dog_barking.ogg",
        },
    },
    {
        "id": "verbs_1",
        "name": "Action Words",
        "sentences": [
            {
                "prompt": "Make the sentence:",
                "slots": ["We", "", ""],
                "bankWords": ["play", "outside", "inside"],
                "correct": ["We", "play", "outside"],
                "initialMovable": False,
            },
            {
                "prompt": "Make the sentence:",
                "slots": ["I", "", ""],
                "bankWords": ["jump", "high", "low"],
                "correct": ["I", "jump", "high"],
                "initialMovable": False,
            },
            {
                "prompt": "Make the sentence:",
                "slots": ["They", "", ""],
                "bankWords": ["run", "fast", "slow"],
                "correct": ["They", "run", "fast"],
                "initialMovable": False,
            },
        ],
        "pronunciations": {
        },
    },
]

SEQ_BY_ID = {s["id"]: s for s in SEQUENCES}


# ----------------------------
# Player state (in-memory)
# ----------------------------

# player_id -> state
# state = {
#   "last_seen": float,
#   "sequenceId": Optional[str],
#   "queue": list[int],
#   "history": list[{"attempt": ..., "success": ...}]
# }
PLAYER: Dict[str, Dict[str, Any]] = {}
TTL_SECONDS = 60 * 30  # 30 minutes


def _player_id() -> str:
    # Tab-scoped ID from the client is recommended (X-Player-Id header).
    return request.headers.get("X-Player-Id") or str(uuid.uuid4())


def _cleanup_players() -> None:
    now = time.time()
    stale = [pid for pid, st in PLAYER.items() if now - st.get("last_seen", 0) > TTL_SECONDS]
    for pid in stale:
        del PLAYER[pid]


def _ensure_player(pid: str) -> Dict[str, Any]:
    _cleanup_players()
    st = PLAYER.get(pid)
    if not st:
        st = {"last_seen": time.time(), "sequenceId": None, "queue": [], "history": []}
        PLAYER[pid] = st
    st["last_seen"] = time.time()
    return st


def _reset_queue_for_player(st: Dict[str, Any], seq_id: str) -> None:
    n = len(SEQ_BY_ID[seq_id]["sentences"])
    indices = list(range(n))
    random.shuffle(indices)
    st["queue"] = indices
    st["history"] = []


# ----------------------------
# Core sequencing logic
# ----------------------------

def get_next_sentence(player_state: Dict[str, Any], result_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Return the next sentence dict for this player, or a {done: True, ...} object.

    Args:
      player_state: the per-player state dict (mutated in place).
      result_data: dict like {"attempt": [...], "success": bool} (may be empty).

    For now:
      - append result_data to history (if present)
      - return next sentence in the player's queue
      - if queue is empty, return done
    """
    # record result (optional)
    attempt = result_data.get("attempt", None)
    success = result_data.get("success", None)
    if attempt is not None or success is not None:
        player_state["history"].append({"attempt": attempt, "success": success})

    # must have a selected sequence
    seq_id = player_state.get("sequenceId")
    if not seq_id:
        return {"done": True, "message": "No sequence selected."}

    queue = player_state.get("queue", [])
    if not queue:
        return {"done": True, "message": "No more sentences."}

    idx = queue.pop(0)
    sentence = SEQ_BY_ID[seq_id]["sentences"][idx]
    return {"done": False, "data": sentence}


# ----------------------------
# Routes
# ----------------------------

@app.get("/api/sequences")
def api_sequences():
    return jsonify({"sequences": [{"id": s["id"], "name": s["name"]} for s in SEQUENCES]})


@app.post("/api/select")
def api_select():
    pid = _player_id()
    st = _ensure_player(pid)

    body = request.get_json(force=True) or {}
    seq_id = body.get("sequenceId")

    if seq_id not in SEQ_BY_ID:
        return jsonify({"ok": False, "error": "Unknown sequenceId"}), 400

    st["sequenceId"] = seq_id
    _reset_queue_for_player(st, seq_id)

    # pronunciation manifest: word -> {key, url}
    pron = {
        word: {"key": f"pron_{word}", "url": url}
        for word, url in SEQ_BY_ID[seq_id]["pronunciations"].items()
    }

    return jsonify({"ok": True, "sequenceId": seq_id, "pronunciations": pron})


@app.post("/api/next")
def api_next():
    pid = _player_id()
    st = _ensure_player(pid)

    body = request.get_json(silent=True) or {}
    result_data = {
        "attempt": body.get("attempt"),
        "success": body.get("success"),
    }

    payload = get_next_sentence(st, result_data)

    # If no sequence selected, treat as a client error (still returns a useful message)
    if payload.get("done") is True and payload.get("message") == "No sequence selected.":
        return jsonify(payload), 400

    return jsonify(payload)


# Optional dev helper
@app.post("/api/reset")
def api_reset():
    pid = _player_id()
    st = _ensure_player(pid)

    if not st.get("sequenceId"):
        return jsonify({"ok": False, "error": "No sequence selected."}), 400

    _reset_queue_for_player(st, st["sequenceId"])
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(host="localhost", port=5000, debug=True)

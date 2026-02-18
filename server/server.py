from __future__ import annotations

import dataclasses
import random
import time
import uuid
from typing import Any, Dict, Optional, Tuple
from question import QuestionSequenceFactory, QuestionData

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)

# Allow your Vite dev server to talk to Flask
# CORS(app, supports_credentials=False, origins=["http://localhost:5173", "http://http://46.62.200.84:5173"])
from flask_cors import CORS

CORS(
    app,
    supports_credentials=False, 
    resources={r"/api/*": {"origins": ["http://46.62.200.84:5173", "http://localhost:5173"]}},
    allow_headers=["Content-Type", "X-Player-Id"],
    methods=["GET", "POST", "OPTIONS"],
)


from engl_question_gen import MakeQuestionSequence
from etre_avoir import EtreAvoir, Numeros
from vocab_simple import VocabSimple

SequenceFactories = [MakeQuestionSequence, EtreAvoir, Numeros, VocabSimple]

@dataclasses.dataclass
class PlayerState:
    player_id : str
    seq_factory : QuestionSequenceFactory
    last_seen: float = -1

    def __post_init(self):
        if self.last_seen < 0:
            self.last_seen = time.time()




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
PLAYERS: Dict[str, PlayerState] = {}
TTL_SECONDS = 60 * 30  # 30 minutes


def _player_id() -> str:
    # Tab-scoped ID from the client is recommended (X-Player-Id header).
    return request.headers.get("X-Player-Id") or str(uuid.uuid4())


def _cleanup_players() -> None:
    now = time.time()
    stale = [pid for pid, pstate in PLAYERS.items() if now - pstate.last_seen > TTL_SECONDS]
    for pid in stale:
        del PLAYERS[pid]


# 
# ----------------------------
# Routes
# ----------------------------

@app.get("/api/sequences")
def api_sequences():
    return jsonify( {"sequences": [{"id":n.CLASS_NAME, "name":n.CLASS_NAME, "kind":n.SCREEN_KIND} for n in SequenceFactories]})


@app.post("/api/select")
def api_select():
    pid = _player_id()

    body = request.get_json(force=True) or {}
    seq_id = body.get("sequenceId")

    Factory = None
    for C in SequenceFactories:
        if C.CLASS_NAME == seq_id:
            Factory = C
            break
    else:
        return jsonify({"ok": False, "error": "Unknown sequenceId"}), 400

    PLAYERS[pid] = PlayerState(player_id=pid, seq_factory=Factory())

    # pronunciation manifest: word -> {key, url}
    pron = PLAYERS[pid].seq_factory.get_pronounciations()
    imags = PLAYERS[pid].seq_factory.get_images()
    

    return jsonify({"ok": True, "sequenceId": seq_id, "pronunciations": pron, "images":imags})


@app.post("/api/next")
def api_next():
    pid = _player_id()

    pstate = PLAYERS.get(pid)

    if pstate is None:
        return {"done": True, "message": "No sequence selected."}

    body = request.get_json(silent=True) or {}
    result_data = {
        "attempt": body.get("attempt"),
        "success": body.get("success"),
    }
    previous_was_good = result_data['success'] is None or bool(result_data['success'])
    next_question = pstate.seq_factory.get_next_question(previous_was_good)

    print(next_question)

    if next_question is None:
        return {"done":True}

    payload = {"done":False, "data":next_question}

    return jsonify(payload)


# Optional dev helper
@app.post("/api/reset")
def api_reset():
    PLAYERS = {}
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)





# ----------------------------
# # Core sequencing logic
# # ----------------------------

# def get_next_sentence(player_state: Dict[str, Any], result_data: Dict[str, Any]) -> Dict[str, Any]:
#     """
#     Return the next sentence dict for this player, or a {done: True, ...} object.

#     Args:
#       player_state: the per-player state dict (mutated in place).
#       result_data: dict like {"attempt": [...], "success": bool} (may be empty).

#     For now:
#       - append result_data to history (if present)
#       - return next sentence in the player's queue
#       - if queue is empty, return done
#     """
#     # record result (optional)
#     attempt = result_data.get("attempt", None)
#     success = result_data.get("success", None)
#     if attempt is not None or success is not None:
#         player_state["history"].append({"attempt": attempt, "success": success})

#     # must have a selected sequence
#     seq_id = player_state.get("sequenceId")
#     if not seq_id:
#         return {"done": True, "message": "No sequence selected."}

#     queue = player_state.get("queue", [])
#     if not queue:
#         return {"done": True, "message": "No more sentences."}

#     idx = queue.pop(0)
#     sentence = SEQ_BY_ID[seq_id]["sentences"][idx]
#     return {"done": False, "data": sentence}


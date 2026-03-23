from __future__ import annotations

import dataclasses
import random
import time
import uuid
from typing import Any, Dict, Optional, Tuple
from sequences import QuestionSequenceFactory, QuestionData

from flask import Flask, jsonify, request
from flask_cors import CORS

from have_got import EnHaveGot

app = Flask(__name__)

# Allow your Vite dev server to talk to Flask
# CORS(app, supports_credentials=False, origins=["http://localhost:5173", "http://http://46.62.200.84:5173"])
# from flask_cors import CORS

# CORS(
#     app,
#     supports_credentials=False, 
#     resources={r"/api/*": {"origins": ["http://46.62.200.84:5173", "http://localhost:5173", "http://capibara.hopto.org:5173"]}},
#     allow_headers=["Content-Type", "X-Player-Id"],
#     methods=["GET", "POST", "OPTIONS"],
# )


from engl_question_gen import MakeQuestionSequence
from etre_avoir import EtreAvoir, Numeros
from vocab_simple import VocabAnimalsEn, VocabFurnitureEN, VocabSimple, VocabSimpleEN
from ro_timp_verb import RoVerbTenseQuestions
from ro_subst_articol import RoNounIntruder, RoSortNouns, RoSortFromText
from ro_subst_gen_nr import RoSortByGender

from sequences import SequenceFactoryRecord

SequenceFactories = [SequenceFactoryRecord(*(C,)) for C in [RoSortNouns, RoNounIntruder, 
                     MakeQuestionSequence, VocabSimpleEN, VocabAnimalsEn,
                     Numeros,  VocabSimple,  EtreAvoir, EnHaveGot,
                     RoSortByGender, RoSortFromText,RoVerbTenseQuestions,
                     VocabFurnitureEN,]
]


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

# @app.get("/api/sequences")
@app.post("/api/sequences")
def api_sequences():
    # print(', '.join([f'{k}: {request.headers.get(k)}' for k in ("X-App-Lang", "X-App-Unit")]))
    body = request.get_json(silent=True) or {}
    print(", ".join([f'{k}:{body[k]}' for k in body]))
    # return jsonify( {"sequences": [{"id":n.CLASS_NAME, "name":n.CLASS_NAME, "kind":n.SCREEN_KIND,
    #                                 "color":n.COLOR} for n in SequenceFactories]})

    lang = body.get('lang')
    if lang not in {'en', 'ro', 'fr'}:
        return jsonify({"ok": False, "error": f"Unknown language {lang}"}), 400

    return jsonify( {"sequences": [{"id":n.sequence_name, "name":n.sequence_name, "kind":n.screen_kind,
                                    "color":n.color} for n in SequenceFactories
                                    if n.sequence_name.startswith(lang.upper())]})


@app.post("/api/select")
def api_select():
    pid = _player_id()

    body = request.get_json(force=True) or {}
    seq_id = body.get("sequenceId")

    factory_rec = None
    for rec in SequenceFactories:
        if rec.sequence_name == seq_id:
            factory_rec = rec
            break
    else:
        return jsonify({"ok": False, "error": "Unknown sequenceId"}), 400

    PLAYERS[pid] = PlayerState(player_id=pid, seq_factory=factory_rec.get_sequence_factory())

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
    app.run(host="0.0.0.0", port=5000, debug=False)





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


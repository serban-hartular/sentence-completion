from flask import Flask, jsonify, request, make_response
import uuid
import random
import time



app = Flask(__name__)

from flask_cors import CORS
CORS(app, supports_credentials=True, origins=["http://localhost:5173"])


# ---- 3 sentence datasets (edit freely) ----
SENTENCES = [
    {
        "prompt": "Build the sentence!",
        "slots": ["I", "", ""],
        "bankWords": ["like", "apples", "blah"],
        "correct": ["I", "like", "apples"],
        "initialMovable": True
    },
    {
        "prompt": "Complete the sentence:",
        "slots": ["", "", "", "", "?", "\n", ""],
        "bankWords": ["The", "cat", "is", "sleeping", "No"],
        "correct": ["The", "cat", "is", "sleeping", "?", "No"],
        "initialMovable": False
    },
    {
        "prompt": "Make a sentence:",
        "slots": ["We", "", ""],
        "bankWords": ["play", "outside", "garf"],
        "correct": ["We", "play", "outside"],
        "initialMovable": False
    }
]

# ---- Per-player state (in-memory) ----
# player_id -> {"queue": [indices], "last_seen": epoch_seconds}
PLAYER_STATE = {}

# simple cleanup so memory doesn't grow forever
PLAYER_TTL_SECONDS = 60 * 30  # 30 minutes


def get_or_create_player_id():
    pid = request.headers.get("X-Player-Id")
    return pid or str(uuid.uuid4())


def ensure_player_queue(player_id: str):
    now = time.time()
    # cleanup old players
    to_delete = [pid for pid, st in PLAYER_STATE.items() if now - st["last_seen"] > PLAYER_TTL_SECONDS]
    for pid in to_delete:
        del PLAYER_STATE[pid]

    if player_id not in PLAYER_STATE:
        PLAYER_STATE[player_id] = {"index": 0, "last_seen": now}
    else:
        PLAYER_STATE[player_id]["last_seen"] = now


@app.get("/api/next")
def next_sentence():
    player_id = get_or_create_player_id()
    ensure_player_queue(player_id)

    print(player_id)

    index = PLAYER_STATE[player_id]["index"]
    print(index)
    if index >= len(SENTENCES):
        resp = make_response(jsonify({"done": True, "message": "No more sentences."}))
    else:
        payload = SENTENCES[index]
        resp = make_response(jsonify({"done": False, "data": payload}))
        index += 1
        PLAYER_STATE[player_id]["index"] = index

    return resp




if __name__ == "__main__":
    # Runs on localhost:5000
    app.run(host="localhost", port=5000, debug=True)

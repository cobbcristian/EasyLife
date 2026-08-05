import json
import urllib.request
from pathlib import Path

state = json.loads(Path.home().joinpath(".expo/state.json").read_text())
secret = state["auth"]["sessionSecret"]

ids = [
    "3cbc8abe-37ac-4b9a-b0d7-1e170276d2bc",
    "4c4036b7-3ca2-4605-b219-d4cdfdc158ff",
]

for sid in ids:
    payload = {
        "query": (
            "query($id: ID!) { submission(id: $id) { id status platform "
            "errorMessage createdAt updatedAt completedAt } }"
        ),
        "variables": {"id": sid},
    }
    req = urllib.request.Request(
        "https://api.expo.dev/graphql",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "expo-session": secret},
        method="POST",
    )
    try:
        body = urllib.request.urlopen(req).read().decode()
    except Exception as exc:
        body = str(exc)
    print(sid, body)

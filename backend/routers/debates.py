from fastapi import APIRouter, HTTPException, Header, WebSocket, WebSocketDisconnect
from database import get_db
from schemas import DebateCreate
from auth import get_current_user
from agents import AGENT_REGISTRY, AGENT_ORDER, run_persona_agent, run_question_agent
import asyncio
import random
import threading
from concurrent.futures import ThreadPoolExecutor

router = APIRouter(prefix="/api/debates", tags=["debates"])
executor = ThreadPoolExecutor(max_workers=4)

@router.post("/")
def create_debate(data: DebateCreate, authorization: str = Header(None)):
    try:
        payload = get_current_user(authorization)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO debates (user_id, topic, rounds, status, include_defaults) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (payload["user_id"], data.topic, data.rounds, "pending", data.include_defaults)
        )
        debate_id = cursor.fetchone()[0]

        if data.persona_ids:
            for position, persona_id in enumerate(data.persona_ids):
                cursor.execute(
                    "INSERT INTO debate_personas (debate_id, persona_id, position) VALUES (%s, %s, %s)",
                    (debate_id, persona_id, position)
                )

        conn.commit()
        return {"debate_id": debate_id, "topic": data.topic, "rounds": data.rounds}
    finally:
        cursor.close()
        conn.close()

@router.get("/")
def get_debates(authorization: str = Header(None)):
    try:
        payload = get_current_user(authorization)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT id, topic, rounds, status, created_at FROM debates WHERE user_id = %s ORDER BY created_at DESC",
            (payload["user_id"],)
        )
        rows = cursor.fetchall()
        return [
            {
                "id": r[0],
                "topic": r[1],
                "rounds": r[2],
                "status": r[3],
                "created_at": str(r[4])
            }
            for r in rows
        ]
    finally:
        cursor.close()
        conn.close()

@router.get("/{debate_id}")
def get_debate(debate_id: int, authorization: str = Header(None)):
    try:
        payload = get_current_user(authorization)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT id, topic, rounds, status, created_at FROM debates WHERE id = %s AND user_id = %s",
            (debate_id, payload["user_id"])
        )
        debate = cursor.fetchone()
        if not debate:
            raise HTTPException(status_code=404, detail="Debate not found")

        cursor.execute(
            "SELECT id, speaker, content, created_at FROM debate_messages WHERE debate_id = %s ORDER BY created_at ASC",
            (debate_id,)
        )
        messages = cursor.fetchall()

        return {
            "id": debate[0],
            "topic": debate[1],
            "rounds": debate[2],
            "status": debate[3],
            "created_at": str(debate[4]),
            "messages": [
                {
                    "id": m[0],
                    "speaker": m[1],
                    "content": m[2],
                    "created_at": str(m[3])
                }
                for m in messages
            ]
        }
    finally:
        cursor.close()
        conn.close()

@router.delete("/{debate_id}")
def delete_debate(debate_id: int, authorization: str = Header(None)):
    try:
        payload = get_current_user(authorization)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM debate_messages WHERE debate_id = %s", (debate_id,)
        )
        cursor.execute(
            "DELETE FROM debates WHERE id = %s AND user_id = %s",
            (debate_id, payload["user_id"])
        )
        conn.commit()
        return {"message": "Debate deleted"}
    finally:
        cursor.close()
        conn.close()

@router.websocket("/ws/{debate_id}")
async def debate_websocket(websocket: WebSocket, debate_id: int):
    await websocket.accept()
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return

    try:
        payload = get_current_user(f"Bearer {token}")
    except ValueError:
        await websocket.close(code=1008)
        return

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT topic, rounds, include_defaults FROM debates WHERE id = %s AND user_id = %s",
        (debate_id, payload["user_id"])
    )
    debate = cursor.fetchone()
    if not debate:
        await websocket.close(code=1008)
        cursor.close()
        conn.close()
        return

    topic, max_rounds, include_defaults = debate

    # Load personas for this debate (if any)
    cursor.execute(
        """SELECT p.id, p.name, p.title, p.personality, p.debating_style, p.expertise, p.avatar
           FROM debate_personas dp
           JOIN personas p ON dp.persona_id = p.id
           WHERE dp.debate_id = %s
           ORDER BY dp.position""",
        (debate_id,)
    )
    persona_rows = cursor.fetchall()
    personas = [
        {"id": r[0], "name": r[1], "title": r[2], "personality": r[3],
         "debating_style": r[4], "expertise": r[5], "avatar": r[6]}
        for r in persona_rows
    ]

    cursor.execute(
        "UPDATE debates SET status = %s WHERE id = %s",
        ("running", debate_id)
    )
    conn.commit()
    cursor.close()
    conn.close()

    queue = asyncio.Queue()
    loop = asyncio.get_event_loop()
    history = []
    user_response_event = threading.Event()
    user_response_holder = {"content": None}

    default_speakers = [
        {"name": name, "avatar": AGENT_REGISTRY[name]["avatar"], "_key": name, "_is_default": True}
        for name in AGENT_ORDER
    ] if include_defaults else []
    persona_speakers = [{**p, "_is_default": False} for p in personas]
    all_speakers = default_speakers + persona_speakers

    if not all_speakers:
        all_speakers = default_speakers or [
            {"name": name, "avatar": AGENT_REGISTRY[name]["avatar"], "_key": name, "_is_default": True}
            for name in AGENT_ORDER
        ]

    def run_debate():
        try:
            def get_response(speaker, t, h):
                if speaker.get("_is_default"):
                    return AGENT_REGISTRY[speaker["_key"]]["run"](t, h)
                return run_persona_agent(speaker, t, h)

            questions_asked = 0
            max_questions = 1

            for round_num in range(max_rounds):
                for speaker in all_speakers:
                    # Randomly ask user a question (not in first round, cap at 1 per debate)
                    if round_num > 0 and questions_asked < max_questions and random.random() < 0.25:
                        question = run_question_agent(speaker, topic, history)
                        q_msg = {
                            "speaker": speaker["name"],
                            "avatar": speaker["avatar"],
                            "content": question,
                            "round": round_num + 1,
                            "is_question": True
                        }
                        history.append({"speaker": speaker["name"], "content": question})
                        db_conn = get_db()
                        db_cursor = db_conn.cursor()
                        db_cursor.execute(
                            "INSERT INTO debate_messages (debate_id, speaker, content) VALUES (%s, %s, %s)",
                            (debate_id, speaker["name"], question)
                        )
                        db_conn.commit()
                        db_cursor.close()
                        db_conn.close()
                        loop.call_soon_threadsafe(queue.put_nowait, q_msg)
                        questions_asked += 1
                        # Wait for user response (30s timeout — debate continues either way)
                        user_response_event.wait(timeout=30)
                        user_response_event.clear()
                        if user_response_holder["content"]:
                            history.append({"speaker": "You", "content": user_response_holder["content"]})
                            user_response_holder["content"] = None
                        continue

                    response = get_response(speaker, topic, history)
                    message = {
                        "speaker": speaker["name"],
                        "avatar": speaker["avatar"],
                        "content": response,
                        "round": round_num + 1
                    }
                    history.append({"speaker": speaker["name"], "content": response})

                    db_conn = get_db()
                    db_cursor = db_conn.cursor()
                    db_cursor.execute(
                        "INSERT INTO debate_messages (debate_id, speaker, content) VALUES (%s, %s, %s)",
                        (debate_id, speaker["name"], response)
                    )
                    db_conn.commit()
                    db_cursor.close()
                    db_conn.close()

                    loop.call_soon_threadsafe(queue.put_nowait, message)

            loop.call_soon_threadsafe(queue.put_nowait, None)
        except Exception as e:
            loop.call_soon_threadsafe(queue.put_nowait, {"error": str(e)})

    executor.submit(run_debate)

    try:
        while True:
            message = await queue.get()
            if message is None:
                db_conn = get_db()
                db_cursor = db_conn.cursor()
                db_cursor.execute(
                    "UPDATE debates SET status = %s WHERE id = %s",
                    ("completed", debate_id)
                )
                db_conn.commit()
                db_cursor.close()
                db_conn.close()
                await websocket.send_json({"type": "done"})
                break
            if "error" in message:
                await websocket.send_json({"type": "error", "message": message["error"]})
                break

            if message.get("is_question"):
                await websocket.send_json({"type": "question", **message})
                # Wait up to 35s for user reply
                try:
                    user_data = await asyncio.wait_for(websocket.receive_json(), timeout=35)
                    user_content = user_data.get("content", "").strip()
                    if user_content:
                        user_response_holder["content"] = user_content
                        db_conn = get_db()
                        db_cursor = db_conn.cursor()
                        db_cursor.execute(
                            "INSERT INTO debate_messages (debate_id, speaker, content) VALUES (%s, %s, %s)",
                            (debate_id, "You", user_content)
                        )
                        db_conn.commit()
                        db_cursor.close()
                        db_conn.close()
                        await websocket.send_json({"type": "message", "speaker": "You", "avatar": "💬", "content": user_content})
                except asyncio.TimeoutError:
                    pass
                loop.call_soon_threadsafe(user_response_event.set)
            else:
                await websocket.send_json({"type": "message", **message})
    except WebSocketDisconnect:
        pass

@router.websocket("/ws/{debate_id}/continue")
async def continue_debate_websocket(websocket: WebSocket, debate_id: int):
    await websocket.accept()
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return

    try:
        payload = get_current_user(f"Bearer {token}")
    except ValueError:
        await websocket.close(code=1008)
        return

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT topic, include_defaults FROM debates WHERE id = %s AND user_id = %s",
        (debate_id, payload["user_id"])
    )
    debate = cursor.fetchone()
    if not debate:
        await websocket.close(code=1008)
        cursor.close()
        conn.close()
        return

    topic, include_defaults = debate
    cursor.execute(
        "SELECT speaker, content FROM debate_messages WHERE debate_id = %s ORDER BY created_at ASC",
        (debate_id,)
    )
    history = [{"speaker": r[0], "content": r[1]} for r in cursor.fetchall()]

    # Load personas for this debate (if any)
    cursor.execute(
        """SELECT p.id, p.name, p.title, p.personality, p.debating_style, p.expertise, p.avatar
           FROM debate_personas dp
           JOIN personas p ON dp.persona_id = p.id
           WHERE dp.debate_id = %s
           ORDER BY dp.position""",
        (debate_id,)
    )
    persona_rows = cursor.fetchall()
    personas = [
        {"id": r[0], "name": r[1], "title": r[2], "personality": r[3],
         "debating_style": r[4], "expertise": r[5], "avatar": r[6]}
        for r in persona_rows
    ]

    cursor.close()
    conn.close()

    data = await websocket.receive_json()
    user_message = data.get("content", "")

    user_msg = {"speaker": "You", "avatar": "💬", "content": user_message}
    history.append({"speaker": "You", "content": user_message})
    await websocket.send_json({"type": "message", **user_msg})

    db_conn = get_db()
    db_cursor = db_conn.cursor()
    db_cursor.execute(
        "INSERT INTO debate_messages (debate_id, speaker, content) VALUES (%s, %s, %s)",
        (debate_id, "You", user_message)
    )
    db_conn.commit()
    db_cursor.close()
    db_conn.close()

    queue = asyncio.Queue()
    loop = asyncio.get_event_loop()

    cont_default_speakers = [
        {"name": name, "avatar": AGENT_REGISTRY[name]["avatar"], "_key": name, "_is_default": True}
        for name in AGENT_ORDER
    ] if include_defaults else []
    cont_persona_speakers = [{**p, "_is_default": False} for p in personas]
    cont_all_speakers = cont_default_speakers + cont_persona_speakers
    if not cont_all_speakers:
        cont_all_speakers = [
            {"name": name, "avatar": AGENT_REGISTRY[name]["avatar"], "_key": name, "_is_default": True}
            for name in AGENT_ORDER
        ]

    # Detect if the user addressed a specific speaker
    def find_addressed_speaker(message: str, speakers: list):
        msg = message.lower().strip()
        for speaker in speakers:
            name = speaker["name"].lower()
            first_name = name.split()[0]
            if (
                msg.startswith(f"@{name}") or
                msg.startswith(f"@{first_name}") or
                msg.startswith(f"{name},") or
                msg.startswith(f"{name}:") or
                msg.startswith(f"{first_name},") or
                msg.startswith(f"{first_name}:") or
                msg.startswith(f"hey {first_name}") or
                msg.startswith(f"hey {name}")
            ):
                return speaker
        return None

    addressed = find_addressed_speaker(user_message, cont_all_speakers)
    speakers_to_run = [addressed] if addressed else cont_all_speakers

    def run_continue():
        try:
            def get_response(speaker, t, h):
                if speaker.get("_is_default"):
                    return AGENT_REGISTRY[speaker["_key"]]["run"](t, h)
                return run_persona_agent(speaker, t, h)

            for speaker in speakers_to_run:
                response = get_response(speaker, topic, history)
                message = {
                    "speaker": speaker["name"],
                    "avatar": speaker["avatar"],
                    "content": response,
                }
                history.append({"speaker": speaker["name"], "content": response})

                db_conn = get_db()
                db_cursor = db_conn.cursor()
                db_cursor.execute(
                    "INSERT INTO debate_messages (debate_id, speaker, content) VALUES (%s, %s, %s)",
                    (debate_id, speaker["name"], response)
                )
                db_conn.commit()
                db_cursor.close()
                db_conn.close()

                loop.call_soon_threadsafe(queue.put_nowait, message)

            loop.call_soon_threadsafe(queue.put_nowait, None)
        except Exception as e:
            loop.call_soon_threadsafe(queue.put_nowait, {"error": str(e)})

    executor.submit(run_continue)

    try:
        while True:
            message = await queue.get()
            if message is None:
                await websocket.send_json({"type": "done"})
                break
            if "error" in message:
                await websocket.send_json({"type": "error", "message": message["error"]})
                break
            await websocket.send_json({"type": "message", **message})
    except WebSocketDisconnect:
        pass
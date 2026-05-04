from fastapi import APIRouter, HTTPException, Header, WebSocket, WebSocketDisconnect
from database import get_db
from schemas import DebateCreate
from auth import get_current_user
from models import calculate_level, get_level_title
from agents import AGENT_REGISTRY, AGENT_ORDER
import asyncio
import json
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
            "INSERT INTO debates (user_id, topic, rounds, status) VALUES (%s, %s, %s, %s) RETURNING id",
            (payload["user_id"], data.topic, data.rounds, "pending")
        )
        debate_id = cursor.fetchone()[0]
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
            "DELETE FROM debates WHERE id = %s AND user_id = %s", (debate_id, payload["user_id"])
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
        "SELECT topic, rounds FROM debates WHERE id = %s AND user_id = %s",
        (debate_id, payload["user_id"])
    )
    debate = cursor.fetchone()
    if not debate:
        await websocket.close(code=1008)
        return

    topic, max_rounds = debate
    cursor.execute(
        "UPDATE debates SET status = %s WHERE id = %s",
        ("running", debate_id)
    )
    conn.commit()

    queue = asyncio.Queue()
    loop = asyncio.get_event_loop()
    history = []

    def run_debate():
        try:
            for round_num in range(max_rounds):
                for agent_name in AGENT_ORDER:
                    agent = AGENT_REGISTRY[agent_name]
                    response = agent["run"](topic, history)
                    message = {
                        "speaker": agent_name,
                        "avatar": agent["avatar"],
                        "content": response,
                        "round": round_num + 1
                    }
                    history.append(message)

                    db_conn = get_db()
                    db_cursor = db_conn.cursor()
                    db_cursor.execute(
                        "INSERT INTO debate_messages (debate_id, speaker, content) VALUES (%s, %s, %s)",
                        (debate_id, agent_name, response)
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
                db_conn.execute(
                    "UPDATE users SET xp = xp + 10 WHERE id = %s",
                    (payload["user_id"],)
                )
                db_conn.commit()
                db_cursor.close()
                db_conn.close()
                await websocket.send_json({"type": "done"})
                break
            if "error" in message:
                await websocket.send_json({"type": "error", "message": message["error"]})
                break
            await websocket.send_json({"type": "message", **message})
    except WebSocketDisconnect:
        pass
    finally:
        cursor.close()
        conn.close()

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
        "SELECT topic FROM debates WHERE id = %s AND user_id = %s",
        (debate_id, payload["user_id"])
    )
    debate = cursor.fetchone()
    if not debate:
        await websocket.close(code=1008)
        return

    topic = debate[0]
    cursor.execute(
        "SELECT speaker, content FROM debate_messages WHERE debate_id = %s ORDER BY created_at ASC",
        (debate_id,)
    )
    history = [{"speaker": r[0], "content": r[1]} for r in cursor.fetchall()]

    data = await websocket.receive_json()
    user_message = data.get("content", "")

    user_msg = {"speaker": "You", "avatar": "💬", "content": user_message}
    history.append(user_msg)
    await websocket.send_json({"type": "message", **user_msg})

    cursor.execute(
        "INSERT INTO debate_messages (debate_id, speaker, content) VALUES (%s, %s, %s)",
        (debate_id, "You", user_message)
    )
    conn.commit()

    queue = asyncio.Queue()
    loop = asyncio.get_event_loop()

    def run_continue():
        try:
            for agent_name in AGENT_ORDER:
                agent = AGENT_REGISTRY[agent_name]
                response = agent["run"](topic, history)
                message = {
                    "speaker": agent_name,
                    "avatar": agent["avatar"],
                    "content": response,
                }
                history.append(message)

                db_conn = get_db()
                db_cursor = db_conn.cursor()
                db_cursor.execute(
                    "INSERT INTO debate_messages (debate_id, speaker, content) VALUES (%s, %s, %s)",
                    (debate_id, agent_name, response)
                )
                db_conn.commit()
                db_cursor.close()
                db_conn.close()

                loop.call_soon_threadsafe(queue.put_nowait, message)

            db_conn = get_db()
            db_cursor = db_conn.cursor()
            db_cursor.execute(
                "UPDATE users SET xp = xp + 30 WHERE id = %s",
                (payload["user_id"],)
            )
            db_conn.commit()
            db_cursor.close()
            db_conn.close()

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
    finally:
        cursor.close()
        conn.close()
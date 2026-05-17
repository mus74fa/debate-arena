from fastapi import APIRouter, HTTPException, Header
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])

def require_admin(authorization: str):
    try:
        payload = get_current_user(authorization)
        if not payload.get("is_admin"):
            raise HTTPException(status_code=403, detail="Admin access required")
        return payload
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.get("/stats")
def get_stats(authorization: str = Header(None)):
    require_admin(authorization)
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT COUNT(*) FROM users")
        total_users = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM debates")
        total_debates = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM debate_messages")
        total_messages = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM debates WHERE status = 'completed'")
        completed_debates = cursor.fetchone()[0]

        return {
            "total_users": total_users,
            "total_debates": total_debates,
            "total_messages": total_messages,
            "completed_debates": completed_debates
        }
    finally:
        cursor.close()
        conn.close()

@router.get("/users")
def get_users(authorization: str = Header(None)):
    require_admin(authorization)
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT id, username, email, is_admin, created_at FROM users ORDER BY created_at DESC"
        )
        rows = cursor.fetchall()
        return [
            {
                "id": r[0],
                "username": r[1],
                "email": r[2],
                "is_admin": r[3],
                "created_at": str(r[4])
            }
            for r in rows
        ]
    finally:
        cursor.close()
        conn.close()

@router.delete("/users/{user_id}")
def delete_user(user_id: int, authorization: str = Header(None)):
    require_admin(authorization)
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM debate_messages WHERE debate_id IN (SELECT id FROM debates WHERE user_id = %s)",
            (user_id,)
        )
        cursor.execute("DELETE FROM debates WHERE user_id = %s", (user_id,))
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        return {"message": "User deleted"}
    finally:
        cursor.close()
        conn.close()

@router.get("/debates")
def get_all_debates(authorization: str = Header(None)):
    require_admin(authorization)
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """SELECT d.id, d.topic, d.rounds, d.status, d.created_at, u.username 
               FROM debates d JOIN users u ON d.user_id = u.id 
               ORDER BY d.created_at DESC"""
        )
        rows = cursor.fetchall()
        return [
            {
                "id": r[0],
                "topic": r[1],
                "rounds": r[2],
                "status": r[3],
                "created_at": str(r[4]),
                "username": r[5]
            }
            for r in rows
        ]
    finally:
        cursor.close()
        conn.close()

@router.post("/hot-topic")
def set_hot_topic(data: dict, authorization: str = Header(None)):
    require_admin(authorization)
    conn = get_db()
    cursor = conn.cursor()
    try:
        from datetime import date
        today = date.today()
        cursor.execute(
            """INSERT INTO hot_topics (topic, date) VALUES (%s, %s)
               ON CONFLICT (date) DO UPDATE SET topic = %s""",
            (data["topic"], today, data["topic"])
        )
        conn.commit()
        return {"message": "Hot topic set", "topic": data["topic"]}
    finally:
        cursor.close()
        conn.close()

@router.get("/hot-topic")
def get_hot_topic(authorization: str = Header(None)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        from datetime import date
        today = date.today()
        cursor.execute(
            "SELECT topic FROM hot_topics WHERE date = %s", (today,)
        )
        row = cursor.fetchone()
        if not row:
            return {"topic": None}
        return {"topic": row[0], "date": str(today)}
    finally:
        cursor.close()
        conn.close()
from fastapi import APIRouter, HTTPException, Header
from database import get_db
from schemas import PersonaCreate, PersonaResponse
from auth import get_current_user

router = APIRouter(prefix="/api/personas", tags=["personas"])


def _row_to_dict(row):
    return {
        "id": row[0],
        "name": row[1],
        "title": row[2],
        "personality": row[3],
        "debating_style": row[4],
        "expertise": row[5],
        "avatar": row[6],
        "created_by": row[7],
        "created_at": str(row[8]),
    }


@router.post("/", response_model=PersonaResponse)
def create_persona(data: PersonaCreate, authorization: str = Header(None)):
    try:
        payload = get_current_user(authorization)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """INSERT INTO personas (name, title, personality, debating_style, expertise, avatar, created_by)
               VALUES (%s, %s, %s, %s, %s, %s, %s)
               RETURNING id, name, title, personality, debating_style, expertise, avatar, created_by, created_at""",
            (data.name, data.title, data.personality, data.debating_style,
             data.expertise, data.avatar or "🎓", payload["user_id"])
        )
        row = cursor.fetchone()
        conn.commit()
        return _row_to_dict(row)
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@router.get("/")
def list_personas():
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """SELECT p.id, p.name, p.title, p.personality, p.debating_style, p.expertise, p.avatar, p.created_by, p.created_at,
                      u.username as creator_name
               FROM personas p
               LEFT JOIN users u ON p.created_by = u.id
               ORDER BY p.created_at DESC"""
        )
        rows = cursor.fetchall()
        result = []
        for row in rows:
            d = _row_to_dict(row[:9])
            d["creator_name"] = row[9]
            result.append(d)
        return result
    finally:
        cursor.close()
        conn.close()


@router.get("/{persona_id}")
def get_persona(persona_id: int):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """SELECT id, name, title, personality, debating_style, expertise, avatar, created_by, created_at
               FROM personas WHERE id = %s""",
            (persona_id,)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Persona not found")
        return _row_to_dict(row)
    finally:
        cursor.close()
        conn.close()


@router.delete("/{persona_id}")
def delete_persona(persona_id: int, authorization: str = Header(None)):
    try:
        payload = get_current_user(authorization)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT created_by FROM personas WHERE id = %s", (persona_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Persona not found")

        if row[0] != payload["user_id"]:
            cursor.execute("SELECT is_admin FROM users WHERE id = %s", (payload["user_id"],))
            user = cursor.fetchone()
            if not user or not user[0]:
                raise HTTPException(status_code=403, detail="Not authorized to delete this persona")

        cursor.execute("DELETE FROM personas WHERE id = %s", (persona_id,))
        conn.commit()
        return {"message": "Persona deleted"}
    finally:
        cursor.close()
        conn.close()

from fastapi import APIRouter, HTTPException, Header
from database import get_db
from schemas import UserRegister, UserLogin, UserResponse
from auth import hash_password, verify_password, create_token, get_current_user
from models import calculate_level, get_level_title, xp_for_next_level
from datetime import date

router = APIRouter(prefix="/api/users", tags=["users"])

@router.post("/register")
def register(data: UserRegister):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT COUNT(*) FROM users")
        count = cursor.fetchone()[0]
        is_admin = count == 0

        hashed = hash_password(data.password)
        cursor.execute(
            """INSERT INTO users (username, email, hashed_password, is_admin, last_active)
               VALUES (%s, %s, %s, %s, %s) RETURNING id""",
            (data.username, data.email, hashed, is_admin, date.today())
        )
        user_id = cursor.fetchone()[0]
        conn.commit()

        token = create_token(user_id, data.email, is_admin)
        return {"token": token, "message": "Registration successful"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.post("/login")
def login(data: UserLogin):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT id, hashed_password, is_admin, xp, level, streak, last_active FROM users WHERE email = %s",
            (data.email,)
        )
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        user_id, hashed, is_admin, xp, level, streak, last_active = user

        if not verify_password(data.password, hashed):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        today = date.today()
        new_streak = streak
        new_xp = xp
        if last_active:
            days_diff = (today - last_active).days
            if days_diff == 1:
                new_streak += 1
                new_xp += 15
            elif days_diff > 1:
                new_streak = 1
        else:
            new_streak = 1

        new_level = calculate_level(new_xp)
        cursor.execute(
            "UPDATE users SET streak = %s, xp = %s, level = %s, last_active = %s WHERE id = %s",
            (new_streak, new_xp, new_level, today, user_id)
        )
        conn.commit()

        token = create_token(user_id, data.email, is_admin)
        return {
            "token": token,
            "streak": new_streak,
            "xp": new_xp,
            "level": new_level,
            "level_title": get_level_title(new_level),
            "message": f"Welcome back! {new_streak} day streak 🔥" if new_streak > 1 else "Welcome back!"
        }
    finally:
        cursor.close()
        conn.close()

@router.get("/me")
def get_me(authorization: str = Header(None)):
    try:
        payload = get_current_user(authorization)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT id, username, email, is_admin, xp, level, streak FROM users WHERE id = %s",
            (payload["user_id"],)
        )
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        id, username, email, is_admin, xp, level, streak = user
        return {
            "id": id,
            "username": username,
            "email": email,
            "is_admin": is_admin,
            "xp": xp,
            "level": level,
            "streak": streak,
            "level_title": get_level_title(level),
            "xp_for_next_level": xp_for_next_level(level)
        }
    finally:
        cursor.close()
        conn.close()

@router.get("/leaderboard")
def get_leaderboard():
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT username, xp, level, streak FROM users ORDER BY xp DESC LIMIT 10"
        )
        rows = cursor.fetchall()
        return [
            {
                "username": r[0],
                "xp": r[1],
                "level": r[2],
                "level_title": get_level_title(r[2]),
                "streak": r[3]
            }
            for r in rows
        ]
    finally:
        cursor.close()
        conn.close()
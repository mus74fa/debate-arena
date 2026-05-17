from fastapi import APIRouter, HTTPException, Header
from database import get_db
from schemas import UserRegister, UserLogin, UserResponse
from auth import hash_password, verify_password, create_token, get_current_user

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
            "INSERT INTO users (username, email, hashed_password, is_admin) VALUES (%s, %s, %s, %s) RETURNING id",
            (data.username, data.email, hashed, is_admin)
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
            "SELECT id, hashed_password, is_admin FROM users WHERE email = %s",
            (data.email,)
        )
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        user_id, hashed, is_admin = user

        if not verify_password(data.password, hashed):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        token = create_token(user_id, data.email, is_admin)
        return {"token": token, "message": "Welcome back!"}
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
            "SELECT id, username, email, is_admin FROM users WHERE id = %s",
            (payload["user_id"],)
        )
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "id": user[0],
            "username": user[1],
            "email": user[2],
            "is_admin": user[3],
        }
    finally:
        cursor.close()
        conn.close()

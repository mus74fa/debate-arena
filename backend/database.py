import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def get_db():
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            is_admin BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS debates (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            topic TEXT NOT NULL,
            rounds INTEGER NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            include_defaults BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # Migrate existing debates tables that predate include_defaults
    cursor.execute("""
        ALTER TABLE debates ADD COLUMN IF NOT EXISTS include_defaults BOOLEAN DEFAULT TRUE
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS debate_messages (
            id SERIAL PRIMARY KEY,
            debate_id INTEGER REFERENCES debates(id),
            speaker VARCHAR(100) NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS hot_topics (
            id SERIAL PRIMARY KEY,
            topic TEXT NOT NULL,
            date DATE UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS personas (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            title VARCHAR(255),
            personality TEXT NOT NULL,
            debating_style TEXT NOT NULL,
            expertise TEXT NOT NULL,
            avatar VARCHAR(10) DEFAULT '🎓',
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS debate_personas (
            id SERIAL PRIMARY KEY,
            debate_id INTEGER REFERENCES debates(id) ON DELETE CASCADE,
            persona_id INTEGER REFERENCES personas(id),
            position INTEGER NOT NULL
        )
    """)

    conn.commit()
    cursor.close()
    conn.close()
import os
from typing import List, Dict, Any
import aiosqlite

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "StudentOS.db"))

async def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS threads (
                thread_id TEXT PRIMARY KEY,
                user_name TEXT NOT NULL,
                title TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""")
        await db.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                thread_id TEXT NOT NULL,
                sender TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (thread_id) REFERENCES threads (thread_id)
            )""")
        await db.commit()

async def save_thread(thread_id: str, user_name: str, title: str) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT INTO threads (thread_id, user_name, title)
            VALUES (?, ?, ?)
            ON CONFLICT(thread_id) DO
                UPDATE SET title=excluded.title, updated_at=CURRENT_TIMESTAMP
        """, (thread_id, user_name, title))
        await db.commit()

async def save_messages(thread_id: str, sender: str, content: str, msg_id: str = None) -> None:
    import uuid
    if not msg_id:
        msg_id = str(uuid.uuid4())
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT INTO messages (id, thread_id, sender, content)
            VALUES (?, ?, ?, ?)
        """, (msg_id, thread_id, sender, content))
        await db.commit()
    
async def get_recent_threads(user: str) -> List[Dict[str, Any]]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""SELECT * FROM threads 
        WHERE user_name=?
        ORDER BY updated_at DESC""", (user,)) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

async def get_thread_messages(thread_id: str) -> List[Dict[str, Any]]: 
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM messages WHERE thread_id=? ORDER BY timestamp ASC", (thread_id,)) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
    
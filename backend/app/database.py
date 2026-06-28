import os
import aiosqlite
from contextlib import asynccontextmanager

DATABASE_URL = os.getenv("DATABASE_URL", "./postcat.db")

async def get_db():
    """Yield a database connection."""
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        yield db

async def init_db():
    """Create tables if they don't exist."""
    async with aiosqlite.connect(DATABASE_URL) as db:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS collections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                share_token TEXT UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                collection_id INTEGER NULL,
                state TEXT NOT NULL CHECK (state IN ('DRAFT', 'EXECUTED')),
                method TEXT NOT NULL,
                url TEXT NOT NULL,
                query_params TEXT,    -- JSON string
                headers TEXT,         -- JSON string
                auth TEXT,            -- JSON string, e.g. {"type":"bearer","token":"..."}
                body TEXT,
                body_type TEXT,       -- e.g. "json", "form", "text"
                response_status INTEGER,
                response_headers TEXT,
                response_body TEXT,
                response_time INTEGER, -- milliseconds
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                executed_at TIMESTAMP,
                FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS environments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS environment_variables (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                environment_id INTEGER NOT NULL,
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE
            );
        """)
        await db.commit()
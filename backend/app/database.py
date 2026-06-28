import os
import aiosqlite
import httpx
from typing import List, Dict, Any, Optional

# Load environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "local")

# D1 credentials (only used in production)
CLOUDFLARE_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID")
CLOUDFLARE_API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN")
D1_DATABASE_ID = os.getenv("D1_DATABASE_ID")
D1_API_URL = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/d1/database/{D1_DATABASE_ID}/query"

# ---- Local SQLite ----
async def get_local_db():
    async with aiosqlite.connect("postcat.db") as db:
        db.row_factory = aiosqlite.Row
        yield db

# ---- D1 HTTP ----
class D1Connection:
    def __init__(self):
        self._closed = False
        self._results = None
        self._lastrowid = None
        self._rowcount = 0

    async def execute(self, sql: str, params: Optional[List] = None):
        if self._closed:
            raise RuntimeError("Connection closed")

        headers = {
            "Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}",
            "Content-Type": "application/json",
        }
        payload = {"sql": sql, "params": params or []}

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(D1_API_URL, headers=headers, json=payload)
            if resp.status_code != 200:
                raise Exception(f"D1 API error: {resp.text}")

            data = resp.json()
            if not data.get("success"):
                raise Exception(f"D1 API error: {data.get('errors')}")

            # D1 returns "result" as an array of result objects
            result_list = data.get("result", [])

            if not result_list:
                self._results = []
                self._lastrowid = None
                self._rowcount = 0
                return self

            # Take the first result (for single statements)
            first_result = result_list[0]
            self._results = first_result.get("results", [])
            self._lastrowid = first_result.get("meta", {}).get("last_row_id")
            self._rowcount = first_result.get("meta", {}).get("changes", 0)

            return self

    async def executemany(self, sql: str, params_list: List[List]):
        for params in params_list:
            await self.execute(sql, params)
        return self

    async def executescript(self, script: str):
        statements = [s.strip() for s in script.split(';') if s.strip()]
        for stmt in statements:
            await self.execute(stmt)
        return self

    async def fetchone(self):
        if self._results and len(self._results) > 0:
            return Row(self._results[0])
        return None

    async def fetchall(self):
        return [Row(row) for row in self._results] if self._results else []

    async def commit(self):
        pass  # D1 auto-commits

    async def close(self):
        self._closed = True

    @property
    def lastrowid(self):
        return self._lastrowid

    @property
    def rowcount(self):
        return self._rowcount

class Row:
    def __init__(self, data: Dict[str, Any]):
        self._data = data

    def __getitem__(self, key):
        return self._data[key]

    def __getattr__(self, name):
        if name in self._data:
            return self._data[name]
        raise AttributeError(f"No column named {name}")

    def keys(self):
        return self._data.keys()

    def values(self):
        return self._data.values()

    def items(self):
        return self._data.items()

async def get_d1_db():
    conn = D1Connection()
    try:
        yield conn
    finally:
        await conn.close()

# ---- Unified DB dependency ----
async def get_db():
    if ENVIRONMENT == "production" and CLOUDFLARE_API_TOKEN:
        async for conn in get_d1_db():
            yield conn
    else:
        async for conn in get_local_db():
            yield conn

# ---- Init DB ----
async def init_db():
    schema = """
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
            query_params TEXT,
            headers TEXT,
            auth TEXT,
            body TEXT,
            body_type TEXT,
            response_status INTEGER,
            response_headers TEXT,
            response_body TEXT,
            response_time INTEGER,
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
    """
    if ENVIRONMENT == "production" and CLOUDFLARE_API_TOKEN:
        conn = D1Connection()
        try:
            await conn.executescript(schema)
            await conn.commit()
        finally:
            await conn.close()
    else:
        async with aiosqlite.connect("postcat.db") as db:
            db.row_factory = aiosqlite.Row
            await db.executescript(schema)
            await db.commit()
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import aiosqlite
import secrets
from ..database import get_db
from ..schemas import (
    CollectionCreate, CollectionUpdate, CollectionOut,
    CollectionShareResponse, RequestOut
)
from ..helpers import row_to_request_dict

router = APIRouter()

# ---- Helper to generate a unique share token ----
def generate_share_token() -> str:
    return secrets.token_urlsafe(16)

@router.get("/collections", response_model=List[CollectionOut])
async def list_collections(db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(
        "SELECT id, name, share_token, created_at FROM collections ORDER BY created_at DESC"
    )
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]

@router.post("/collections", response_model=CollectionOut)
async def create_collection(data: CollectionCreate, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(
        "INSERT INTO collections (name) VALUES (?)",
        (data.name,)
    )
    await db.commit()
    new_id = cursor.lastrowid
    cursor = await db.execute(
        "SELECT id, name, share_token, created_at FROM collections WHERE id = ?",
        (new_id,)
    )
    row = await cursor.fetchone()
    return dict(row)

@router.patch("/collections/{collection_id}", response_model=CollectionOut)
async def update_collection(collection_id: int, data: CollectionUpdate, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(
        "UPDATE collections SET name = ? WHERE id = ?",
        (data.name, collection_id)
    )
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Collection not found")
    await db.commit()
    cursor = await db.execute(
        "SELECT id, name, share_token, created_at FROM collections WHERE id = ?",
        (collection_id,)
    )
    row = await cursor.fetchone()
    return dict(row)

@router.delete("/collections/{collection_id}")
async def delete_collection(collection_id: int, db: aiosqlite.Connection = Depends(get_db)):
    # Detach requests
    await db.execute("UPDATE requests SET collection_id = NULL WHERE collection_id = ?", (collection_id,))
    cursor = await db.execute("DELETE FROM collections WHERE id = ?", (collection_id,))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Collection not found")
    await db.commit()
    return {"message": "Deleted"}

# ---- Generate share link for a collection ----
@router.post("/collections/{collection_id}/share")
async def generate_share_link(collection_id: int, db: aiosqlite.Connection = Depends(get_db)):
    # Check collection exists
    cursor = await db.execute("SELECT id FROM collections WHERE id = ?", (collection_id,))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Collection not found")

    # Generate unique token (ensure it's not already used)
    while True:
        token = generate_share_token()
        cursor = await db.execute("SELECT id FROM collections WHERE share_token = ?", (token,))
        if not await cursor.fetchone():
            break

    await db.execute(
        "UPDATE collections SET share_token = ? WHERE id = ?",
        (token, collection_id)
    )
    await db.commit()

    # Build the share URL (adjust host/port as needed)
    # We'll return the token; frontend will construct the full URL.
    return {"share_token": token, "share_url": f"/collections/share/{token}"}

# ---- Get shared collection by token ----
@router.get("/collections/share/{token}", response_model=CollectionShareResponse)
async def get_shared_collection(token: str, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(
        "SELECT id, name, share_token, created_at FROM collections WHERE share_token = ?",
        (token,)
    )
    collection_row = await cursor.fetchone()
    if not collection_row:
        raise HTTPException(status_code=404, detail="Collection not found or not shared")
    collection = dict(collection_row)

    # Fetch all requests belonging to this collection
    cursor = await db.execute(
        "SELECT * FROM requests WHERE collection_id = ? ORDER BY created_at DESC",
        (collection["id"],)
    )
    rows = await cursor.fetchall()
    requests = [row_to_request_dict(row) for row in rows]

    return CollectionShareResponse(
        collection=collection,
        requests=requests
    )
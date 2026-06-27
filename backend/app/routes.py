from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, Dict, Any, List
import httpx
import json
import time
import aiosqlite
from .database import get_db
from .schemas import (
    SendRequest, SendResponse,
    CollectionCreate, CollectionUpdate, CollectionOut,
    RequestOut, RequestConfig, RequestUpdate,
    SaveRequest, SaveResponse, CollectionInfo
)

router = APIRouter()

# ---- Helper: parse request config and execute ----
async def execute_request(config: RequestConfig) -> tuple[int, dict, str, float]:
    """Return (status, headers, body, response_time in ms)."""
    method = config.method.upper()
    url = config.url
    params = config.query_params or {}
    headers = config.headers or {}
    body = config.body
    body_type = config.body_type

    # Prepare request data
    data = None
    json_data = None
    if body:
        if body_type == "json":
            try:
                json_data = json.loads(body)
            except:
                json_data = body  # fallback
        elif body_type == "form":
            # assume form encoded; we'll send as data dict, but we'll keep as string for simplicity
            data = body
        else:
            data = body

    async with httpx.AsyncClient(timeout=30.0) as client:
        start = time.perf_counter()
        response = await client.request(
            method=method,
            url=url,
            params=params,
            headers=headers,
            content=body if body_type not in ("json", "form") else None,
            json=json_data,
            data=data if body_type == "form" else None,
        )
        elapsed = (time.perf_counter() - start) * 1000  # ms

        # Read body
        try:
            resp_body = response.text
        except:
            resp_body = "<binary>"

        # Convert headers to dict
        resp_headers = dict(response.headers)

    return response.status_code, resp_headers, resp_body, elapsed

# ---- Helper: insert or update request in DB ----
async def upsert_request(
    db: aiosqlite.Connection,
    config: RequestConfig,
    state: str,
    collection_id: Optional[int] = None,
    request_id: Optional[int] = None,
    response_data: Optional[dict] = None
) -> int:
    """
    Either update an existing request (if request_id given) or create a new one.
    Returns the id of the affected row.
    """
    # Convert JSON fields to strings
    query_params_json = json.dumps(config.query_params) if config.query_params else None
    headers_json = json.dumps(config.headers) if config.headers else None
    auth_json = json.dumps(config.auth) if config.auth else None
    response_headers_json = json.dumps(response_data.get("headers")) if response_data and response_data.get("headers") else None

    if request_id is not None:
        # Update only collection_id and maybe response fields? We'll keep it simple:
        # If we are updating an existing request, we only change collection_id and maybe state? But we are not changing other fields.
        # However, if the request is being saved (not executed), we might want to keep its existing data. We'll just update collection_id.
        # But if we are saving with new request_data? The spec says if request_id is given, we are updating its collection_id only.
        # We'll assume the request_data is ignored when request_id is given (we just set collection_id).
        await db.execute(
            "UPDATE requests SET collection_id = ? WHERE id = ?",
            (collection_id, request_id)
        )
        await db.commit()
        return request_id
    else:
        # Create new request
        executed_at = None
        response_status = None
        response_body = None
        response_time = None
        if state == "EXECUTED" and response_data:
            executed_at = time.strftime("%Y-%m-%d %H:%M:%S")
            response_status = response_data.get("status")
            response_body = response_data.get("body")
            response_time = int(response_data.get("time", 0))

        cursor = await db.execute("""
            INSERT INTO requests (
                collection_id, state, method, url, query_params, headers, auth,
                body, body_type, response_status, response_headers, response_body,
                response_time, executed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            collection_id, state, config.method, config.url,
            query_params_json, headers_json, auth_json,
            config.body, config.body_type,
            response_status, response_headers_json, response_body,
            response_time, executed_at
        ))
        await db.commit()
        return cursor.lastrowid

# ---- Endpoints ----

@router.get("/health")
async def health():
    return {"status": "ok"}

# ---- Send ----
@router.post("/requests/send", response_model=SendResponse)
async def send_request(req: SendRequest, db: aiosqlite.Connection = Depends(get_db)):
    # Execute
    status, headers, body, elapsed = await execute_request(req)
    response_data = {
        "status": status,
        "headers": headers,
        "body": body,
        "time": elapsed
    }
    # Store as EXECUTED (no collection)
    request_id = await upsert_request(
        db=db,
        config=req,
        state="EXECUTED",
        collection_id=None,
        request_id=None,
        response_data=response_data
    )
    # Return
    return SendResponse(
        statusCode=status,
        headers=headers,
        body=body,
        responseTime=int(elapsed),
        responseSize=len(body.encode("utf-8")),
        request_id=request_id 
    )

def row_to_request_dict(row: aiosqlite.Row) -> dict:
    """Convert a DB row to a dict with JSON fields parsed."""
    d = dict(row)
    for key in ['query_params', 'headers', 'auth', 'response_headers']:
        if d.get(key):
            d[key] = json.loads(d[key])
    return d

@router.post("/requests/save", response_model=SaveResponse)
async def save_request(req: SaveRequest, db: aiosqlite.Connection = Depends(get_db)):
    # Check if collection exists
    cursor = await db.execute("SELECT id, name FROM collections WHERE id = ?", (req.collection_id,))
    collection_row = await cursor.fetchone()
    if not collection_row:
        raise HTTPException(status_code=404, detail="Collection not found")
    collection = dict(collection_row)

    # Check if request exists
    cursor = await db.execute("SELECT * FROM requests WHERE id = ?", (req.request_id,))
    request_row = await cursor.fetchone()
    if not request_row:
        raise HTTPException(status_code=404, detail="Request not found")

    # Update the request's collection_id
    await db.execute(
        "UPDATE requests SET collection_id = ? WHERE id = ?",
        (req.collection_id, req.request_id)
    )
    await db.commit()

    # Fetch the updated request as a dict with parsed JSON
    cursor = await db.execute("SELECT * FROM requests WHERE id = ?", (req.request_id,))
    updated_row = await cursor.fetchone()
    request_dict = row_to_request_dict(updated_row)  # using your existing helper

    # Return both
    return SaveResponse(
        request=RequestOut(**request_dict),  # validate and convert to Pydantic
        collection=CollectionInfo(**collection)
    )

# ---- Collections CRUD ----
@router.get("/collections", response_model=List[CollectionOut])
async def list_collections(db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT id, name, created_at FROM collections ORDER BY created_at DESC")
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
    cursor = await db.execute("SELECT id, name, created_at FROM collections WHERE id = ?", (new_id,))
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
    cursor = await db.execute("SELECT id, name, created_at FROM collections WHERE id = ?", (collection_id,))
    row = await cursor.fetchone()
    return dict(row)

@router.delete("/collections/{collection_id}")
async def delete_collection(collection_id: int, db: aiosqlite.Connection = Depends(get_db)):
    # Optionally, you could set collection_id to NULL for requests, but we'll cascade? Not set, so we set NULL.
    await db.execute("UPDATE requests SET collection_id = NULL WHERE collection_id = ?", (collection_id,))
    cursor = await db.execute("DELETE FROM collections WHERE id = ?", (collection_id,))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Collection not found")
    await db.commit()
    return {"message": "Deleted"}

# ---- Additional endpoints: history and get request by id (for later) ----
@router.get("/history", response_model=List[RequestOut])
async def get_history(db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(
        "SELECT * FROM requests WHERE state = 'EXECUTED' ORDER BY executed_at DESC"
    )
    rows = await cursor.fetchall()
    # Convert rows to dict with JSON parsing
    result = []
    for row in rows:
        d = dict(row)
        # parse JSON fields
        for key in ['query_params', 'headers', 'auth', 'response_headers']:
            if d.get(key):
                d[key] = json.loads(d[key])
        result.append(d)
    return result

@router.get("/requests/{request_id}", response_model=RequestOut)
async def get_request(request_id: int, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT * FROM requests WHERE id = ?", (request_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Request not found")
    d = dict(row)
    for key in ['query_params', 'headers', 'auth', 'response_headers']:
        if d.get(key):
            d[key] = json.loads(d[key])
    return d

@router.patch("/requests/{request_id}")
async def update_request(
    request_id: int,
    update_data: RequestUpdate,
    db: aiosqlite.Connection = Depends(get_db)
):
    # 1. Fetch the existing request
    cursor = await db.execute("SELECT * FROM requests WHERE id = ?", (request_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Request not found")

    existing = dict(row)

    # 2. Determine the new state
    if existing["state"] == "EXECUTED":
        # Editing an executed request → create a new draft copy
        # We'll merge the existing data with the updates, then insert as DRAFT
        new_data = existing.copy()
        # Apply updates from the payload (only non-None fields)
        for key, value in update_data.dict(exclude_unset=True).items():
            if value is not None:
                new_data[key] = value

        # Prepare JSON fields (they are strings in DB, we keep them as strings)
        # Note: we already have JSON strings in the DB, but if user sends new values as dicts, we need to serialize them.
        # For simplicity, we'll convert the updates to JSON strings if needed.
        # However, the user sends dicts, so we need to convert before insert.
        query_params = json.dumps(new_data["query_params"]) if new_data.get("query_params") else None
        headers = json.dumps(new_data["headers"]) if new_data.get("headers") else None
        auth = json.dumps(new_data["auth"]) if new_data.get("auth") else None
        # body is plain text, body_type is string

        # Insert new draft row
        cursor = await db.execute("""
            INSERT INTO requests (
                collection_id, state, method, url, query_params, headers, auth,
                body, body_type, response_status, response_headers, response_body,
                response_time, executed_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (
            new_data.get("collection_id"),  # keep original collection_id
            "DRAFT",
            new_data.get("method"),
            new_data.get("url"),
            query_params,
            headers,
            auth,
            new_data.get("body"),
            new_data.get("body_type"),
            None,  # response_status – new draft has no response
            None,  # response_headers
            None,  # response_body
            None,  # response_time
            None   # executed_at
        ))
        await db.commit()
        new_id = cursor.lastrowid
        # Return the new draft's id
        return {"message": "Edited executed request – created new draft", "new_id": new_id}

    else:
        # It's a DRAFT – update the existing row
        update_fields = []
        values = []
        for key, value in update_data.dict(exclude_unset=True).items():
            if value is not None:
                # For JSON fields, serialize to string
                if key in ["query_params", "headers", "auth"]:
                    value = json.dumps(value)
                update_fields.append(f"{key} = ?")
                values.append(value)
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        values.append(request_id)
        await db.execute(
            f"UPDATE requests SET {', '.join(update_fields)} WHERE id = ?",
            values
        )
        await db.commit()
        return {"message": "Draft updated", "id": request_id}
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, Dict, Any, List
import httpx
import json
import time
import aiosqlite
from ..database import get_db
from ..schemas import (
    SendRequest, SendResponse,
    RequestOut, RequestConfig, RequestUpdate,
    SaveRequest, SaveResponse, CollectionInfo
)
from ..helpers import row_to_request_dict

router = APIRouter()

# ========== ENVIRONMENT SUBSTITUTION HELPERS ==========

async def get_env_vars(db: aiosqlite.Connection, environment_id: int) -> Dict[str, str]:
    """Fetch key-value pairs for an environment."""
    cursor = await db.execute(
        "SELECT key, value FROM environment_variables WHERE environment_id = ?",
        (environment_id,)
    )
    rows = await cursor.fetchall()
    return {row["key"]: row["value"] for row in rows}

def substitute_vars(text: Optional[str], vars_dict: Dict[str, str]) -> Optional[str]:
    """Replace {{key}} with value from vars_dict. If key not found, leave unchanged."""
    if text is None:
        return None
    for key, value in vars_dict.items():
        text = text.replace(f"{{{{{key}}}}}", value)
    return text

def apply_env_substitution(config: RequestConfig, vars_dict: Dict[str, str]) -> RequestConfig:
    """
    Return a new RequestConfig with environment variables substituted in:
    - url (full string)
    - query_params (values)
    - headers (values)
    - body (raw text)
    - auth (as a JSON object, we'll substitute string values inside)
    """
    # Deep copy to avoid mutating the original
    substituted = config.copy(deep=True)

    # URL
    if substituted.url:
        substituted.url = substitute_vars(substituted.url, vars_dict) or substituted.url

    # Query params: substitute each value
    if substituted.query_params:
        new_params = {}
        for key, val in substituted.query_params.items():
            new_params[key] = substitute_vars(val, vars_dict) or val
        substituted.query_params = new_params

    # Headers: substitute each value
    if substituted.headers:
        new_headers = {}
        for key, val in substituted.headers.items():
            new_headers[key] = substitute_vars(val, vars_dict) or val
        substituted.headers = new_headers

    # Body: if it's a string, substitute
    if substituted.body and isinstance(substituted.body, str):
        substituted.body = substitute_vars(substituted.body, vars_dict) or substituted.body

    # Auth: it's a dict, we'll traverse and substitute any string values
    if substituted.auth:
        def replace_in_obj(obj):
            if isinstance(obj, dict):
                return {k: replace_in_obj(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [replace_in_obj(item) for item in obj]
            elif isinstance(obj, str):
                return substitute_vars(obj, vars_dict) or obj
            else:
                return obj
        substituted.auth = replace_in_obj(substituted.auth)

    return substituted

# ========== REQUEST EXECUTION ==========

async def execute_request(config: RequestConfig) -> tuple[int, dict, str, float]:
    """Execute the request using the given config (already substituted)."""
    method = config.method.upper()
    url = config.url
    params = config.query_params or {}
    headers = config.headers or {}
    body = config.body
    body_type = config.body_type

    data = None
    json_data = None
    if body:
        if body_type == "json":
            try:
                json_data = json.loads(body)
            except:
                json_data = body
        elif body_type == "form":
            data = body
        else:
            data = body

    # --- Handle auth manually ---
    auth = config.auth
    if auth:
        if auth.get('type') == 'basic':
            username = auth.get('username', '')
            password = auth.get('password', '')
            credentials = f"{username}:{password}".encode('utf-8')
            import base64
            headers['Authorization'] = f"Basic {base64.b64encode(credentials).decode('utf-8')}"
        elif auth.get('type') == 'bearer':
            token = auth.get('token', '')
            headers['Authorization'] = f"Bearer {token}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        start = time.perf_counter()
        response = await client.request(
            method=method,
            url=url,
            params=params,
            headers=headers,
            # auth parameter removed – we send the header manually
            content=body if body_type not in ("json", "form") else None,
            json=json_data,
            data=data if body_type == "form" else None,
        )
        elapsed = (time.perf_counter() - start) * 1000
        try:
            resp_body = response.text
        except:
            resp_body = "<binary>"
        resp_headers = dict(response.headers)

    return response.status_code, resp_headers, resp_body, elapsed

# ========== UPSERT REQUEST (DB) ==========

async def upsert_request(
    db: aiosqlite.Connection,
    config: RequestConfig,   # original config (unsubstituted)
    state: str,
    collection_id: Optional[int] = None,
    request_id: Optional[int] = None,
    response_data: Optional[dict] = None
) -> int:
    query_params_json = json.dumps(config.query_params) if config.query_params else None
    headers_json = json.dumps(config.headers) if config.headers else None
    auth_json = json.dumps(config.auth) if config.auth else None
    response_headers_json = json.dumps(response_data.get("headers")) if response_data and response_data.get("headers") else None

    if request_id is not None:
        await db.execute(
            "UPDATE requests SET collection_id = ? WHERE id = ?",
            (collection_id, request_id)
        )
        await db.commit()
        return request_id
    else:
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

# ========== ENDPOINTS ==========

@router.get("/health")
async def health():
    return {"status": "ok"}

# ---- List requests with optional filters ----
@router.get("/requests", response_model=List[RequestOut])
async def list_requests(
    state: Optional[str] = None,
    collection_id: Optional[int] = None,
    db: aiosqlite.Connection = Depends(get_db)
):
    query = "SELECT * FROM requests WHERE 1=1"
    params = []
    if state:
        if state not in ("DRAFT", "EXECUTED"):
            raise HTTPException(status_code=400, detail="Invalid state. Must be 'DRAFT' or 'EXECUTED'")
        query += " AND state = ?"
        params.append(state)
    if collection_id is not None:
        query += " AND collection_id = ?"
        params.append(collection_id)
    query += " ORDER BY created_at DESC"
    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()
    return [row_to_request_dict(row) for row in rows]

# ---- Get single request ----
@router.get("/requests/{request_id}", response_model=RequestOut)
async def get_request(request_id: int, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT * FROM requests WHERE id = ?", (request_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Request not found")
    return row_to_request_dict(row)

# ---- Send (execute) ----
@router.post("/requests/send", response_model=SendResponse)
async def send_request(req: SendRequest, db: aiosqlite.Connection = Depends(get_db)):
    vars_dict = {}
    if req.environment_id:
        vars_dict = await get_env_vars(db, req.environment_id)

    # Apply environment substitution to the request config
    substituted_config = apply_env_substitution(req, vars_dict)
    print(f"DEBUG: vars_dict = {vars_dict}")
    print(f"DEBUG: original URL: {req.url}")
    print(f"DEBUG: substituted URL: {substituted_config.url}")

    # Execute using the substituted config
    status, headers, body, elapsed = await execute_request(substituted_config)

    response_data = {
        "status": status,
        "headers": headers,
        "body": body,
        "time": elapsed
    }

    # Store the ORIGINAL config (with placeholders) in DB
    request_id = await upsert_request(
        db=db,
        config=req,  # original, unsubstituted
        state="EXECUTED",
        collection_id=None,
        request_id=None,
        response_data=response_data
    )

    return SendResponse(
        statusCode=status,
        headers=headers,
        body=body,
        responseTime=int(elapsed),
        responseSize=len(body.encode("utf-8")),
        request_id=request_id
    )

# ---- Save (attach to collection) ----
@router.post("/requests/save", response_model=SaveResponse)
async def save_request(req: SaveRequest, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT id, name FROM collections WHERE id = ?", (req.collection_id,))
    collection_row = await cursor.fetchone()
    if not collection_row:
        raise HTTPException(status_code=404, detail="Collection not found")
    collection = dict(collection_row)

    cursor = await db.execute("SELECT * FROM requests WHERE id = ?", (req.request_id,))
    request_row = await cursor.fetchone()
    if not request_row:
        raise HTTPException(status_code=404, detail="Request not found")

    await db.execute(
        "UPDATE requests SET collection_id = ? WHERE id = ?",
        (req.collection_id, req.request_id)
    )
    await db.commit()

    cursor = await db.execute("SELECT * FROM requests WHERE id = ?", (req.request_id,))
    updated_row = await cursor.fetchone()
    request_dict = row_to_request_dict(updated_row)

    return SaveResponse(
        request=RequestOut(**request_dict),
        collection=CollectionInfo(**collection)
    )

# ---- Update request (draft or executed) ----
@router.patch("/requests/{request_id}")
async def update_request(
    request_id: int,
    update_data: RequestUpdate,
    db: aiosqlite.Connection = Depends(get_db)
):
    cursor = await db.execute("SELECT * FROM requests WHERE id = ?", (request_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Request not found")
    existing = dict(row)

    if existing["state"] == "EXECUTED":
        # Create new draft copy
        new_data = existing.copy()
        for key, value in update_data.dict(exclude_unset=True).items():
            if value is not None:
                new_data[key] = value

        query_params = json.dumps(new_data["query_params"]) if new_data.get("query_params") else None
        headers = json.dumps(new_data["headers"]) if new_data.get("headers") else None
        auth = json.dumps(new_data["auth"]) if new_data.get("auth") else None

        cursor = await db.execute("""
            INSERT INTO requests (
                collection_id, state, method, url, query_params, headers, auth,
                body, body_type, response_status, response_headers, response_body,
                response_time, executed_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (
            new_data.get("collection_id"),
            "DRAFT",
            new_data.get("method"),
            new_data.get("url"),
            query_params,
            headers,
            auth,
            new_data.get("body"),
            new_data.get("body_type"),
            None, None, None, None, None
        ))
        await db.commit()
        new_id = cursor.lastrowid
        return {"message": "Edited executed request – created new draft", "new_id": new_id}
    else:
        # Update draft
        update_fields = []
        values = []
        for key, value in update_data.dict(exclude_unset=True).items():
            if value is not None:
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
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

# ---- Shared request config ----
class RequestConfig(BaseModel):
    method: str
    url: str
    query_params: Optional[Dict[str, str]] = None
    headers: Optional[Dict[str, str]] = None
    auth: Optional[Dict[str, Any]] = None
    body: Optional[str] = None
    body_type: Optional[str] = None  # json, form, text, etc.

class RequestUpdate(BaseModel):
    """Fields that can be updated on a request (draft or executed)."""
    method: Optional[str] = None
    url: Optional[str] = None
    query_params: Optional[Dict[str, str]] = None
    headers: Optional[Dict[str, str]] = None
    auth: Optional[Dict[str, Any]] = None
    body: Optional[str] = None
    body_type: Optional[str] = None
    # We do NOT allow updating collection_id here – that's done via /save.

# ---- Send request ----
class SendRequest(RequestConfig):
    environment_id: Optional[int] = None  # not used yet

class SendResponse(BaseModel):
    statusCode: int
    headers: Dict[str, str]
    body: str
    responseTime: int  # ms
    responseSize: int  # bytes
    request_id: Optional[int] = None

# ---- Collections ----
class CollectionCreate(BaseModel):
    name: str

class CollectionUpdate(BaseModel):
    name: str

class CollectionOut(BaseModel):
    id: int
    name: str
    created_at: datetime
    share_token: Optional[str] = None

# ---- Request out (for history / collection) ----
class RequestOut(BaseModel):
    id: int
    collection_id: Optional[int]
    state: str
    method: str
    url: str
    query_params: Optional[Dict[str, str]]
    headers: Optional[Dict[str, str]]
    auth: Optional[Dict[str, Any]]
    body: Optional[str]
    body_type: Optional[str]
    response_status: Optional[int]
    response_headers: Optional[Dict[str, str]]
    response_body: Optional[str]
    response_time: Optional[int]
    created_at: datetime
    executed_at: Optional[datetime]\
    
# ---- Save request (new simplified version) ----
class SaveRequest(BaseModel):
    collection_id: int
    request_id: int

# ---- Response for save ----
class CollectionInfo(BaseModel):
    id: int
    name: str

class SaveResponse(BaseModel):
    request: RequestOut
    collection: CollectionInfo


class CollectionShareResponse(BaseModel):
    collection: CollectionOut
    requests: List[RequestOut]

# ---- Environment ----
class EnvironmentCreate(BaseModel):
    name: str

class EnvironmentUpdate(BaseModel):
    name: str

class EnvironmentOut(BaseModel):
    id: int
    name: str

# ---- Environment Variables ----
class VariableCreate(BaseModel):
    key: str
    value: str

class VariableUpdate(BaseModel):
    key: Optional[str] = None
    value: Optional[str] = None

class VariableOut(BaseModel):
    id: int
    environment_id: int
    key: str
    value: str
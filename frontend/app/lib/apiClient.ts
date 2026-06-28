// src/lib/api-client.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface SendRequestPayload {
  method: string;
  url: string;
  query_params?: Record<string, string>;
  headers?: Record<string, string>;
  auth?: any;
  body?: string;
  body_type?: string;
  environment_id?: number;
}

export interface SendResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  responseTime: number;
  responseSize: number;
  request_id?: number;
}

export async function sendRequest(
  payload: SendRequestPayload,
): Promise<SendResponse> {
  const response = await fetch(`${API_BASE}/requests/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

// Add these to the existing file

export interface Collection {
  id: number;
  name: string;
  created_at: string;
  share_token?: string;
}

export interface RequestOut {
  id: number;
  collection_id: number | null;
  state: "DRAFT" | "EXECUTED";
  method: string;
  url: string;
  query_params: Record<string, string> | null;
  headers: Record<string, string> | null;
  auth: any;
  body: string | null;
  body_type: string | null;
  response_status: number | null;
  response_headers: Record<string, string> | null;
  response_body: string | null;
  response_time: number | null;
  created_at: string;
  executed_at: string | null;
}

export async function getCollections(): Promise<Collection[]> {
  const res = await fetch(`${API_BASE}/collections`);
  if (!res.ok) throw new Error("Failed to fetch collections");
  return res.json();
}

export async function getRequests(
  collectionId?: number,
): Promise<RequestOut[]> {
  let url = `${API_BASE}/requests`;
  if (collectionId) url += `?collection_id=${collectionId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch requests");
  return res.json();
}

export async function getRequest(id: number): Promise<RequestOut> {
  const res = await fetch(`${API_BASE}/requests/${id}`);
  if (!res.ok) throw new Error("Failed to fetch request");
  return res.json();
}

export async function createCollection(name: string): Promise<Collection> {
  const res = await fetch(`${API_BASE}/collections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create collection");
  return res.json();
}

export interface SaveRequestPayload {
  collection_id: number;
  request_id: number;
}

export async function saveRequest(payload: SaveRequestPayload): Promise<any> {
  const res = await fetch(`${API_BASE}/requests/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to save request");
  return res.json();
}

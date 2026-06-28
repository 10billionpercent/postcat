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

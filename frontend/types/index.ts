export interface RequestConfig {
  method: string;
  url: string;
  query_params?: Record<string, string>;
  headers?: Record<string, string>;
  auth?: any;
  body?: string;
  body_type?: string;
}

export interface ResponseData {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  responseTime: number;
  responseSize: number;
  request_id?: number;
}

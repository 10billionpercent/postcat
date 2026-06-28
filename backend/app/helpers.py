import json
import aiosqlite

def row_to_request_dict(row: aiosqlite.Row) -> dict:
    d = dict(row)
    for key in ['query_params', 'headers', 'auth', 'response_headers']:
        if d.get(key):
            d[key] = json.loads(d[key])
    return d
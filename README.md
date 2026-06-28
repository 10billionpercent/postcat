# Postcat – Lightweight API Client

**Postcat** is a clean, well‑structured API client inspired by Postman. It follows a simple client‑server architecture where the browser never sends HTTP requests directly – all requests are routed through a FastAPI backend, which also persists request history, collections, and environment variables.

The goal is to build a maintainable, modular application that matches the core Postman workflow without over‑engineering.

---

## 🚀 Features

- **Request Builder** – Choose HTTP method, enter URL, add query parameters, headers, authentication (Basic / Bearer), and request body (raw, form‑data, urlencoded, GraphQL, binary).
- **Collections** – Organise requests into collections. Save drafts and executed requests.
- **History** – Automatically store every executed request, grouped by date (Today, Yesterday, Older).
- **Environments** – Manage key‑value variables and substitute them into request URLs, headers, body, and auth fields.
- **Multiple Tabs** – Open several requests simultaneously, each in its own tab (like VS Code).
- **Draft / Executed States** – Drafts are editable; executed requests are immutable. Editing an executed request creates a new draft.
- **Lightweight & Fast** – Built with modern async Python and Next.js, with local SQLite for development and Cloudflare D1 for production.

---

## 🛠️ Tech Stack

| Layer       | Technology                                                                 |
|-------------|----------------------------------------------------------------------------|
| **Frontend** | Next.js (React) with TypeScript, Tailwind CSS                            |
| **Backend**  | FastAPI (Python), using `httpx` for proxying requests                    |
| **Database** | SQLite (local development) / Cloudflare D1 (production)                  |
| **Deployment** | Render (backend), Vercel or Render (frontend)                            |
| **Other**    | `aiosqlite` (SQLite async), `python-dotenv`, `lucide-react` (icons)      |

---

## 🏗️ Architecture Overview

### High‑Level Flow

1. The user interacts with the **Next.js frontend**.
2. The frontend sends request details to the **FastAPI backend** (e.g., `POST /requests/send`).
3. The backend applies environment variable substitution, executes the request against the target API using `httpx`, and captures the response.
4. The backend stores the request configuration and response in the database (SQLite/D1).
5. The backend returns the response to the frontend.
6. The frontend renders the response.

This design centralises business logic in the backend, keeps the frontend “dumb”, and enables features like history, collections, and environment substitution without exposing your database to the client.

### Key Backend Endpoints

| Method | Endpoint                  | Description                                      |
|--------|---------------------------|--------------------------------------------------|
| POST   | `/requests/send`          | Execute a request and store it as `EXECUTED`    |
| POST   | `/requests/save`          | Attach an existing request to a collection      |
| PATCH  | `/requests/{id}`          | Update a draft or create a new draft from executed |
| GET    | `/requests`               | List requests (filter by state, collection)     |
| GET    | `/requests?state=EXECUTED`| List executed requests (history)     |
| GET    | `/collections`            | List all collections                            |
| POST   | `/collections`            | Create a new collection                         |
| GET    | `/environments`           | List all environments                           |
| POST   | `/environments/{id}/variables` | Create a variable for an environment         |

---

## 🗄️ Database Schema

The schema intentionally stays minimal. All tables are created automatically on startup.

### `collections`

| Column       | Type          | Description                        |
|--------------|---------------|------------------------------------|
| `id`         | INTEGER (PK)  | Auto‑increment primary key         |
| `name`       | TEXT          | Collection name                    |
| `share_token`| TEXT (UNIQUE) | Token for public sharing (optional)|
| `created_at` | TIMESTAMP     | Creation timestamp                 |

### `requests`

This is the central entity. Each row stores one request configuration and (if executed) its response.

| Column             | Type          | Description                                       |
|--------------------|---------------|---------------------------------------------------|
| `id`               | INTEGER (PK)  | Auto‑increment                                    |
| `collection_id`    | INTEGER (FK)  | Nullable – references `collections.id`           |
| `state`            | TEXT          | `'DRAFT'` or `'EXECUTED'`                        |
| `method`           | TEXT          | HTTP method (GET, POST, …)                       |
| `url`              | TEXT          | The request URL (may contain placeholders)       |
| `query_params`     | TEXT (JSON)   | Query parameters as JSON string                  |
| `headers`          | TEXT (JSON)   | Headers as JSON                                  |
| `auth`             | TEXT (JSON)   | Auth config (type, token, username, password)    |
| `body`             | TEXT          | Request body (raw text)                          |
| `body_type`        | TEXT          | e.g. `'json'`, `'form'`, `'text'`               |
| `response_status`  | INTEGER       | HTTP status code of the last execution           |
| `response_headers` | TEXT (JSON)   | Response headers                                 |
| `response_body`    | TEXT          | Response body (as text)                          |
| `response_time`    | INTEGER       | Response time in milliseconds                    |
| `created_at`       | TIMESTAMP     | When the request was first saved                 |
| `executed_at`      | TIMESTAMP     | When it was last executed (if `EXECUTED`)        |

**Important rules**:
- Drafts are editable; updates modify the same row.
- Executed requests are immutable; any edit creates a new draft row.
- History is simply all requests with `state = 'EXECUTED'` – there is no separate `history` table.

### `environments`

| Column | Type          | Description              |
|--------|---------------|--------------------------|
| `id`   | INTEGER (PK)  | Auto‑increment           |
| `name` | TEXT          | Environment name         |

### `environment_variables`

| Column           | Type          | Description                         |
|------------------|---------------|-------------------------------------|
| `id`             | INTEGER (PK)  | Auto‑increment                      |
| `environment_id` | INTEGER (FK)  | References `environments.id`       |
| `key`            | TEXT          | Variable name (e.g., `host`)        |
| `value`          | TEXT          | Variable value (e.g., `api.example.com`) |

---

## 📦 Setup Instructions

### 1. Prerequisites

- Node.js (v18 or newer)
- Python 3.10 or newer
- `pip` and `virtualenv` (or `venv`)
- Git (optional)

### 2. Clone the Repository

```bash
git clone <repo-url>
cd postcat
```

### 3. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:

```env
ENVIRONMENT=local               # local / production
# For local SQLite, no additional variables needed.
# For D1 production, add:
CLOUDFLARE_ACCOUNT_ID=your_id
CLOUDFLARE_API_TOKEN=your_token
D1_DATABASE_ID=your_db_id
```

Run the backend:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`. Swagger docs at `/docs`.

### 4. Frontend Setup

```bash
cd ../frontend
npm install
```

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Run the development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`.

---

## 🌐 Deployment

### Backend (Render)

1. Push your code to a Git repository.
2. On Render, create a new **Web Service** and connect your repo.
3. Set **Environment** to `Python 3`.
4. **Build Command**: `pip install -r requirements.txt`
5. **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add all environment variables (including `ENVIRONMENT=production` and Cloudflare D1 credentials).
7. Deploy.

### Frontend (Vercel or Render)

1. On Vercel (or Render), import your frontend repo.
2. Set **Framework Preset** to `Next.js`.
3. Add environment variable `NEXT_PUBLIC_API_URL` pointing to your deployed backend URL.
4. Deploy.

> **Note**: The backend must allow CORS from your frontend domain. Update `app/main.py` `allow_origins` accordingly.

---

## ⚙️ Design Decisions & Assumptions

| Decision / Assumption | Rationale |
|------------------------|-----------|
| **Backend as request runner** | Keeps business logic centralised, prevents browser from leaking credentials, simplifies environment substitution and history. |
| **No separate `history` table** | History is just executed requests; reduces schema complexity and duplication. |
| **Draft vs Executed** | Following Postman’s model: drafts are mutable, executed requests are immutable to preserve history. |
| **Store original config with placeholders** | Environment variables are substituted at execution time only, so the stored request retains `{{key}}` placeholders; this allows variables to change later without updating every request. |
| **SQLite for local, D1 for production** | SQLite is lightweight for development; D1 offers a serverless, globally distributed SQL solution that’s fully compatible with SQLite syntax. |
| **Manual Basic/Bearer Auth headers** | We build the `Authorization` header ourselves instead of using `httpx` auth, giving full control over how headers are generated. |
| **Single user / no authentication** | The current version is a single‑tenant tool; authentication and user management are out of scope for this version. |
| **No WebSocket support** | The tool is designed for REST/HTTP APIs only. |

---

## 🔮 Future Improvements (Ideas)

- **Pre‑request Scripts & Tests** – support for JavaScript snippets (using a sandboxed environment).
- **Import/Export** – Postman collection import/export.
- **Response visualisation** – preview HTML, images, etc.
- **Response History per request** – store multiple responses for a single executed request.
- **Keyboard shortcuts** – for faster navigation.

---

## 📄 License

MIT

---

**Postcat** – because every developer deserves a clean, lightweight API client.
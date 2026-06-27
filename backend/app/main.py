from fastapi import FastAPI
from contextlib import asynccontextmanager
from .database import init_db
from .routes import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables
    await init_db()
    yield
    # Shutdown: nothing needed

app = FastAPI(lifespan=lifespan)
app.include_router(router)

@app.get("/")
async def root():
    return {"message": "Postcat API running"}
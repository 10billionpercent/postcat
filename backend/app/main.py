from fastapi import FastAPI
from contextlib import asynccontextmanager
from .database import init_db
from .routers import requests, collections, environments

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(lifespan=lifespan)

app.include_router(requests.router)
app.include_router(collections.router)
app.include_router(environments.router)

@app.get("/")
async def root():
    return {"message": "Postcat API running"}
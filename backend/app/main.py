from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.redis_client import close_redis, get_redis
from app.routers import admin, agents, analytics, auth, events, notifications, tickets, ws

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: warm up redis connection
    redis = await get_redis()
    await redis.ping()
    print("✓ Redis connected")
    yield
    # Shutdown
    await close_redis()
    print("✓ Redis connection closed")


app = FastAPI(
    title=settings.APP_TITLE,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(agents.router)
app.include_router(tickets.router)
app.include_router(notifications.router)
app.include_router(admin.router)
app.include_router(analytics.router)
app.include_router(events.router)
app.include_router(ws.router)


@app.get("/health", tags=["health"])
async def health():
    redis = await get_redis()
    redis_ok = await redis.ping()
    return {"status": "ok", "redis": redis_ok}

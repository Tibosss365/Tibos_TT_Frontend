from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.config import get_settings
from app.database import Base, engine
from app.redis_client import close_redis, get_redis
from app.routers import admin, agents, analytics, auth, events, notifications, tickets, ws
from app.routers import inbound_email, categories
from app.services.email_poller import email_poller

# Import all models so Base.metadata knows about all tables
import app.models  # noqa: F401

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ────────────────────────────────────────────────────────
    # 1. Redis
    redis = await get_redis()
    await redis.ping()
    print("✓ Redis connected")

    # 2. Start email poller only if inbound email is enabled in DB
    try:
        from app.database import AsyncSessionLocal
        from app.models.inbound_email import InboundEmailConfig
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(InboundEmailConfig))
            cfg = result.scalar_one_or_none()
            if cfg and cfg.enabled:
                email_poller.start()
                print("✓ Email poller started")
            else:
                print("  Email poller is disabled (configure via Admin → Email → Inbound)")
    except Exception as e:
        print(f"  Email poller could not start: {e}")

    yield

    # ── Shutdown ───────────────────────────────────────────────────────
    email_poller.stop()
    await close_redis()
    print("✓ Shutdown complete")


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
app.include_router(inbound_email.router)
app.include_router(categories.router)
app.include_router(events.router)
app.include_router(ws.router)


@app.get("/health", tags=["health"])
async def health():
    redis = await get_redis()
    redis_ok = await redis.ping()
    return {
        "status": "ok",
        "redis": redis_ok,
        "email_poller": "running" if (
            email_poller._task and not email_poller._task.done()
        ) else "stopped",
    }

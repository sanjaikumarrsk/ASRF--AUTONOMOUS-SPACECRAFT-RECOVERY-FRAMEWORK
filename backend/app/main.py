import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError

from .config import get_settings
from .database import SessionLocal
from .demo import demo_loop, seed_demo_data
from .errors import RequestConflictError, ResourceNotFoundError
from .routes import auth_router, router
from .services import detect_stale_telemetry
from .telemetry_stream import stream_manager

logger = logging.getLogger("celestial_x")
settings = get_settings()


async def stale_scan_loop() -> None:
    while True:
        await asyncio.sleep(max(10, settings.celestial_stale_scan_seconds))
        db = SessionLocal()
        try:
            detect_stale_telemetry(db)
            db.commit()
        except SQLAlchemyError:
            db.rollback()
            logger.exception("Stale telemetry scan failed")
        finally:
            db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    tasks = [
        asyncio.create_task(stale_scan_loop()),
        asyncio.create_task(stream_manager.run_loop()),
    ]
    try:
        yield
    finally:
        for task in tasks:
            task.cancel()
        for task in tasks:
            try:
                await task
            except asyncio.CancelledError:
                pass


app = FastAPI(
    title="AUTONOMOUS SPACECRAFT RECOVERY FRAMEWORK API",
    version="1.0.0",
    description="Persisted spacecraft telemetry, 50-component digital twin, deterministic fault detection, and recovery audit APIs.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(router)


@app.middleware("http")
async def protect_api(request: Request, call_next):
    # Paths requiring authentication:
    # Mutating requests to system actions, /api/auth/me, or approval actions
    protected_prefixes = ("/api/auth/me", "/api/recovery-strategies/approve")
    is_protected = any(request.url.path.startswith(p) for p in protected_prefixes)

    if settings.celestial_security_enabled and is_protected and request.method != "OPTIONS":
        authorization = request.headers.get("Authorization", "")
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer":
            return JSONResponse(status_code=401, content={"message": "Authentication is required."}, headers={"WWW-Authenticate": "Bearer"})
        from .auth import is_valid_session
        if not is_valid_session(token):
            return JSONResponse(status_code=401, content={"message": "Authentication is required."}, headers={"WWW-Authenticate": "Bearer"})
    return await call_next(request)


@app.get("/health")
def health():
    return {"status": "UP", "database": "configured", "ai": settings.ai_available}


@app.exception_handler(ResourceNotFoundError)
async def not_found(request: Request, exc: ResourceNotFoundError):
    return JSONResponse(status_code=404, content={"timestamp": datetime.now(timezone.utc).isoformat(), "status": 404, "error": "Not Found", "message": exc.message, "path": str(request.url.path), "fieldErrors": {}})


@app.exception_handler(RequestConflictError)
async def conflict(request: Request, exc: RequestConflictError):
    return JSONResponse(status_code=409, content={"timestamp": datetime.now(timezone.utc).isoformat(), "status": 409, "error": "Conflict", "message": exc.message, "path": str(request.url.path), "fieldErrors": {}})


@app.exception_handler(RequestValidationError)
async def validation(request: Request, exc: RequestValidationError):
    fields = {}
    for error in exc.errors():
        location = error.get("loc", [])
        field = str(location[-1]) if location else "request"
        fields.setdefault(field, error.get("msg", "Invalid value"))
    return JSONResponse(status_code=400, content={"timestamp": datetime.now(timezone.utc).isoformat(), "status": 400, "error": "Validation Failed", "message": "Request validation failed", "path": str(request.url.path), "fieldErrors": fields})


@app.exception_handler(HTTPException)
async def http_error(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"timestamp": datetime.now(timezone.utc).isoformat(), "status": exc.status_code, "error": "HTTP Error", "message": str(exc.detail), "path": str(request.url.path), "fieldErrors": {}})


@app.exception_handler(Exception)
async def unexpected(request: Request, exc: Exception):
    logger.exception("Unhandled API error: %s", exc)
    return JSONResponse(status_code=500, content={"timestamp": datetime.now(timezone.utc).isoformat(), "status": 500, "error": "Internal Server Error", "message": "The request could not be completed.", "path": str(request.url.path), "fieldErrors": {}})

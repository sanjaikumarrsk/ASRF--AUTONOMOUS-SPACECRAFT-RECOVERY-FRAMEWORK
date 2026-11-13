from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import os
import re
import secrets
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .models import User, utc_now

SESSION_TTL_HOURS = 24


@dataclass(frozen=True)
class SessionData:
    user_id: str
    username: str
    role: str
    name: str
    expires_at: datetime


class _SessionStore(dict[str, SessionData]):
    def clear_expired(self, now: datetime) -> None:
        expired = [token for token, session in self.items() if session.expires_at <= now]
        for token in expired:
            self.pop(token, None)


_sessions = _SessionStore()


def hash_password(password: str) -> str:
    """Generate a secure PBKDF2-HMAC-SHA256 salted hash."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return f"pbkdf2:sha256:100000${salt}${key.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hashed string."""
    try:
        parts = hashed.split('$')
        if len(parts) != 3:
            return False
        algo_iter, salt, expected_hash = parts
        key = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return hmac.compare_digest(key.hex(), expected_hash)
    except Exception:
        return False


def validate_registration(name: str, email: str, username: str, password: str, confirm_password: str | None = None) -> None:
    if not name or len(name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Name must be at least 2 characters.")
    
    email_regex = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    if not email or not re.match(email_regex, email.strip()):
        raise HTTPException(status_code=400, detail="A valid email address is required.")
        
    if not username or len(username.strip()) < 3 or not re.match(r"^[a-zA-Z0-9_-]+$", username.strip()):
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters and contain only letters, numbers, hyphens or underscores.")
        
    if not password or len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")
        
    if confirm_password is not None and password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")


def register_user(db: Session, name: str, email: str, username: str, password: str, confirm_password: str | None = None, role: str = "SCIENTIST") -> tuple[str, datetime, User]:
    validate_registration(name, email, username, password, confirm_password)
    
    normalized_username = username.strip().lower()
    normalized_email = email.strip().lower()
    
    # Check duplicate username
    existing_user = db.scalar(select(User).where(User.username == normalized_username))
    if existing_user:
        raise HTTPException(status_code=409, detail=f"Username '{username}' is already registered.")
        
    # Check duplicate email
    existing_email = db.scalar(select(User).where(User.email == normalized_email))
    if existing_email:
        raise HTTPException(status_code=409, detail=f"Email '{email}' is already registered.")
        
    user = User(
        name=name.strip(),
        email=normalized_email,
        username=normalized_username,
        password_hash=hash_password(password),
        role=role.upper() if role else "SCIENTIST",
        is_active=True,
        created_at=utc_now(),
        last_login=utc_now()
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token, expires_at = create_session(user)
    return token, expires_at, user


def authenticate_user(db: Session, identifier: str, password: str) -> tuple[str, datetime, User]:
    if not identifier or not password:
        raise HTTPException(status_code=400, detail="Username/email and password are required.")
        
    clean_id = identifier.strip().lower()
    user = db.scalar(select(User).where((User.username == clean_id) | (User.email == clean_id)))
    
    if not user:
        # Fallback to configured ops admin if not in DB yet
        settings = get_settings()
        if settings.celestial_ops_username and clean_id == settings.celestial_ops_username.lower() and password == settings.celestial_ops_password:
            # Auto-seed admin user into DB
            user = User(
                name="Flight Operations",
                email=f"{settings.celestial_ops_username}@celestial-x.nasa.gov",
                username=settings.celestial_ops_username.lower(),
                password_hash=hash_password(settings.celestial_ops_password),
                role="ADMIN",
                is_active=True,
                created_at=utc_now(),
                last_login=utc_now()
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password.")
            
    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password.")
        
    user.last_login = utc_now()
    db.commit()
    
    token, expires_at = create_session(user)
    return token, expires_at, user


def create_session(user: User) -> tuple[str, datetime]:
    now = datetime.now(timezone.utc)
    _sessions.clear_expired(now)
    expires_at = now + timedelta(hours=SESSION_TTL_HOURS)
    token = secrets.token_urlsafe(32)
    _sessions[token] = SessionData(
        user_id=str(user.id),
        username=user.username,
        role=user.role,
        name=user.name,
        expires_at=expires_at
    )
    return token, expires_at


def get_current_session(token: str | None) -> SessionData | None:
    if not token:
        return None
    session = _sessions.get(token)
    if not session:
        return None
    if session.expires_at <= datetime.now(timezone.utc):
        _sessions.pop(token, None)
        return None
    return session


def get_session_role(token: str | None) -> str | None:
    session = get_current_session(token)
    return session.role if session else None


def get_session_user(token: str | None) -> str | None:
    session = get_current_session(token)
    return session.username if session else None


def is_valid_session(token: str | None) -> bool:
    return get_current_session(token) is not None


def terminate_session(token: str | None) -> None:
    if token:
        _sessions.pop(token, None)


def revoke_session(token: str | None) -> None:
    terminate_session(token)

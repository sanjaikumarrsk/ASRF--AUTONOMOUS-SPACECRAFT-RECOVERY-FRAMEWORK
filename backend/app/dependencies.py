import secrets

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBasic, HTTPBasicCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import get_settings
from .database import get_db
from .auth import get_session_role, is_valid_session
from .roles import UserRole

basic_auth = HTTPBasic(auto_error=False)
bearer_auth = HTTPBearer(auto_error=False)


def require_api_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_auth),
) -> None:
    settings = get_settings()
    if not settings.celestial_security_enabled:
        return
    if not credentials or credentials.scheme.lower() != "bearer" or not is_valid_session(credentials.credentials):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_mutation_auth(
    credentials: HTTPBasicCredentials | None = Depends(basic_auth),
    bearer_credentials: HTTPAuthorizationCredentials | None = Depends(bearer_auth),
    _db: Session = Depends(get_db),
) -> None:
    settings = get_settings()
    if not settings.celestial_security_enabled:
        return
    if bearer_credentials and bearer_credentials.scheme.lower() == "bearer":
        role = get_session_role(bearer_credentials.credentials)
        if role == UserRole.OPERATIONAL_RESEARCHER:
            return
        if role == UserRole.SCIENTIST:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operational Researcher access is required for this action.")
    if not credentials or not settings.celestial_ops_username or not settings.celestial_ops_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Mutation authentication is not configured.", headers={"WWW-Authenticate": "Basic"})
    valid_user = secrets.compare_digest(credentials.username, settings.celestial_ops_username)
    valid_password = secrets.compare_digest(credentials.password, settings.celestial_ops_password)
    if not (valid_user and valid_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid mutation credentials.", headers={"WWW-Authenticate": "Basic"})

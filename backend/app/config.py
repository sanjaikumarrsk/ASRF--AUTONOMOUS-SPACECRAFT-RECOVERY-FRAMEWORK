from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BACKEND_DIR / ".env"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(ENV_FILE), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    db_host: str = Field(default="localhost", validation_alias=AliasChoices("CELESTIAL_DB_HOST", "DB_HOST", "db_host"))
    db_port: int = Field(default=5432, validation_alias=AliasChoices("CELESTIAL_DB_PORT", "DB_PORT", "db_port"))
    db_name: str = Field(default="celestial_x", validation_alias=AliasChoices("CELESTIAL_DB_NAME", "DB_NAME", "db_name"))
    db_username: str = Field(default="celestial_x", validation_alias=AliasChoices("CELESTIAL_DB_USERNAME", "DB_USERNAME", "db_username"))
    db_password: str = Field(default="", validation_alias=AliasChoices("CELESTIAL_DB_PASSWORD", "DB_PASSWORD", "db_password"))
    server_port: int = 8000
    celestial_cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    celestial_security_enabled: bool = True
    celestial_ops_username: str = ""
    celestial_ops_password: str = ""
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    celestial_stale_minutes: float = 10.0
    celestial_stale_scan_seconds: int = 60
    celestial_demo_mode: bool = False
    celestial_demo_interval_seconds: int = 5
    celestial_temp_min: float = -40.0
    celestial_temp_max: float = 85.0
    celestial_power_max: float = 130.0
    celestial_battery_min: float = 25.0
    celestial_comm_delay_max: float = 30.0
    celestial_cpu_load_max: float = 90.0
    celestial_sudden_temp_delta: float = 10.0
    celestial_sudden_power_delta: float = 50.0
    celestial_sudden_load_delta: float = 30.0

    @property
    def database_url(self) -> str:
        password = self.db_password.replace("@", "%40")
        return f"postgresql+psycopg://{self.db_username}:{password}@{self.db_host}:{self.db_port}/{self.db_name}"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.celestial_cors_origins.split(",") if origin.strip()]

    @property
    def ai_available(self) -> bool:
        return bool(self.openai_api_key.strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()

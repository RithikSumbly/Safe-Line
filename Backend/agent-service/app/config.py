from functools import lru_cache
from pathlib import Path

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_AGENT_SERVICE_DIR = Path(__file__).resolve().parent.parent
_PROJECT_ROOT = _AGENT_SERVICE_DIR.parent.parent
_ROOT_ENV = _PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            str(_ROOT_ENV),
            str(_AGENT_SERVICE_DIR / ".env"),
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    llm_provider: str = "gemini"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    vite_supabase_url: str = Field(default="", validation_alias="VITE_SUPABASE_URL")

    cors_origins: str = "http://localhost:5173"
    port: int = 8000

    google_safe_browsing_key: str = ""
    virustotal_api_key: str = ""
    phishtank_api_key: str = ""
    google_fact_check_key: str = ""
    newsapi_key: str = ""
    tavily_api_key: str = ""

    meta_whatsapp_token: str = ""
    meta_phone_number_id: str = ""
    meta_verify_token: str = "safeline-verify-token"
    meta_app_secret: str = ""

    upstash_redis_url: str = ""
    upstash_redis_token: str = ""

    @model_validator(mode="after")
    def _resolve_supabase_url(self) -> "Settings":
        if not self.supabase_url and self.vite_supabase_url:
            self.supabase_url = self.vite_supabase_url
        return self

    @model_validator(mode="after")
    def _strip_meta_secrets(self) -> "Settings":
        self.meta_whatsapp_token = self.meta_whatsapp_token.strip()
        self.meta_phone_number_id = self.meta_phone_number_id.strip()
        self.meta_verify_token = self.meta_verify_token.strip()
        self.meta_app_secret = self.meta_app_secret.strip()
        return self

    @property
    def resolved_supabase_url(self) -> str:
        return self.supabase_url or self.vite_supabase_url

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

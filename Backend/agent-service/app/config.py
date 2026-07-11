from functools import lru_cache
from pathlib import Path

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_AGENT_SERVICE_DIR = Path(__file__).resolve().parent.parent
_PROJECT_ROOT = _AGENT_SERVICE_DIR.parent.parent
_ROOT_ENV = _PROJECT_ROOT / ".env"

# Always permit the live Vercel desk even if HF secrets only list localhost.
BUILTIN_WEB_ORIGINS = (
    "http://localhost:5173",
    "https://safe-line-khaki.vercel.app",
)


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
    phishtank_api_key: str = ""  # reserved; see app/tools/phishtank.py (stub, unused)
    google_fact_check_key: str = ""
    newsapi_key: str = ""
    tavily_api_key: str = ""

    meta_whatsapp_token: str = ""
    meta_phone_number_id: str = ""
    meta_verify_token: str = "safeline-verify-token"
    meta_app_secret: str = ""

    # HF Spaces cannot reach graph.facebook.com — relay sends via Vercel instead.
    whatsapp_send_relay_url: str = ""
    whatsapp_relay_secret: str = ""

    upstash_redis_url: str = ""
    upstash_redis_token: str = ""

    api_require_auth: bool = False
    api_csrf_enabled: bool = True
    api_rate_limit_enabled: bool = True
    api_rate_limit_guest_per_hour: int = 20
    api_rate_limit_auth_per_hour: int = 120

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
        self.whatsapp_send_relay_url = self.whatsapp_send_relay_url.strip()
        self.whatsapp_relay_secret = self.whatsapp_relay_secret.strip()
        return self

    @property
    def resolved_supabase_url(self) -> str:
        return self.supabase_url or self.vite_supabase_url

    @property
    def cors_origin_list(self) -> list[str]:
        seen: set[str] = set()
        origins: list[str] = []
        for origin in (
            *[o.strip() for o in self.cors_origins.split(",") if o.strip()],
            *BUILTIN_WEB_ORIGINS,
        ):
            if origin not in seen:
                seen.add(origin)
                origins.append(origin)
        return origins

    def is_allowed_browser_origin(self, origin: str) -> bool:
        if origin in self.cors_origin_list:
            return True
        # Vercel preview deploys for this project (safe-line-*.vercel.app).
        if origin.startswith("https://safe-line") and origin.endswith(".vercel.app"):
            return True
        return False


@lru_cache
def get_settings() -> Settings:
    return Settings()

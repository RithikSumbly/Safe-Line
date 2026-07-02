import sys
from pathlib import Path

# Ensure `import app.*` works under pytest without installing a package.
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def pytest_configure() -> None:
    """
    Tests should not touch the real Supabase project.
    Force Supabase client creation to be disabled.
    """
    import os

    os.environ["SUPABASE_URL"] = ""
    os.environ["SUPABASE_SERVICE_ROLE_KEY"] = ""
    # Backend also checks this fallback sometimes:
    os.environ["VITE_SUPABASE_URL"] = ""

    try:
        from app.db import supabase_client

        supabase_client.get_supabase.cache_clear()  # type: ignore[attr-defined]
    except Exception:
        pass

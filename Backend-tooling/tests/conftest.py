from _paths import bootstrap_app_imports

bootstrap_app_imports()


def pytest_configure() -> None:
    """Disable real Supabase during tests."""
    import os

    os.environ["SUPABASE_URL"] = ""
    os.environ["SUPABASE_SERVICE_ROLE_KEY"] = ""
    os.environ["VITE_SUPABASE_URL"] = ""

    try:
        from app.db import supabase_client

        supabase_client.get_supabase.cache_clear()  # type: ignore[attr-defined]
    except Exception:
        pass

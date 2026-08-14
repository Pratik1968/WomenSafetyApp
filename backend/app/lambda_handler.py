"""
AWS Lambda entrypoint. Wraps the existing FastAPI app (app.main:app) with Mangum
so it can run behind a Lambda Function URL — no route/handler code duplicated here.

Fails loudly at import time (i.e. at cold start, before serving any request) if
required production configuration is missing, rather than silently falling back
to the local-SQLite dev path that main.py/database.py use when SUPABASE_URL/KEY
are unset. That fallback is meaningless in Lambda (ephemeral filesystem, wiped
between cold starts) and must never serve real traffic.
"""

import os

from app.core.config import settings

if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    missing = [
        name
        for name in ("SUPABASE_URL", "SUPABASE_KEY")
        if not getattr(settings, name, None)
    ]
    if missing:
        raise RuntimeError(
            f"Refusing to start in Lambda without required env vars: {', '.join(missing)}. "
            "Set them on the function configuration - never fall back to local SQLite in production."
        )

from mangum import Mangum
from app.main import app

handler = Mangum(app)

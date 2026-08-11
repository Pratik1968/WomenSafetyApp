from typing import Optional


def mask_token(token: Optional[str], visible: int = 6) -> str:
    """Mask a sensitive token for safe logging, keeping only the last `visible` characters."""
    if not token:
        return ""
    if len(token) <= visible:
        return "*" * len(token)
    return f"...{token[-visible:]}"

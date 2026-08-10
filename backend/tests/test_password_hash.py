import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.security import hash_password, verify_password


def test_password_hash_roundtrip():
    password = "testpass123"
    hashed = hash_password(password)
    assert ":" in hashed, hashed
    assert verify_password(password, hashed) is True, hashed
    assert verify_password("wrong", hashed) is False


if __name__ == "__main__":
    test_password_hash_roundtrip()
    print("ok")

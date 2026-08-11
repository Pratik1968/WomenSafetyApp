import sys
from pathlib import Path
import inspect

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core import security

print("security file", security.__file__)
print("hash source line", inspect.getsourcelines(security.hash_password)[1])
print("verify source line", inspect.getsourcelines(security.verify_password)[1])
print("verify source:\n", inspect.getsource(security.verify_password))

password = "testpass123"
hashed = security.hash_password(password)

# Step through verify manually using the function internals
hashed_str = hashed
password_str = password
if not hashed_str or ":" not in hashed_str:
    print("guard fail")
else:
    try:
        salt_hex, key_hex = hashed_str.split(":", 1)
        if key_hex.startswith("$"):
            key_hex = key_hex[1:]
        salt = __import__("hashlib").pbkdf2_hmac.__self__  # noop
        import hashlib
        salt = bytes.fromhex(salt_hex)
        expected_key = bytes.fromhex(key_hex)
        key = hashlib.pbkdf2_hmac("sha256", password_str.encode("utf-8"), salt, 100000)
        print("manual compare", hashlib.compare_digest(key, expected_key))
    except Exception as e:
        print("manual exception", type(e), e)

print("function verify", security.verify_password(password, hashed))

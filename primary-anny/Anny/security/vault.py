"""ANNY local secret vault helper.

The vault never contains a built-in credential. Supply a master password through
an environment variable or a secure secret manager in production.
"""
from __future__ import annotations

import base64
import os
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


class Vault:
    def __init__(self, master_pass: str | None = None, salt: bytes | None = None):
        password = master_pass or os.environ.get("ANNY_VAULT_PASSWORD")
        if not password:
            raise RuntimeError("ANNY_VAULT_PASSWORD is required; no default vault password exists.")
        self.salt = salt or os.environ.get("ANNY_VAULT_SALT", "anny-local-install").encode()
        self.key = self._derive_key(password)
        self.cipher = Fernet(self.key)

    def _derive_key(self, pwd: str) -> bytes:
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=self.salt,
            iterations=310000,
        )
        return base64.urlsafe_b64encode(kdf.derive(pwd.encode()))

    def protect(self, data: str) -> str:
        return self.cipher.encrypt(data.encode()).decode()

    def reveal(self, cipher_text: str) -> str:
        return self.cipher.decrypt(cipher_text.encode()).decode()

    def store_secret(self, key_name: str, value: str, path: str = "./config/secrets.vault"):
        directory = os.path.dirname(path)
        if directory:
            os.makedirs(directory, exist_ok=True)
        protected_val = self.protect(value)
        with open(path, "a", encoding="utf-8") as handle:
            handle.write(f"{key_name}:{protected_val}\n")


if __name__ == "__main__":
    print("ANNY Vault is available. Provide ANNY_VAULT_PASSWORD to perform an operation.")

"""
ANNY - MODULE 07: ATMOSPHERIC VAULT
Description: Handles encryption of local secrets and proprietary data.
"""

from cryptography.fernet import Fernet
import os
import base64
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

class Vault:
    def __init__(self, master_pass: str = "ANNY_DEFAULT_KEY"):
        self.key = self._derive_key(master_pass)
        self.cipher = Fernet(self.key)

    def _derive_key(self, pwd: str) -> bytes:
        """Derives a deterministic key from a password."""
        salt = b'anny_neural_salt' # In production, use unique per-install salt
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        return base64.urlsafe_b64encode(kdf.derive(pwd.encode()))

    def protect(self, data: str) -> str:
        """Encrypts data into a secure cipher."""
        encrypted = self.cipher.encrypt(data.encode())
        return encrypted.decode()

    def reveal(self, cipher_text: str) -> str:
        """Decrypts data back to plaintext."""
        try:
            decrypted = self.cipher.decrypt(cipher_text.encode())
            return decrypted.decode()
        except Exception:
            return "[CORRUPTED_OR_ACCESS_DENIED]"

    def store_secret(self, key_name: str, value: str, path: str = "./config/secrets.vault"):
        """Encrypted storage to file."""
        os.makedirs(os.path.dirname(path), exist_ok=True)
        protected_val = self.protect(value)
        with open(path, "a") as f:
            f.write(f"{key_name}:{protected_val}\n")

if __name__ == "__main__":
    vault = Vault("master-alpha-9")
    token = "sk-proj-anny-neural-link-key"
    
    print(f"Protecting token: {token}")
    locked = vault.protect(token)
    print(f"Locked state: {locked}")
    
    print("Revealing data...")
    unlocked = vault.reveal(locked)
    print(f"Unlocked state: {unlocked}")

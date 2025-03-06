import hashlib
import sys
from typing import Union


def non_secure_md5_hash_str(s: Union[bytes, bytearray, memoryview]) -> str:
    """Drop in replacement hash function marking it for a non-security purpose."""
    return hashlib.sha256(s).hexdigest()

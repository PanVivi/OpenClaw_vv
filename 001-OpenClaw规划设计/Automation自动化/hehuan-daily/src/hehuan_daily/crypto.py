"""AES-256-GCM 加密工具。

L1/L2 字段使用 master_key；L3 敏感字段使用独立 l3_key。
nonce 随机生成并前置于密文。
"""

from __future__ import annotations

import logging
import os
import secrets
from typing import Optional

from .config import AES_KEY_SIZE, AES_NONCE_SIZE
from .exceptions import EncryptionError

logger = logging.getLogger(__name__)

# 延迟导入 cryptography；未安装时给出清晰报错
try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    _HAS_CRYPTO = True
except ImportError:
    _HAS_CRYPTO = False
    logger.warning("cryptography 库未安装，加密功能不可用。请 pip install cryptography")


def _check_crypto():
    if not _HAS_CRYPTO:
        raise EncryptionError(
            "cryptography 库未安装。请执行: pip install cryptography>=41.0.0"
        )


def derive_key(env_value: str) -> bytes:
    """从环境变量原始值派生 AES-256 密钥。"""
    _check_crypto()
    if len(env_value) == AES_KEY_SIZE:
        return env_value.encode("utf-8") if isinstance(env_value, str) else env_value
    # 非 32 字节时使用 SHA-256 派生
    import hashlib

    return hashlib.sha256(env_value.encode("utf-8")).digest()


def encrypt(plaintext: str, key: bytes) -> bytes:
    """AES-256-GCM 加密。返回 nonce + ciphertext + tag。"""
    _check_crypto()
    if len(key) != AES_KEY_SIZE:
        raise EncryptionError(f"密钥长度错误: 期望 {AES_KEY_SIZE}, 实际 {len(key)}")

    nonce = secrets.token_bytes(AES_NONCE_SIZE)
    aesgcm = AESGCM(key)
    ct = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return nonce + ct


def decrypt(ciphertext: bytes, key: bytes) -> str:
    """AES-256-GCM 解密。"""
    _check_crypto()
    if len(key) != AES_KEY_SIZE:
        raise EncryptionError(f"密钥长度错误: 期望 {AES_KEY_SIZE}, 实际 {len(key)}")
    if len(ciphertext) < AES_NONCE_SIZE + 16:
        raise EncryptionError("密文长度不足")

    nonce = ciphertext[:AES_NONCE_SIZE]
    ct = ciphertext[AES_NONCE_SIZE:]
    aesgcm = AESGCM(key)
    try:
        pt = aesgcm.decrypt(nonce, ct, None)
        return pt.decode("utf-8")
    except Exception as e:
        raise EncryptionError(f"解密失败: {e}") from e


def generate_key() -> bytes:
    """生成新的 AES-256 密钥。使用 secrets 模块（CSPRNG）。"""
    _check_crypto()
    return secrets.token_bytes(AES_KEY_SIZE)

def generate_nonce() -> bytes:
    """生成新的 AES-GCM nonce。"""
    return secrets.token_bytes(AES_NONCE_SIZE)

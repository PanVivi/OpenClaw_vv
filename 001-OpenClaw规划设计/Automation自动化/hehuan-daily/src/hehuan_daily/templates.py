"""个人模板管理：JSON Schema 校验 + AES-256-GCM 加密存储。

L1/L2 字段明文存储；L3 敏感字段使用独立 l3_key 加密。
L3 fail-closed: 无密钥时拒绝存储敏感字段，绝不写明文。
文件写入使用原子操作 (tempfile + rename)，权限收紧到 0o600。
"""

from __future__ import annotations

import base64
import json
import logging
import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Optional

from .config import Config, default_config
from .crypto import decrypt, encrypt
from .exceptions import EncryptionError, TemplateError
from .models import PersonalTemplate
from .schemas import validate_template
from .state_store import _fsync_directory

logger = logging.getLogger(__name__)


class TemplateManager:
    """个人模板管理器。"""

    def __init__(self, config: Optional[Config] = None):
        self.config = config or default_config
        self._ensure_dir()

    # ── CRUD ─────────────────────────────────────────────────
    def create(self, data: dict) -> PersonalTemplate:
        """创建并持久化模板。
        
        返回的模型对象含明文 L3 字段（调用者刚创建，无需解密）。
        磁盘加密由 _save() 统一执行，避免双重加密。
        """
        errors = validate_template(data)
        if errors:
            raise TemplateError(f"模板校验失败: {'; '.join(errors)}")

        now = datetime.utcnow().isoformat()
        data.setdefault("created_at", now)
        data.setdefault("updated_at", now)

        # 注意：不在加密前构建模型；_save() 负责加密
        template = self._dict_to_model(data)
        self._save(template)
        return template

    def get(self, template_id: str) -> Optional[PersonalTemplate]:
        """读取模板并解密 L3 字段。"""
        path = self._path_for(template_id)
        if not os.path.exists(path):
            return None
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self._decrypt_l3_fields(data)
            return self._dict_to_model(data)
        except json.JSONDecodeError as e:
            raise TemplateError(f"模板文件损坏: {e}") from e

    def update(self, template_id: str, updates: dict) -> PersonalTemplate:
        """更新模板。
        
        返回的模型对象含明文 L3 字段。磁盘加密由 _save() 统一执行。
        """
        existing = self.get(template_id)
        if not existing:
            raise TemplateError(f"模板不存在: {template_id}")

        data = self._model_to_dict(existing)
        data.update(updates)
        data["updated_at"] = datetime.utcnow().isoformat()

        errors = validate_template(data)
        if errors:
            raise TemplateError(f"模板校验失败: {'; '.join(errors)}")

        # 注意：不在加密前构建模型；_save() 负责加密
        template = self._dict_to_model(data)
        self._save(template)
        return template

    def delete(self, template_id: str) -> bool:
        """删除模板。"""
        path = self._path_for(template_id)
        if os.path.exists(path):
            os.remove(path)
            return True
        return False

    def list_ids(self) -> list[str]:
        """列出所有模板 ID。"""
        if not os.path.exists(self.config.template_dir):
            return []
        return [
            f.replace(".json", "")
            for f in os.listdir(self.config.template_dir)
            if f.endswith(".json")
        ]

    # ── 加密处理 ─────────────────────────────────────────────
    def _encrypt_l3_fields(self, data: dict) -> None:
        """加密 L3 字段（原地修改）。
        
        Fail-closed: 无 L3 密钥时，若存在明文 L3 数据则拒绝存储。
        绝不将明文 L3 数据写入文件。
        """
        l3_keys = [
            "legal_name_encrypted",
            "id_number_encrypted",
            "phone_encrypted",
            "notes_encrypted",
        ]
        key = self.config.l3_key

        # 检查是否有待加密的 L3 明文数据
        has_l3_plaintext = any(
            data.get(k) is not None for k in l3_keys
        )

        if key is None:
            # Fail-closed: 无密钥且存在 L3 明文 → 拒绝
            if has_l3_plaintext:
                raise TemplateError(
                    "无 L3 密钥 (config.l3_key=None)，无法安全存储 L3 敏感字段。 "
                    "请设置 HEHUAN_L3_KEY 环境变量或移除 L3 字段后再试。"
                )
            return

        for field in l3_keys:
            plaintext = data.get(field)
            if plaintext is not None and isinstance(plaintext, str):
                ct = encrypt(plaintext, key)
                data[field] = base64.b64encode(ct).decode("ascii")

    def _decrypt_l3_fields(self, data: dict) -> None:
        """解密 L3 字段（原地修改）。"""
        l3_keys = [
            "legal_name_encrypted",
            "id_number_encrypted",
            "phone_encrypted",
            "notes_encrypted",
        ]
        key = self.config.l3_key
        if key is None:
            return

        for field in l3_keys:
            blob = data.get(field)
            if blob is not None and isinstance(blob, str):
                try:
                    ct = base64.b64decode(blob)
                    data[field] = decrypt(ct, key)
                except Exception as e:
                    logger.warning("解密 %s 失败: %s", field, e)
                    data[field] = None

    # ── 持久化 ───────────────────────────────────────────────
    def _save(self, template: PersonalTemplate) -> None:
        """原子写入模板文件。
        
        使用 tempfile + os.rename 保证原子性，
        写入后收紧文件权限到 0o600 (owner read/write only)。
        """
        path = self._path_for(template.template_id)
        data = self._model_to_dict(template)
        # 存储时确保 L3 已加密
        self._encrypt_l3_fields(data)

        # 原子写入：先写临时文件，再 rename
        dir_name = os.path.dirname(path)
        try:
            fd, tmp_path = tempfile.mkstemp(
                dir=dir_name, suffix=".tmp", prefix=".template-"
            )
            try:
                with os.fdopen(fd, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                os.chmod(tmp_path, 0o600)
                os.replace(tmp_path, path)
                _fsync_directory(Path(dir_name))
            except BaseException:
                # 写入失败，清理临时文件
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass
                raise
        except OSError as e:
            raise TemplateError(f"写入模板文件失败: {e}") from e

    def _path_for(self, template_id: str) -> str:
        # 防路径穿越
        safe_id = os.path.basename(template_id)
        if safe_id != template_id or not template_id:
            raise TemplateError(f"非法模板 ID: {template_id}")
        return os.path.join(self.config.template_dir, f"{template_id}.json")

    def _ensure_dir(self) -> None:
        os.makedirs(self.config.template_dir, exist_ok=True)

    # ── 模型转换 ─────────────────────────────────────────────
    def _dict_to_model(self, data: dict) -> PersonalTemplate:
        return PersonalTemplate(
            template_id=data["template_id"],
            name=data["name"],
            created_at=datetime.fromisoformat(data.get("created_at", datetime.utcnow().isoformat())),
            updated_at=datetime.fromisoformat(data.get("updated_at", datetime.utcnow().isoformat())),
            greeting_style=data.get("greeting_style"),
            language=data.get("language", "zh-CN"),
            timezone=data.get("timezone", "Asia/Shanghai"),
            location_name=data.get("location_name"),
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            birth_date=data.get("birth_date"),
            birth_time=data.get("birth_time"),
            legal_name_encrypted=data.get("legal_name_encrypted"),
            id_number_encrypted=data.get("id_number_encrypted"),
            phone_encrypted=data.get("phone_encrypted"),
            notes_encrypted=data.get("notes_encrypted"),
            custom_sections=data.get("custom_sections", {}),
        )

    def _model_to_dict(self, t: PersonalTemplate) -> dict:
        return {
            "template_id": t.template_id,
            "name": t.name,
            "created_at": t.created_at.isoformat(),
            "updated_at": t.updated_at.isoformat(),
            "greeting_style": t.greeting_style,
            "language": t.language,
            "timezone": t.timezone,
            "location_name": t.location_name,
            "latitude": t.latitude,
            "longitude": t.longitude,
            "birth_date": t.birth_date,
            "birth_time": t.birth_time,
            "legal_name_encrypted": t.legal_name_encrypted,
            "id_number_encrypted": t.id_number_encrypted,
            "phone_encrypted": t.phone_encrypted,
            "notes_encrypted": t.notes_encrypted,
            "custom_sections": t.custom_sections,
        }

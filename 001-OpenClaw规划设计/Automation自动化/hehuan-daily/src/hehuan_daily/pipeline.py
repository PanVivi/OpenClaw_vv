"""流水线编排：校验模块顺序、执行 resolve→collect→render、预算检查。"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any, Optional, Sequence

from .composer import ComposedBrief, PresentationContext, compose
from .config import Config, default_config
from .models import (
    DataSourceResult,
    PersonalTemplate,
    TravelOverride,
)
from .modules.base import ModuleContext, ModuleResult, degraded_result
from .modules.registry import (
    ModuleId,
    DEFAULT_MODULE_ORDER,
    get_module,
    validate_module_order,
)

logger = logging.getLogger(__name__)


@dataclass
class PipelineContext:
    """流水线上下文：包含所有数据源结果和配置。"""

    target_date: date
    config: Config = field(default_factory=lambda: default_config)

    # 数据源结果
    weather_result: Optional[DataSourceResult] = None
    aqi_result: Optional[DataSourceResult] = None
    lunar_result: Optional[DataSourceResult] = None
    template: Optional[PersonalTemplate] = None
    active_override: Optional[TravelOverride] = None

    # 运行时元数据
    generated_at: datetime = field(default_factory=datetime.utcnow)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_module_context(self) -> ModuleContext:
        """转换为模块上下文。"""
        return ModuleContext(
            target_date=self.target_date,
            config=self.config,
            weather_result=self.weather_result,
            aqi_result=self.aqi_result,
            lunar_result=self.lunar_result,
            template=self.template,
            active_override=self.active_override,
            fetched_at=self.generated_at,
            metadata=self.metadata,
        )


@dataclass
class PipelineResult:
    """流水线执行结果。"""

    composed: ComposedBrief
    module_results: list[ModuleResult] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    is_success: bool = True

    @property
    def should_send(self) -> bool:
        """是否应发送：成功且未超过硬极限。"""
        return self.is_success and self.composed.char_count <= 4096


class Pipeline:
    """晨间玉简流水线。

    职责：
    1. 校验模块顺序（7 模块、不重复、全部已注册）
    2. 按顺序执行各模块的 resolve→collect→render
    3. 将模块结果交给 composer 排版
    4. 返回最终结果（不执行发送）
    """

    def __init__(
        self,
        module_order: Optional[Sequence[ModuleId]] = None,
        config: Optional[Config] = None,
    ):
        self.module_order = list(module_order) if module_order else DEFAULT_MODULE_ORDER
        self.config = config or default_config

    def validate(self) -> list[str]:
        """校验流水线配置。返回错误列表（空表示通过）。"""
        return validate_module_order(self.module_order)

    def execute(self, ctx: PipelineContext) -> PipelineResult:
        """执行完整流水线。"""
        # 1. 校验
        errors = self.validate()
        structural_errors = [
            error for error in errors if not error.startswith("未注册的模块:")
        ]
        if structural_errors:
            return PipelineResult(
                composed=ComposedBrief(
                    text="",
                    char_count=0,
                    was_compressed=False,
                    warnings=structural_errors,
                ),
                errors=structural_errors,
                is_success=False,
            )

        # 2. 执行各模块
        module_ctx = ctx.to_module_context()
        module_results: list[ModuleResult] = []
        exec_errors: list[str] = list(errors)

        for module_id in self.module_order:
            module_key = (
                module_id.value if isinstance(module_id, ModuleId) else str(module_id)
            )
            module = get_module(module_id)
            if module is None:
                message = f"模块 {module_key} 未注册"
                if message not in exec_errors:
                    exec_errors.append(message)
                module_results.append(
                    degraded_result(module_key, "  模块未注册（已降级）")
                )
                continue
            try:
                result = module.execute(module_ctx)
                if result is not None:
                    module_results.append(_decorate_with_owner_inputs(result, module_ctx))
                else:
                    module_results.append(
                        degraded_result(module_key, "  未生成输出（已降级）")
                    )
            except Exception as e:
                logger.warning("模块 %s 执行失败: %s", module_id, e)
                exec_errors.append(f"模块 {module_key}: {e}")
                module_results.append(
                    degraded_result(module_key, "  执行失败（已降级）")
                )

        # 3. 排版
        composed = compose(
            module_results,
            presentation=PresentationContext(
                target_date=ctx.target_date,
                lunar=ctx.lunar_result.data if ctx.lunar_result else None,
                weather=ctx.weather_result.data if ctx.weather_result else None,
                preferences=(
                    ctx.template.custom_sections.get("preferences", {})
                    if ctx.template else {}
                ),
                header_notes=(
                    ctx.template.custom_sections.get("module_notes", {}).get("header", [])
                    if ctx.template else []
                ),
            ),
        )

        # 4. 合并错误
        all_errors = exec_errors + composed.warnings

        return PipelineResult(
            composed=composed,
            module_results=module_results,
            errors=all_errors,
            is_success=composed.char_count <= 4096,
        )


def run_pipeline(
    target_date: date,
    weather_result: Optional[DataSourceResult] = None,
    aqi_result: Optional[DataSourceResult] = None,
    lunar_result: Optional[DataSourceResult] = None,
    template: Optional[PersonalTemplate] = None,
    active_override: Optional[TravelOverride] = None,
    module_order: Optional[Sequence[ModuleId]] = None,
) -> PipelineResult:
    """便捷函数：执行流水线并返回结果。"""
    ctx = PipelineContext(
        target_date=target_date,
        weather_result=weather_result,
        aqi_result=aqi_result,
        lunar_result=lunar_result,
        template=template,
        active_override=active_override,
    )
    pipeline = Pipeline(module_order=module_order)
    return pipeline.execute(ctx)


def _decorate_with_owner_inputs(result: ModuleResult, ctx: ModuleContext) -> ModuleResult:
    """把已校验的模块补记与少量偏好插入对应框饰，不覆盖自动事实。"""
    if ctx.template is None:
        return result
    custom = ctx.template.custom_sections
    notes = custom.get("module_notes", {}).get(result.module_id, [])
    preferences = custom.get("preferences", {}).get(result.module_id, {})
    additions: list[str] = []
    for note in notes[:3] if isinstance(notes, list) else []:
        if isinstance(note, str) and note.strip():
            additions.append(f"│ 📝 少主补记：{note.strip()}")
    if isinstance(preferences, dict):
        labels = {
            "focus": "关注",
            "sensitive_group": "体感关注",
            "outdoor_activity": "户外安排",
            "heat_sensitive": "体感",
            "cold_sensitive": "体感",
            "commute_mode": "通勤",
            "avoid": "避用",
            "carry": "随身",
            "show_activity": "门人近况",
            "tone": "签语风格",
        }
        for key, label in labels.items():
            if key not in preferences:
                continue
            value = preferences[key]
            if key == "heat_sensitive" and value is True:
                value = "较怕热"
            elif key == "cold_sensitive" and value is True:
                value = "较怕冷"
            elif isinstance(value, bool):
                value = "开启" if value else "关闭"
            additions.append(f"│ 🎐 {label}：{value}")
    if not additions:
        return result
    lines = result.text.splitlines()
    insert_at = max(len(lines) - 1, 0)
    decorated = [*lines[:insert_at]]
    if decorated and decorated[-1] != "│":
        decorated.append("│")
    decorated.extend(additions)
    decorated.extend(lines[insert_at:])
    return ModuleResult(
        module_id=result.module_id,
        text="\n".join(decorated),
        is_degraded=result.is_degraded,
        is_placeholder=result.is_placeholder,
        notes=list(result.notes),
    )

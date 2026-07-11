from __future__ import annotations

import json
import logging
from abc import ABC, abstractmethod
from typing import Any, TypeVar

import google.generativeai as genai
from pydantic import BaseModel

from app.config import get_settings

logger = logging.getLogger(__name__)
T = TypeVar("T", bound=BaseModel)

_GEMINI_SCHEMA_SKIP = frozenset({"default", "default_factory", "title", "$schema"})


def _inline_json_schema_defs(schema: dict[str, Any]) -> dict[str, Any]:
    """Gemini response_schema rejects top-level $defs — inline referenced models."""
    import copy

    schema = copy.deepcopy(schema)
    defs = schema.pop("$defs", None) or schema.pop("definitions", None) or {}

    def resolve(node: Any) -> Any:
        if isinstance(node, dict):
            if "$ref" in node:
                name = node["$ref"].rsplit("/", 1)[-1]
                if name in defs:
                    return resolve(copy.deepcopy(defs[name]))
                return node
            return {key: resolve(value) for key, value in node.items()}
        if isinstance(node, list):
            return [resolve(item) for item in node]
        return node

    return resolve(schema)


def _gemini_response_schema(model: type[BaseModel]) -> dict[str, Any]:
    """Gemini response_schema rejects JSON Schema 'default' and '$defs' keys."""
    raw = model.model_json_schema()

    def clean(node: Any) -> Any:
        if isinstance(node, dict):
            out: dict[str, Any] = {}
            for key, value in node.items():
                if key in _GEMINI_SCHEMA_SKIP:
                    continue
                out[key] = clean(value)
            return out
        if isinstance(node, list):
            return [clean(item) for item in node]
        return node

    return _inline_json_schema_defs(clean(raw))


class LLMClient(ABC):
    @abstractmethod
    async def structured_json(
        self,
        system: str,
        user: str,
        schema: type[T],
    ) -> T:
        ...


class GeminiClient(LLMClient):
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.gemini_api_key:
            logger.warning("GEMINI_API_KEY not set — LLM calls will fail")
        genai.configure(api_key=settings.gemini_api_key)
        self._model_name = settings.gemini_model

    async def structured_json(
        self,
        system: str,
        user: str,
        schema: type[T],
    ) -> T:
        model = genai.GenerativeModel(
            self._model_name,
            system_instruction=system,
            generation_config={
                "response_mime_type": "application/json",
                "response_schema": _gemini_response_schema(schema),
            },
        )
        response = await model.generate_content_async(user)
        text = response.text or "{}"
        try:
            return schema.model_validate_json(text)
        except Exception:
            data = json.loads(text)
            return schema.model_validate(data)


def get_llm_client() -> LLMClient:
    settings = get_settings()
    if settings.llm_provider == "gemini":
        return GeminiClient()
    raise ValueError(f"Unsupported LLM provider: {settings.llm_provider}")

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
                "response_schema": schema,
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

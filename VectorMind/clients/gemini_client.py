"""
Gemini API client — drop-in replacement for OllamaClient.

Implements the same public interface as OllamaClient so the rest of the
codebase (routers, services, dependencies) requires zero changes:

    is_available()   → bool
    embed(text)      → np.ndarray | None
    generate(prompt) → str

Models used:
    Embeddings : text-embedding-004     (768-dimensional, free tier)
    Generation : gemini-1.5-flash       (free tier: 15 req/min, 1M tokens/day)

Configuration (environment variables):
    GEMINI_API_KEY   — required; get one at https://aistudio.google.com/apikey
    GEMINI_EMBED_MODEL — optional, default "text-embedding-004"
    GEMINI_GEN_MODEL   — optional, default "gemini-1.5-flash"

Requires: google-generativeai>=0.7
"""
from __future__ import annotations

import os
from typing import Optional

import numpy as np


class GeminiClient:
    """
    HTTP client for the Google Gemini REST API.

    Provides the same public interface as OllamaClient so all callers
    (document_service, rag_service, system router) work without changes.

    Attributes:
        embed_model (str): Embedding model name reported to callers.
        gen_model   (str): Generation model name reported to callers.
    """

    def __init__(
        self,
        api_key: str,
        embed_model: str = "text-embedding-004",
        gen_model: str = "gemini-1.5-flash",
    ) -> None:
        import google.generativeai as genai  # lazy import — optional dep

        self._api_key = api_key
        self.embed_model = embed_model
        self.gen_model = gen_model

        genai.configure(api_key=api_key)
        self._genai = genai
        self._model = genai.GenerativeModel(gen_model)

    # ── Public API (matches OllamaClient) ────────────────────────────────

    def is_available(self) -> bool:
        """
        Return True if the Gemini API key is configured and reachable.

        Makes a minimal listing call; treats any exception as unavailable.
        """
        try:
            # A lightweight call: list models (doesn't consume quota)
            list(self._genai.list_models())
            return True
        except Exception:
            return False

    def embed(self, text: str) -> Optional[np.ndarray]:
        """
        Return a float32 numpy embedding for *text* using text-embedding-004.

        Returns None on any error (network, quota, invalid key).
        """
        try:
            result = self._genai.embed_content(
                model=self.embed_model,
                content=text,
                task_type="retrieval_document",
            )
            values = result.get("embedding") if isinstance(result, dict) else getattr(result, "embedding", None)
            if values is None:
                return None
            return np.array(values, dtype=np.float32)
        except Exception:
            return None

    def generate(self, prompt: str) -> str:
        """
        Generate a response for *prompt* using gemini-1.5-flash.

        Returns an error string (not an exception) on failure, matching
        the OllamaClient contract.
        """
        _error = "ERROR: Gemini API unavailable. Check your GEMINI_API_KEY."
        try:
            response = self._model.generate_content(prompt)
            # response.text raises if blocked; handle gracefully
            text = response.text
            return text if text else _error
        except Exception:
            return _error

"""
Ollama HTTP client.

Faithful Python port of C++ class ``OllamaClient`` (main.cpp:561–638).

Timeouts match the C++ original exactly:
    Connection : 2 s  (isAvailable), 3 s  (embed / generate)
    Read       : 30 s (embed), 180 s (generate)

Deviation D6: ``embed`` returns ``None`` on failure instead of an empty
``std::vector<float>``; callers check ``emb is None`` rather than
``emb.empty()``.

Requires: ``httpx`` (pip install httpx)

Original project: https://github.com/perryvegehan/Your-OWN-AI  (MIT)
"""
from __future__ import annotations

from typing import Optional

import httpx
import numpy as np


class OllamaClient:
    """
    Synchronous HTTP client for the local Ollama REST API.

    Port of C++ ``class OllamaClient`` (main.cpp:561–638).

    Default values mirror the C++ source:
        host        = "127.0.0.1"        (main.cpp:604)
        port        = 11434              (main.cpp:604)
        embed_model = "nomic-embed-text" (main.cpp:601)
        gen_model   = "llama3.2"         (main.cpp:602)

    Public API:
        ``is_available()``     → bool
        ``embed(text)``        → np.ndarray | None
        ``generate(prompt)``   → str
    """

    def __init__(
        self,
        host: str = "127.0.0.1",
        port: int = 11434,
        embed_model: str = "nomic-embed-text",
        gen_model: str = "llama3.2",
    ) -> None:
        self.host = host
        self.port = port
        self.embed_model = embed_model
        self.gen_model = gen_model
        self._base_url = f"http://{host}:{port}"

    def is_available(self) -> bool:
        """
        Return True if Ollama responds on ``/api/tags`` within 2 s.

        Port of C++ ``OllamaClient::isAvailable`` (main.cpp:607–612).
        """
        try:
            with httpx.Client(timeout=2.0) as client:
                r = client.get(f"{self._base_url}/api/tags")
                return r.status_code == 200
        except Exception:
            return False

    def embed(self, text: str) -> Optional[np.ndarray]:
        """
        Call Ollama ``/api/embeddings`` and return a float32 numpy array.

        Port of C++ ``OllamaClient::embed`` (main.cpp:615–623).

        Returns:
            float32 ndarray of shape ``(dims,)``, or ``None`` on any error
            (network failure, non-200 status, or missing key in response).
        """
        try:
            with httpx.Client(
                timeout=httpx.Timeout(connect=3.0, read=30.0, write=10.0, pool=5.0)
            ) as client:
                r = client.post(
                    f"{self._base_url}/api/embeddings",
                    json={"model": self.embed_model, "prompt": text},
                )
                if r.status_code != 200:
                    return None
                data = r.json()
                emb = data.get("embedding")
                if not emb:
                    return None
                return np.array(emb, dtype=np.float32)
        except Exception:
            return None

    def generate(self, prompt: str) -> str:
        """
        Call Ollama ``/api/generate`` with ``stream:false``.

        Port of C++ ``OllamaClient::generate`` (main.cpp:626–637).

        Returns:
            The generated response string, or a fixed error message on
            failure (same string as C++: ``"ERROR: Ollama unavailable. Run: ollama serve"``).
        """
        _error = "ERROR: Ollama unavailable. Run: ollama serve"
        try:
            with httpx.Client(
                timeout=httpx.Timeout(connect=3.0, read=180.0, write=10.0, pool=5.0)
            ) as client:
                r = client.post(
                    f"{self._base_url}/api/generate",
                    json={
                        "model": self.gen_model,
                        "prompt": prompt,
                        "stream": False,
                    },
                )
                if r.status_code != 200:
                    return _error
                data = r.json()
                return data.get("response", "")
        except Exception:
            return _error

"""
Text chunker — sliding word-count window with overlap.

Faithful Python port of C++ function ``chunkText`` (main.cpp:531–552).

Original project: https://github.com/perryvegehan/Your-OWN-AI  (MIT)
"""
from __future__ import annotations


def chunk_text(
    text: str,
    chunk_words: int = 250,
    overlap_words: int = 30,
) -> list[str]:
    """
    Split ``text`` into overlapping word-count chunks.

    Port of C++ ``chunkText`` (main.cpp:531–552).

    Algorithm (identical to C++):
      1. Split ``text`` on whitespace into a word list.
      2. If the word list is empty, return ``[]``.
      3. If ``len(words) <= chunk_words``, return ``[text]`` unchanged
         (single-chunk fast-path — same as C++ main.cpp:540).
      4. Otherwise slide a window of ``chunk_words`` words, stepping by
         ``chunk_words - overlap_words`` each iteration; stop when the
         window reaches the end.

    Args:
        text:          Input text.
        chunk_words:   Maximum words per chunk (default 250).
        overlap_words: Words of overlap between consecutive chunks (default 30).

    Returns:
        List of chunk strings.  May be empty for blank input.

    Note:
        The C++ implementation splits only on whitespace (``ss >> w``);
        this port uses ``str.split()`` which has identical semantics.
    """
    words = text.split()

    if not words:
        return []

    if len(words) <= chunk_words:
        return [text]      # single-chunk fast-path (main.cpp:540)

    chunks: list[str] = []
    step = chunk_words - overlap_words
    i = 0
    while i < len(words):
        end = min(i + chunk_words, len(words))
        chunks.append(" ".join(words[i:end]))
        if end == len(words):
            break
        i += step

    return chunks

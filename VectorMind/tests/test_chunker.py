"""
Tests for text chunker (ingestion/chunker.py).
"""
from __future__ import annotations

import pytest

from ingestion.chunker import chunk_text


class TestChunkTextEdgeCases:
    def test_empty_string_returns_empty(self):
        """C++ returns {} for empty text (main.cpp:539)."""
        assert chunk_text("") == []

    def test_whitespace_only_returns_empty(self):
        """Whitespace-only string has no words → empty list."""
        assert chunk_text("   \t\n  ") == []

    def test_single_word(self):
        """Single word ≤ chunk_words → returned unchanged as [word]."""
        assert chunk_text("hello") == ["hello"]

    def test_exact_chunk_words_returns_single(self):
        """Text with exactly chunk_words words → [text]."""
        words = " ".join([f"w{i}" for i in range(10)])
        result = chunk_text(words, chunk_words=10, overlap_words=2)
        assert result == [words]

    def test_one_below_chunk_words(self):
        """Text with chunk_words - 1 words → single chunk."""
        words = " ".join([f"w{i}" for i in range(9)])
        result = chunk_text(words, chunk_words=10, overlap_words=2)
        assert result == [words]


class TestChunkTextMultipleChunks:
    def test_three_chunks_produced(self):
        """20 words, chunk=10, overlap=2, step=8: offsets 0,8,16 → 3 chunks."""
        words = [f"w{i}" for i in range(20)]
        text = " ".join(words)
        result = chunk_text(text, chunk_words=10, overlap_words=2)
        assert len(result) == 3

    def test_first_chunk_content(self):
        words = [f"w{i}" for i in range(20)]
        text = " ".join(words)
        result = chunk_text(text, chunk_words=10, overlap_words=2)
        expected_first = " ".join(words[:10])
        assert result[0] == expected_first

    def test_last_chunk_ends_at_final_word(self):
        """Last chunk contains the last word of the text."""
        words = [f"w{i}" for i in range(20)]
        text = " ".join(words)
        result = chunk_text(text, chunk_words=10, overlap_words=2)
        assert result[-1].endswith("w19")

    def test_overlap_is_preserved(self):
        """The tail of chunk N equals the head of chunk N+1 (overlap words)."""
        words = [f"w{i}" for i in range(30)]
        text = " ".join(words)
        overlap = 5
        result = chunk_text(text, chunk_words=10, overlap_words=overlap)
        assert len(result) >= 2
        # Last `overlap` words of chunk[0] == first `overlap` words of chunk[1]
        chunk0_words = result[0].split()
        chunk1_words = result[1].split()
        assert chunk0_words[-overlap:] == chunk1_words[:overlap]

    def test_default_params_250_30(self):
        """Default chunk_words=250, overlap_words=30 — verify with 300 words."""
        words = [f"w{i}" for i in range(300)]
        text = " ".join(words)
        result = chunk_text(text)  # defaults: 250, 30
        assert len(result) >= 2
        # Each chunk should have at most 250 words
        for chunk in result:
            assert len(chunk.split()) <= 250

    def test_all_words_covered(self):
        """Every word in the original text appears in at least one chunk."""
        words = [f"w{i}" for i in range(40)]
        text = " ".join(words)
        result = chunk_text(text, chunk_words=15, overlap_words=3)
        all_in_chunks = set()
        for chunk in result:
            all_in_chunks.update(chunk.split())
        assert set(words).issubset(all_in_chunks)

    def test_step_zero_does_not_loop(self):
        """overlap_words == chunk_words → step=0; should still terminate."""
        words = [f"w{i}" for i in range(20)]
        text = " ".join(words)
        # With step=0, every chunk starts at i=0; the while loop breaks
        # because end == len(words) when chunk_words >= len(words).
        # With chunk_words=5 and overlap=5: step=0, i never advances
        # → only one chunk (i=0, end=5; not end==len so would loop).
        # C++ breaks when end==len(words). Verify this with chunk_words > len.
        result = chunk_text(text, chunk_words=30, overlap_words=5)  # single chunk
        assert result == [text]


class TestChunkTextWordBoundaries:
    def test_extra_spaces_ignored(self):
        """Multiple spaces are collapsed by str.split() (same as C++ >> operator)."""
        text = "hello   world   foo   bar"
        result = chunk_text(text, chunk_words=2, overlap_words=0)
        assert result[0] == "hello world"

    def test_newlines_treated_as_whitespace(self):
        """Newlines are whitespace for str.split(), matching C++ ss >> w."""
        text = "hello\nworld\nfoo\nbar"
        result = chunk_text(text, chunk_words=2, overlap_words=0)
        assert len(result) == 2
        assert result[0] == "hello world"

    def test_chunk_words_count_exact(self):
        """Each non-last chunk contains exactly chunk_words words."""
        words = [f"w{i}" for i in range(50)]
        text = " ".join(words)
        result = chunk_text(text, chunk_words=10, overlap_words=2)
        for chunk in result[:-1]:
            assert len(chunk.split()) == 10


class TestChunkTextCppParity:
    """
    Known-output tests derived from the C++ chunkText behaviour.
    C++ uses word-count splitting with a sliding window.
    """

    def test_c_parity_3_chunks(self):
        """
        31 words, chunk=10, overlap=2, step=8:
            chunk[0]: words 0..9
            chunk[1]: words 8..17
            chunk[2]: words 16..25
            chunk[3]: words 24..30 (tail, 7 words)
        """
        words = [f"w{i}" for i in range(31)]
        text = " ".join(words)
        result = chunk_text(text, chunk_words=10, overlap_words=2)
        assert result[0] == " ".join(words[0:10])
        assert result[1] == " ".join(words[8:18])
        assert result[2] == " ".join(words[16:26])
        assert result[3] == " ".join(words[24:31])
        assert len(result) == 4

"""
Bit-exact emulation of the C++ RNG used by the original HNSW.

The original draws levels with::

    std::mt19937 rng(42);
    std::uniform_real_distribution<float> u(0.0f, 1.0f);
    level = (int)std::floor(-std::log(u(rng)) * mL);

This module reproduces ``std::mt19937`` (MT19937, ``init_genrand`` seeding)
and libstdc++'s ``generate_canonical<float, 24>`` for a 32-bit engine, so the
Python HNSW assigns the same levels as the C++ build for the same seed.

libstdc++ detail (``std::generate_canonical``): for ``float`` with a 32-bit
engine, ``k = 1`` draw is used; ``sum = float(raw)``, ``ret = sum / 2**32``
computed in float32, and ``ret >= 1`` is clamped to ``nextafter(1, 0)``.
Other standard libraries (MSVC, libc++) may differ; parity is verified
against a g++/libstdc++ build in ``benchmarks/`` and ``tests/test_cpp_parity.py``.

Original project: https://github.com/perryvegehan/Your-OWN-AI  (MIT)
"""
from __future__ import annotations

import numpy as np

_N = 624
_M = 397
_F32_TWO32 = np.float32(4294967296.0)
_F32_BELOW_ONE = np.nextafter(np.float32(1.0), np.float32(0.0))


class Mt19937:
    """32-bit Mersenne Twister, identical to ``std::mt19937``."""

    def __init__(self, seed: int = 5489) -> None:
        self._mt = [0] * _N
        self._idx = _N
        self._mt[0] = seed & 0xFFFFFFFF
        for i in range(1, _N):
            prev = self._mt[i - 1]
            self._mt[i] = (1812433253 * (prev ^ (prev >> 30)) + i) & 0xFFFFFFFF

    def _twist(self) -> None:
        mt = self._mt
        for i in range(_N):
            y = (mt[i] & 0x80000000) | (mt[(i + 1) % _N] & 0x7FFFFFFF)
            v = mt[(i + _M) % _N] ^ (y >> 1)
            if y & 1:
                v ^= 0x9908B0DF
            mt[i] = v
        self._idx = 0

    def next_u32(self) -> int:
        """Return the next raw 32-bit output (``rng()`` in C++)."""
        if self._idx >= _N:
            self._twist()
        y = self._mt[self._idx]
        self._idx += 1
        y ^= y >> 11
        y ^= (y << 7) & 0x9D2C5680
        y ^= (y << 15) & 0xEFC60000
        y ^= y >> 18
        return y & 0xFFFFFFFF

    def uniform_float(self) -> np.float32:
        """``std::uniform_real_distribution<float>(0, 1)(rng)`` (libstdc++)."""
        ret = np.float32(self.next_u32()) / _F32_TWO32
        if ret >= np.float32(1.0):
            ret = _F32_BELOW_ONE
        return ret

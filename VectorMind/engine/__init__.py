"""
VectorMind engine — faithful Python port of the C++ vector database.

Original project: https://github.com/perryvegehan/Your-OWN-AI  (MIT)
Port author     : VectorMind contributors
"""

from .brute_force import BruteForce
from .document_db import DocumentDB
from .hnsw import HNSW, GraphInfo
from .kdtree import KDTree
from .metrics import DistFn, cosine, euclidean, get_dist_fn, manhattan
from .models import DocItem, VectorItem
from .vector_db import BenchOut, SearchHit, SearchOut, VectorDB

__all__ = [
    "BruteForce",
    "DocumentDB",
    "HNSW",
    "GraphInfo",
    "KDTree",
    "DistFn",
    "cosine",
    "euclidean",
    "get_dist_fn",
    "manhattan",
    "DocItem",
    "VectorItem",
    "BenchOut",
    "SearchHit",
    "SearchOut",
    "VectorDB",
]

"""
AGENT-K Council: Multi-LLM Consensus System

Three-stage consensus process with GPT, Gemini, and Claude.
Inspired by Karpathy's llm-council.

Modes:
- Council Mode: Multi-LLM via LiteLLM (requires API keys)
- Solo Mode: Multi-Claude CLI instances (no API keys needed)
"""

__version__ = "2.3.5"
__author__ = "Aditya Katiyar"

from .llm import LLMClient, MODELS
from .council import Council, run_council
from .scout import Scout
from .tools import scan_directory, get_file_tree

__all__ = [
    "LLMClient",
    "MODELS",
    "Council",
    "run_council",
    "Scout",
    "scan_directory",
    "get_file_tree",
]

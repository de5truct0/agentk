# AGENT-K Python Backend

**Multi-LLM Council Backend for AGENT-K**

```
╭──────────────────────────────────────────────── AGENT-K v2.3.7 ────────────────────────────────────────────────╮
│                            Multi-LLM Council - GPT + Gemini + Claude                                           │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
```

The Python backend provides **multi-LLM consensus** and **Smart Context Selection** for AGENT-K.

## Features

- **Council Mode** - Three-stage consensus with GPT-4, Gemini, and Claude
- **Smart Context Selection** - RLM-inspired file selection using LLM reasoning
- **Scout Agent** - Intelligent codebase research with query-aware file selection
- **LiteLLM Integration** - Unified API for multiple LLM providers

## Installation

```bash
pip install agentk8
```

## Requirements

- Python 3.10+
- API Keys (set as environment variables):
  - `OPENAI_API_KEY` - For GPT-4
  - `GEMINI_API_KEY` - For Gemini
  - `ANTHROPIC_API_KEY` - For Claude

## Quick Start

### Scout Agent (Smart Context Selection)

```python
from agentk.scout import Scout
import asyncio

async def main():
    scout = Scout(project_root="/path/to/project")

    # Query-aware file selection
    context = await scout.scan_project("Where is authentication handled?")
    print(context["files"])  # Returns only relevant files

    # Full investigation with web search
    report = await scout.investigate("Latest JWT best practices")
    print(report.to_context_string())

asyncio.run(main())
```

### Council Mode (Multi-LLM Consensus)

```python
from agentk.council import Council
import asyncio

async def main():
    council = Council()

    # Three-stage consensus
    result = await council.deliberate(
        "Design a rate limiting system for our API",
        mode="council"  # or "solo" for multi-Claude personas
    )
    print(result["final_synthesis"])

asyncio.run(main())
```

## Council Architecture

```
                    ┌─────────────────────────────────────┐
                    │           Stage 1: Analysis          │
                    │  GPT-4 | Gemini | Claude (parallel)  │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────▼───────────────────┐
                    │         Stage 2: Cross-Review        │
                    │   Each model reviews others' work    │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────▼───────────────────┐
                    │       Stage 3: Chairman Synthesis    │
                    │     Claude synthesizes consensus     │
                    └─────────────────────────────────────┘
```

## Smart Context Selection (RLM-Inspired)

Instead of blindly grabbing files, the Scout asks the LLM to select relevant files:

```python
# Traditional approach (naive):
files = get_top_10_files()  # Often irrelevant

# Smart Context Selection:
scout = Scout(project_root=".")
context = await scout.scan_project("How does the auth middleware work?")
# LLM analyzes file tree + query → selects only auth-related files
```

This is inspired by the **Recursive Language Models** paper, which treats the codebase as an environment to navigate intelligently.

## CLI Usage

```bash
# Run Scout investigation
python -m agentk.scout "Where are the API endpoints defined?"

# Run Council deliberation
python -m agentk.council "Design a caching strategy" --mode council
```

## Module Structure

```
agentk/
├── __init__.py
├── council.py      # Multi-LLM consensus logic
├── scout.py        # Smart Context Selection
├── llm.py          # LiteLLM wrapper for unified API
└── tools.py        # File tree, directory scanning
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4 |
| `GEMINI_API_KEY` | Google API key for Gemini |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |

## License

MIT License

---

<p align="center">
<strong>AGENT-K v2.3.7</strong> - Python Backend
</p>

<p align="center">
<a href="https://github.com/de5truct0/agentk">GitHub</a> •
<a href="https://pypi.org/project/agentk8/">PyPI</a>
</p>

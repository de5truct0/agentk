# AGENT-K

**Multi-LLM Council Terminal Suite**

```
╭──────────────────────────────────────────────── AGENT-K v2.3.7 ────────────────────────────────────────────────╮
│      ___________________        ____....-----....____             Welcome to AGENT-K                           │
│     (________________LL_)   ==============================                                                     │
│         ______\   \_______.--'.  `---..._____...---'              Pack Intelligence System                     │
│         `-------..__            ` ,/                                                                           │
│                     `-._ -  -  - |                                                                              │
│                         `-------'                                                                              │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
```

A sophisticated terminal UI for orchestrating AI agents with **multi-LLM consensus**. Built with React + Ink, featuring Council mode for GPT + Gemini + Claude collaboration.

## Features

- **Council Mode** - Multi-LLM consensus with GPT, Gemini, and Claude working together
- **Three Execution Modes** - Normal (confirm edits), Plan (approval first), Auto (no confirmations)
- **Smart Context Selection** - RLM-inspired file selection using LLM reasoning
- **Scout Agent** - Real-time research with intelligent codebase navigation
- **Beautiful UI** - Dark teal/purple theme with live token tracking
- **Command History** - Use ↑/↓ arrows to browse past messages

## Installation

### npm (Recommended)
```bash
npm install -g agentk8
```

### Homebrew (macOS/Linux)
```bash
brew tap de5truct0/agentk
brew install agentk8
```

### pip (Python backend)
```bash
pip install agentk8
```

### From Source
```bash
git clone https://github.com/de5truct0/agentk.git
cd agentk
npm install && npm run build && npm link
```

## Requirements

- **Node.js** 18+
- **Claude Code CLI** - [Install from claude.ai/code](https://claude.ai/code)
- **Python 3.10+** - For Council mode (optional)
- **API Keys** - For multi-LLM: `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`

## Quick Start

```bash
# Start interactive session (Development mode)
agentk8

# Start ML Research mode
agentk8 --mode ml

# Show help
agentk8 --help
```

## Execution Modes

| Mode | Command | Behavior |
|------|---------|----------|
| **Normal** | `/normal` | Execute tasks, confirm before edits |
| **Plan** | `/plan` | Create plan for approval before executing |
| **Auto** | `/auto` | No confirmations, execute everything directly |

Use `Shift+Tab` to cycle between modes, or type the command.

## Council Mode

Council mode enables **multi-LLM consensus** using three stages:

```
Stage 1: Initial Analysis
  → GPT-4, Gemini, Claude analyze independently

Stage 2: Cross-Review
  → Each model reviews others' analyses

Stage 3: Chairman Synthesis
  → Claude synthesizes final consensus
```

Toggle with `/council` command. Requires API keys for all three providers.

## Commands

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/clear` | Clear chat history |
| `/status` | Show session status |
| `/normal` | Normal mode (confirm edits) |
| `/plan` | Plan mode (approval first) |
| `/auto` | Auto mode (no confirmations) |
| `/council` | Toggle Council mode |
| `/models` | Show available LLM models |
| `/exit` | Exit AGENT-K |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Shift+Tab` | Cycle execution mode |
| `↑` / `↓` | Browse command history |
| `Esc Esc` | Exit (double-tap) |
| `Ctrl+U` | Clear input line |
| `Ctrl+A` | Jump to start of line |
| `Ctrl+E` | Jump to end of line |

## Agent Teams

### Development Mode (Default)

| Agent | Role |
|-------|------|
| **Orchestrator** | Task decomposition, coordination |
| **Engineer** | Code implementation, debugging |
| **Tester** | Unit/integration tests, coverage |
| **Security** | OWASP review, vulnerability detection |

### ML Mode (`--mode ml`)

| Agent | Role |
|-------|------|
| **Orchestrator** | ML project lifecycle coordination |
| **Researcher** | Literature review, SOTA analysis |
| **ML Engineer** | Model implementation, training |
| **Evaluator** | Metrics, benchmarking, experiments |

## Smart Context Selection

The Scout agent uses **RLM-inspired** (Recursive Language Models) context selection:

1. Scans project file tree
2. Asks LLM to select most relevant files for the query
3. Reads only the selected files
4. Falls back to pattern matching if LLM fails

This dramatically improves context relevance compared to naive "top N files" approaches.

## Tech Stack

- **React + Ink** - Terminal UI framework
- **TypeScript** - Type-safe codebase
- **LiteLLM** - Multi-LLM Python backend
- **Claude Code CLI** - AI backend

## Project Structure

```
agentk/
├── src/
│   ├── cli.tsx              # CLI entry point
│   ├── components/
│   │   ├── App.tsx          # Main application
│   │   ├── StatusBar.tsx    # Footer with mode indicator
│   │   ├── ChatMessage.tsx  # Message display
│   │   └── Input.tsx        # Input with history
│   └── lib/
│       ├── claude.ts        # Claude CLI integration
│       └── council.ts       # Multi-LLM council
├── python/
│   └── agentk/
│       ├── council.py       # Council consensus logic
│       ├── scout.py         # Smart Context Selection
│       └── llm.py           # LiteLLM wrapper
└── package.json
```

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
<strong>AGENT-K v2.3.7</strong> - Multi-LLM Council Intelligence
</p>

<p align="center">
<a href="https://github.com/de5truct0/agentk">GitHub</a> •
<a href="https://www.npmjs.com/package/agentk8">npm</a> •
<a href="https://pypi.org/project/agentk8/">PyPI</a>
</p>

# AGENT-K

**Multi-Agent Claude Code Terminal Suite**

```
▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁
  ◇ ─── AGENT-K ─── ◇ ─ Multi-Agent Intelligence System ─────────────── v2.0.0
─────────────────────────────────────────────────────────────────────────────────
```

A sophisticated terminal UI for orchestrating Claude AI agents. Built with React + Ink, featuring a beautiful dark theme and intelligent task analysis.

## Features

- **Sophisticated UI** - Dark teal/purple theme inspired by modern terminal aesthetics
- **Intelligent Orchestrator** - Analyzes task complexity and coordinates specialist agents
- **Command History** - Use ↑/↓ arrows to browse past messages
- **Live Token Tracking** - Real-time token usage display
- **Animated Thinking Indicator** - Beautiful spinner with elapsed time
- **Two Modes** - Development and ML Research

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

### From Source
```bash
git clone https://github.com/de5truct0/agentk.git
cd agentk
npm install
npm run build
npm link
```

## Requirements

- **Node.js** 18+
- **Claude Code CLI** - [Install from claude.ai/code](https://claude.ai/code)

## Quick Start

```bash
# Start interactive session (Development mode)
agentk

# Start ML Research mode
agentk --mode ml

# Show help
agentk --help
```

## Usage

### Chat Interface

```
◆ You
  Build a REST API with authentication

⣾ Synthesizing… (ctrl+c to interrupt · 12s · thinking)

◆ Orchestrator
  <task_analysis>
  ┌─────────────────────────────────────────────────────────
  │ COMPLEXITY: Moderate
  │ AGENTS: Engineer, Security, Tester
  │ SUBTASKS: API endpoints, JWT auth, tests, security review
  └─────────────────────────────────────────────────────────
  </task_analysis>

  [Detailed response...]
  → 1,247 tokens
```

### Commands

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/clear` | Clear chat history |
| `/status` | Show session status |
| `/exit` | Exit AGENT-K |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑` / `↓` | Browse command history |
| `Ctrl+C` | Exit |
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
| **Scout** | Real-time research, best practices |

### ML Mode (`--mode ml`)

| Agent | Role |
|-------|------|
| **Orchestrator** | ML project lifecycle coordination |
| **Researcher** | Literature review, SOTA analysis |
| **ML Engineer** | Model implementation, training |
| **Data Engineer** | Data pipelines, preprocessing |
| **Evaluator** | Metrics, benchmarking, experiments |
| **Scout** | arXiv, HuggingFace, Papers With Code |

## Orchestrator Intelligence

The Orchestrator uses a sophisticated prompt based on:

- [Anthropic's Multi-Agent Research System](https://www.anthropic.com/engineering/multi-agent-research-system) - Orchestrator-worker pattern
- [CrewAI Framework](https://github.com/crewAIInc/crewAI) - Role-Goal-Backstory agents
- [Claude 2026 Best Practices](https://promptbuilder.cc/blog/claude-prompt-engineering-best-practices-2026) - Contract-style prompts
- [Microsoft Azure AI Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns) - Task decomposition

Every response includes:
1. **Task Analysis** - Complexity assessment and agent identification
2. **Structured Thinking** - Transparent reasoning process
3. **Coordinated Response** - Synthesized output from relevant agents

## Tech Stack

- **React** + **Ink** - Terminal UI framework (same as Claude Code)
- **TypeScript** - Type-safe codebase
- **Meow** - CLI argument parsing
- **Claude Code CLI** - AI backend

## Project Structure

```
agentk/
├── src/
│   ├── cli.tsx              # CLI entry point
│   ├── components/
│   │   ├── App.tsx          # Main application
│   │   ├── Banner.tsx       # Header banner
│   │   ├── ChatMessage.tsx  # Message display
│   │   ├── Input.tsx        # Input with history
│   │   ├── StatusBar.tsx    # Footer status
│   │   └── ThinkingIndicator.tsx
│   ├── lib/
│   │   └── claude.ts        # Claude CLI integration
│   └── themes/
│       └── retro.ts         # Color theme
├── dist/                    # Compiled output
└── package.json
```

## Configuration

Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `AGENTK_MODE` | Default mode (`dev` or `ml`) | `dev` |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run build` to compile
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Built with [Ink](https://github.com/vadimdemedes/ink) by Vadim Demedes
- Powered by [Anthropic's Claude](https://anthropic.com)
- Inspired by Claude Code's beautiful terminal UI

---

<p align="center">
<strong>AGENT-K</strong> - Multi-Agent Intelligence for Your Terminal
</p>

<p align="center">
<a href="https://github.com/de5truct0/agentk">GitHub</a> •
<a href="https://www.npmjs.com/package/agentk8">npm</a> •
<a href="https://pypi.org/project/agentk8/">PyPI</a>
</p>

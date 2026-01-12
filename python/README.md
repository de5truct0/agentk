# AGENT-K

**Multi-Agent Claude Code Terminal Suite**

```
╭─────────────────────────────────────────────────────────────────────────────────╮
│                              AGENT-K v1.0                                       │
╰─────────────────────────────────────────────────────────────────────────────────╯
```

Transform your terminal into a team of specialized AI agents. AGENT-K orchestrates multiple Claude instances working in parallel on your software development and ML research tasks.

## What is AGENT-K?

AGENT-K extends Claude Code with **multi-agent orchestration**. Instead of a single AI assistant, you get a coordinated team of specialists - each with domain expertise, working together on complex tasks.

```
╭─ You ────────────────────────────────────────────────────────────────────────────╮
│ Build a secure REST API with user authentication                                 │
╰──────────────────────────────────────────────────────────────────────────────────╯

╭─ Orchestrator ───────────────────────────────────────────────────────────────────╮
│ Breaking down task...                                                            │
│   → Engineer: Implement REST endpoints and JWT authentication                    │
│   → Tester: Write API integration tests                                          │
│   → Security: Review for OWASP vulnerabilities                                   │
│   → Scout: Find latest best practices for JWT in 2025                            │
╰──────────────────────────────────────────────────────────────────────────────────╯

[●] Orchestrator   Coordinating
[◐] Engineer       Writing src/api/auth.py...
[◐] Scout          Searching for JWT best practices...
[ ] Tester         Waiting for implementation
[ ] Security       Queued for review
```

## Why AGENT-K?

### The Problem

Claude is brilliant, but complex tasks often require:
- **Multiple perspectives** (implementation, testing, security)
- **Parallel work** (why write tests sequentially after code?)
- **Up-to-date information** (Claude's training data becomes stale)
- **Specialized focus** (security reviews need different prompts than coding)

### The Solution

AGENT-K spawns specialized Claude agents that:
- **Work in parallel** on different aspects of your task
- **Coordinate automatically** through a central orchestrator
- **Stay current** with a dedicated Scout agent for real-time research
- **Follow best practices** with domain-specific system prompts

## Features

| Feature | Description |
|---------|-------------|
| **Multi-Agent Orchestration** | Coordinate 5-6 specialized agents working in parallel |
| **Two Modes** | Software Development (default) and ML Research & Training |
| **Interactive Chat** | Familiar interface like `claude` but with a whole team |
| **Visual Mode** | tmux-based multi-pane view of all agents working |
| **Scout Agent** | Real-time web/GitHub/paper search to stay current |
| **Date Awareness** | Agents know when to verify potentially outdated info |
| **Focus Mode** | Talk directly to any specialist agent |
| **File-Based IPC** | Agents coordinate through structured JSON messages |

## Agent Teams

### Development Mode (Default)

| Agent | Specialty |
|-------|-----------|
| **Orchestrator** | Task decomposition, coordination, result aggregation |
| **Engineer** | Code implementation, debugging, refactoring |
| **Tester** | Unit/integration tests, coverage analysis |
| **Security** | OWASP vulnerability review, secrets detection |
| **Scout** | Real-time search for current best practices |

### ML Mode (`--mode ml`)

| Agent | Specialty |
|-------|-----------|
| **Orchestrator** | ML project lifecycle management |
| **Researcher** | Literature review, SOTA analysis, paper summaries |
| **ML Engineer** | Model implementation, training loops, optimization |
| **Data Engineer** | Data pipelines, preprocessing, augmentation |
| **Evaluator** | Metrics, benchmarking, experiment tracking |
| **Scout** | arXiv, HuggingFace, Papers With Code search |

## Installation

### Homebrew (macOS/Linux)
```bash
brew tap de5truct0/agentk
brew install agentk8
```

### npm
```bash
npm install -g agentk8
```

### pip
```bash
pip install agentk8
```

### Quick Install Script
```bash
curl -sSL https://raw.githubusercontent.com/de5truct0/agentk/main/install.sh | bash
```

### From Source
```bash
git clone https://github.com/de5truct0/agentk.git
cd agentk
make install
```

> **Note**: Package name is `agentk8` on all registries. The installed command is `agentk`.

## Requirements

- **jq** - JSON processing (`brew install jq`)
- **claude** - Claude Code CLI ([Install here](https://claude.ai/code))
- **tmux** - Optional, for visual mode (`brew install tmux`)

## Quick Start

```bash
# Start interactive session
agentk

# Start ML research mode
agentk --mode ml

# Start with visual panels (requires tmux)
agentk --visual

# One-shot task
agentk -c "Refactor the user service to use async/await"
```

## Usage

### Interactive Session

```bash
$ agentk

╭─────────────────────────────────────────────────╮
│  AGENT-K v1.0                                   │
╰─────────────────────────────────────────────────╯
Mode: Software Development Mode

Type your request or /help for commands.

╭─ You ─────────────────────────────────────────────────
│
```

### Session Commands

| Command | Description |
|---------|-------------|
| `/status` | Show all agent states and current tasks |
| `/logs <agent>` | View agent output |
| `/kill <agent\|all>` | Stop agent(s) |
| `/focus <agent>` | Talk directly to one agent |
| `/unfocus` | Return to orchestrator |
| `/visual` | Toggle tmux panel view |
| `/clear` | Clear screen |
| `/help` | Show all commands |
| `/exit` | End session |

### Scout Commands (Both Modes)

| Command | Description |
|---------|-------------|
| `/search <query>` | Web search for latest info |
| `/github <query>` | Search GitHub repos and code |
| `/papers <topic>` | Search arXiv/Semantic Scholar |
| `/libs <task>` | Find best libraries for task |
| `/sota <topic>` | Get state-of-the-art approaches |

### ML-Specific Commands

| Command | Description |
|---------|-------------|
| `/experiment <name>` | Start a new experiment |
| `/metrics` | Show current training metrics |
| `/tensorboard` | Open TensorBoard |
| `/checkpoint` | Save model state |
| `/compare <e1> <e2>` | Compare experiments |
| `/huggingface <query>` | Search HuggingFace Hub |

## Visual Mode

Launch with `--visual` to see all agents in a tmux layout:

```
┌───────────────────┬───────────────────┬───────────────────┐
│   ORCHESTRATOR    │     ENGINEER      │      TESTER       │
│                   │                   │                   │
│ Breaking down     │ Implementing      │ Waiting for       │
│ task into         │ auth module...    │ implementation... │
│ subtasks...       │                   │                   │
├───────────────────┼───────────────────┼───────────────────┤
│     SECURITY      │      SCOUT        │      [MAIN]       │
│                   │                   │                   │
│ Queued for        │ Searching JWT     │ You: _            │
│ review            │ best practices... │                   │
│                   │                   │                   │
└───────────────────┴───────────────────┴───────────────────┘
```

## How It Works

```
                          ┌─────────────┐
                          │    User     │
                          └──────┬──────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │     Orchestrator       │
                    │  (task decomposition)  │
                    └───────────┬────────────┘
                                │
           ┌────────────────────┼────────────────────┐
           │                    │                    │
           ▼                    ▼                    ▼
   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
   │   Engineer    │   │    Tester     │   │   Security    │
   │ (implements)  │   │  (validates)  │   │  (reviews)    │
   └───────┬───────┘   └───────┬───────┘   └───────┬───────┘
           │                    │                    │
           └────────────────────┴────────────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │    File-Based IPC      │
                    │ workspace/tasks/*.json │
                    └────────────────────────┘
```

1. **You enter a request** in the interactive session
2. **Orchestrator analyzes** and breaks it into subtasks
3. **Specialist agents spawn** as parallel Claude subprocesses
4. Agents work **on your actual project files**
5. **Results aggregate** back through the orchestrator
6. You see the **combined output** with full context

## Configuration

Create `~/.agentk/config.sh`:

```bash
# Custom model (default: claude-3-sonnet)
export AGENTK_MODEL="claude-3-opus-20240229"

# Log level: debug, info, warn, error
export LOG_LEVEL="info"

# Custom workspace location
export AGENTK_WORKSPACE="/custom/path/workspace"

# Parallel agent limit (default: 4)
export AGENTK_MAX_PARALLEL=6
```

## Project Structure

```
agentk/
├── agentk                # Main CLI entry point
├── lib/
│   ├── core.sh          # Core utilities, logging, date context
│   ├── ui.sh            # Terminal UI, spinners, chat boundaries
│   ├── ipc.sh           # Inter-process communication
│   ├── spawn.sh         # Agent subprocess management
│   └── visual.sh        # tmux integration
├── modes/
│   ├── shared/
│   │   └── scout.md     # Scout agent system prompt
│   ├── dev/             # Development mode prompts
│   │   ├── orchestrator.md
│   │   ├── engineer.md
│   │   ├── tester.md
│   │   └── security.md
│   └── ml/              # ML mode prompts
│       ├── orchestrator.md
│       ├── researcher.md
│       ├── ml-engineer.md
│       ├── data-engineer.md
│       └── evaluator.md
└── workspace/           # Runtime data (gitignored)
    ├── tasks/           # Task queue (JSON)
    ├── results/         # Agent outputs
    ├── logs/            # Agent logs
    └── experiments/     # ML experiment tracking
```

## Known Limitations

| Limitation | Workaround |
|------------|------------|
| File conflicts when agents edit same file | Use `/focus` to serialize work on critical files |
| Each agent = separate API call (cost) | Use orchestrator's judgment on when to parallelize |
| Agents don't share real-time context | Orchestrator maintains shared state in workspace |
| Rate limiting with many parallel agents | `AGENTK_MAX_PARALLEL` limits concurrent spawns |

## Roadmap

- [ ] Web UI dashboard
- [ ] Custom agent definitions
- [ ] Persistent conversation history
- [ ] Cost tracking per agent
- [ ] Team collaboration mode
- [ ] Plugin system for custom tools

## Contributing

Contributions welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Make your changes
4. Run tests (`make test`)
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Inspired by [Boris Cherny's parallel Claude workflow](https://x.com/bcherny)
- Built for the Claude Code community
- Powered by [Anthropic's Claude](https://anthropic.com)

---

<p align="center">
<strong>AGENT-K</strong> - Because one Claude is good, but a team of Claudes is better.
</p>

<p align="center">
<a href="https://github.com/de5truct0/agentk">GitHub</a> |
<a href="https://www.npmjs.com/package/agentk8">npm</a> |
<a href="https://pypi.org/project/agentk8/">PyPI</a>
</p>

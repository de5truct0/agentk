# AGENT-K

**Multi-Agent Claude Code Terminal Suite**

Orchestrate multiple specialized Claude agents for software development and ML research. Inspired by Boris Cherny's parallel Claude workflow.

```
╭─────────────────────────────────────────────────╮
│  AGENT-K v1.0                                   │
╰─────────────────────────────────────────────────╯

You: Implement user authentication with JWT

[Orchestrator] Breaking down task...
  → Engineer: Implement JWT auth module
  → Tester: Write auth tests
  → Security: Review for vulnerabilities

[●] Orchestrator  Coordinating
[◐] Engineer      Writing src/auth.py...
[ ] Tester        Waiting
[ ] Security      Waiting

You: _
```

## Features

- **Multi-Agent Orchestration**: Coordinate specialized agents working in parallel
- **Two Modes**: Software Development and ML Research & Training
- **Interactive Chat**: Works like `claude` but with a team of specialists
- **Visual Mode**: tmux-based multi-pane view of all agents
- **Scout Agent**: Real-time web/GitHub/paper search to stay current
- **Date Awareness**: Agents know their training data may be outdated

## Agents

### Development Mode (Default)
| Agent | Role |
|-------|------|
| **Orchestrator** | Breaks down tasks, coordinates agents |
| **Engineer** | Implements code, debugging, refactoring |
| **Tester** | Writes tests, validates implementations |
| **Security** | Reviews for vulnerabilities, OWASP checks |
| **Scout** | Searches web/GitHub for current best practices |

### ML Mode (`--mode ml`)
| Agent | Role |
|-------|------|
| **Orchestrator** | Manages ML project lifecycle |
| **Researcher** | Literature review, SOTA analysis |
| **ML Engineer** | Model implementation, training |
| **Data Engineer** | Data pipelines, preprocessing |
| **Evaluator** | Metrics, benchmarking, experiments |
| **Scout** | Searches arXiv, HuggingFace, Papers With Code |

## Installation

### Quick Install (Recommended)
```bash
curl -sSL https://raw.githubusercontent.com/adityakatiyar/agentk/main/install.sh | bash
```

### Homebrew (macOS/Linux)
```bash
brew tap adityakatiyar/agentk
brew install agentk
```

### npm
```bash
npm install -g agentk
```

### pip
```bash
pip install agentk
```

### From Source
```bash
git clone https://github.com/adityakatiyar/agentk.git
cd agentk
make install
```

## Requirements

- **bash** 4.0+
- **jq** (JSON processing)
- **claude** (Claude Code CLI) - [Install here](https://claude.ai/code)
- **tmux** (optional, for visual mode)

## Usage

### Start Interactive Session
```bash
agentk                    # Dev mode (default)
agentk --mode ml          # ML mode
agentk --visual           # With tmux panels
```

### One-Shot Mode
```bash
agentk -c "Build a REST API for user management"
```

### Session Commands
| Command | Description |
|---------|-------------|
| `/status` | Show all agent states |
| `/logs <agent>` | View agent output |
| `/kill <agent\|all>` | Stop agent(s) |
| `/focus <agent>` | Talk directly to agent |
| `/unfocus` | Return to orchestrator |
| `/visual` | Toggle tmux view |
| `/help` | Show all commands |
| `/exit` | End session |

### Scout Commands
| Command | Description |
|---------|-------------|
| `/search <query>` | Web search |
| `/github <query>` | Search GitHub |
| `/papers <topic>` | Search papers (ML mode) |
| `/libs <task>` | Find best libraries |
| `/sota <topic>` | State-of-the-art |

### ML Commands
| Command | Description |
|---------|-------------|
| `/experiment <name>` | Start experiment |
| `/metrics` | Show metrics |
| `/tensorboard` | Open TensorBoard |
| `/huggingface <query>` | Search HF Hub |

## Visual Mode

```
┌───────────────┬───────────────┬───────────────┐
│  ORCHESTRATOR │   ENGINEER    │    TESTER     │
├───────────────┼───────────────┼───────────────┤
│   SECURITY    │     SCOUT     │    [MAIN]     │
└───────────────┴───────────────┴───────────────┘
```

## How It Works

1. **You enter a request** in the interactive session
2. **Orchestrator analyzes** the task and breaks it into subtasks
3. **Specialist agents** are spawned as Claude subprocesses
4. Agents work on **your project files** in the current directory
5. **Results are aggregated** and reported back to you

Each agent runs as a separate `claude` CLI instance with a specialized system prompt, coordinated through file-based messaging.

## Configuration

Create `~/.agentk/config.sh` to customize:

```bash
# Use a different model
export AGENTK_MODEL="claude-3-opus-20240229"

# Set log level
export LOG_LEVEL="debug"

# Custom workspace location
export AGENTK_WORKSPACE="/path/to/workspace"
```

## Project Structure

```
agentk/
├── agentk                # Main CLI
├── lib/
│   ├── core.sh          # Core utilities
│   ├── ui.sh            # Pretty output
│   ├── ipc.sh           # Inter-process communication
│   ├── spawn.sh         # Agent spawning
│   └── visual.sh        # tmux integration
├── modes/
│   ├── shared/
│   │   └── scout.md     # Scout agent prompt
│   ├── dev/             # Dev mode agent prompts
│   └── ml/              # ML mode agent prompts
└── workspace/           # Runtime data (gitignored)
```

## Known Limitations

See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for a full list. Key limitations:

- **File conflicts**: Multiple agents modifying same file
- **Cost**: Each agent is a separate API call
- **Context isolation**: Agents don't share real-time context
- **Rate limiting**: Parallel agents may hit API limits

## Contributing

Contributions welcome! Please read the contributing guidelines first.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `make test`
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Inspired by [Boris Cherny's Claude Code workflow](https://x.com/bcherny)
- Built for the Claude Code community
- Powered by [Anthropic's Claude](https://anthropic.com)

---

**AGENT-K** - Because one Claude is good, but a team of Claudes is better.

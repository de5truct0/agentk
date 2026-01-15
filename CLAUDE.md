# AGENT-K Project Context

## Project Structure

```
/Users/adityakatiyar/Documents/AGENT-K/
├── agentk/                    # Main repository (this repo)
│   ├── src/                   # TypeScript/React source (Ink terminal UI)
│   │   └── components/        # React components (App.tsx, StatusBar.tsx, etc.)
│   ├── python/                # Python package subdirectory
│   │   ├── agentk/            # Python module
│   │   └── pyproject.toml     # Python package config
│   ├── package.json           # npm package config
│   └── dist/                  # Built JS output
│
└── homebrew-agentk/           # Homebrew tap repository (SEPARATE REPO)
    └── Formula/
        └── agentk8.rb         # Homebrew formula
```

## Package Publishing

### Version Files (ALL must be updated together)
1. `/agentk/package.json` - `"version": "X.Y.Z"`
2. `/agentk/python/pyproject.toml` - `version = "X.Y.Z"`
3. `/homebrew-agentk/Formula/agentk8.rb` - url version + sha256 + test version

### Publishing Checklist

#### npm
```bash
cd /Users/adityakatiyar/Documents/AGENT-K/agentk
npm publish
```

#### PyPI
```bash
cd /Users/adityakatiyar/Documents/AGENT-K/agentk/python
rm -rf dist/ && python3 -m build
python3 -m twine upload dist/* -u __token__ -p <PYPI_TOKEN>
```
PyPI token can be generated at: https://pypi.org/manage/account/token/

#### Homebrew
1. Get new SHA256: `curl -sL https://registry.npmjs.org/agentk8/-/agentk8-X.Y.Z.tgz | shasum -a 256`
2. Update `/Users/adityakatiyar/Documents/AGENT-K/homebrew-agentk/Formula/agentk8.rb`:
   - `url` version
   - `sha256` hash
   - `test` version assertion
3. Commit and push to homebrew-agentk repo

#### Git (main repo)
```bash
cd /Users/adityakatiyar/Documents/AGENT-K/agentk
git add -A && git commit -m "vX.Y.Z: description" && git push
```

## Package Links
- npm: https://www.npmjs.com/package/agentk8
- PyPI: https://pypi.org/project/agentk8/
- Homebrew: `brew tap de5truct0/agentk && brew install agentk8`
- GitHub: https://github.com/de5truct0/agentk

## Tech Stack
- **Terminal UI**: React + Ink (ink.js)
- **Language**: TypeScript (TSX)
- **Python Backend**: LiteLLM for multi-LLM support
- **Build**: `npm run build` (tsc)
- **Dev**: `npm run dev` (tsx)

## Key Components
- `App.tsx` - Main application, handles message flow, question wizard state
- `StatusBar.tsx` - Bottom status bar with mode, agents, tokens
- `WelcomeBox.tsx` - Welcome banner with wolf ASCII art
- `ChatMessage.tsx` - Message display with markdown rendering
- `QuestionWizard.tsx` - Interactive multi-question form (Claude Code style)
- `Confirmation.tsx` - Simple yes/no confirmations
- `ThinkingIndicator.tsx` - Processing animation

## Modes
- **dev**: Software development agents (Orchestrator, Engineer, Tester, Security)
- **ml**: ML research agents (Orchestrator, Researcher, ML Engineer, Evaluator)
- **council**: Multi-LLM consensus (GPT + Gemini + Claude)
- **solo**: Claude CLI only

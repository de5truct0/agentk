#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import meow from 'meow';
import { App } from './components/App.js';
import { checkClaudeInstalled } from './lib/claude.js';

const VERSION = '2.2.2';

const cli = meow(`
  Usage
    $ agentk8 [options]

  Options
    --mode, -m     Set mode: dev (default) or ml
    --version, -v  Show version
    --help, -h     Show this help

  Examples
    $ agentk8              Start dev mode
    $ agentk8 --mode ml    Start ML mode

  Commands (inside app)
    /help     Show available commands
    /status   Show session status
    /clear    Clear chat history
    /exit     Exit AGENT-K

  Keyboard
    Ctrl+C    Exit
    Ctrl+U    Clear input line
`, {
  importMeta: import.meta,
  flags: {
    mode: {
      type: 'string',
      shortFlag: 'm',
      default: 'dev',
    },
    version: {
      type: 'boolean',
      shortFlag: 'v',
    },
  },
});

async function main() {
  // Handle version flag
  if (cli.flags.version) {
    console.log(`AGENT-K v${VERSION}`);
    process.exit(0);
  }

  // Validate mode
  const mode = cli.flags.mode as 'dev' | 'ml';
  if (mode !== 'dev' && mode !== 'ml') {
    console.error(`Error: Invalid mode '${mode}'. Use 'dev' or 'ml'.`);
    process.exit(1);
  }

  // Check if Claude is installed
  const claudeInstalled = await checkClaudeInstalled();
  if (!claudeInstalled) {
    console.error('Error: Claude Code CLI is not installed.');
    console.error('Install it from: https://claude.ai/code');
    process.exit(1);
  }

  // Clear screen
  console.clear();

  // Render the app
  const { waitUntilExit } = render(
    <App mode={mode} version={VERSION} />
  );

  await waitUntilExit();

  // Show goodbye message
  console.log('\n✦ Goodbye!\n');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

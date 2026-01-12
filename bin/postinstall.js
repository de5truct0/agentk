#!/usr/bin/env node
/**
 * AGENT-K npm postinstall script
 * Checks dependencies and provides setup instructions
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function checkCommand(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function main() {
  console.log();
  console.log(`${CYAN}╭─────────────────────────────────────────────────╮${RESET}`);
  console.log(`${CYAN}│${RESET}  ${BOLD}AGENT-K Installed${RESET}                              ${CYAN}│${RESET}`);
  console.log(`${CYAN}╰─────────────────────────────────────────────────╯${RESET}`);
  console.log();

  // Make scripts executable
  const agentkPath = path.join(__dirname, '..', 'agentk');
  const libPath = path.join(__dirname, '..', 'lib');

  try {
    fs.chmodSync(agentkPath, '755');
    fs.readdirSync(libPath).forEach(file => {
      if (file.endsWith('.sh')) {
        fs.chmodSync(path.join(libPath, file), '755');
      }
    });
  } catch (err) {
    console.warn(`${YELLOW}Warning: Could not set executable permissions${RESET}`);
  }

  // Check dependencies
  console.log('Checking dependencies...');
  console.log();

  const deps = [
    { name: 'bash', required: true },
    { name: 'jq', required: true },
    { name: 'claude', required: true, note: 'Claude Code CLI' },
    { name: 'tmux', required: false, note: 'for visual mode' }
  ];

  let hasIssues = false;

  deps.forEach(dep => {
    const installed = checkCommand(dep.name);
    const status = installed ? `${GREEN}✓${RESET}` : (dep.required ? `${RED}✗${RESET}` : `${YELLOW}○${RESET}`);
    const note = dep.note ? ` (${dep.note})` : '';

    console.log(`  ${status} ${dep.name}${note}`);

    if (!installed && dep.required) {
      hasIssues = true;
    }
  });

  console.log();

  if (hasIssues) {
    console.log(`${RED}Missing required dependencies!${RESET}`);
    console.log();
    console.log('Install missing dependencies:');
    console.log('  brew install jq         # macOS');
    console.log('  sudo apt install jq     # Linux');
    console.log();
    console.log('Install Claude Code CLI:');
    console.log('  https://claude.ai/code');
    console.log();
  } else {
    console.log(`${GREEN}All required dependencies found!${RESET}`);
    console.log();
    console.log('Get started:');
    console.log(`  ${CYAN}agentk${RESET}              # Start dev mode`);
    console.log(`  ${CYAN}agentk --mode ml${RESET}    # Start ML mode`);
    console.log(`  ${CYAN}agentk --help${RESET}       # Show all options`);
    console.log();
  }
}

main();

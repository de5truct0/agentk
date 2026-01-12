#!/usr/bin/env node
/**
 * AGENT-K npm wrapper
 * Executes the bash script with proper paths
 */

const { spawn } = require('child_process');
const path = require('path');

// Get the path to the actual agentk script
const agentkPath = path.join(__dirname, '..', 'agentk');

// Set AGENTK_ROOT environment variable
const env = {
  ...process.env,
  AGENTK_ROOT: path.join(__dirname, '..')
};

// Spawn the bash script with all arguments
const child = spawn('bash', [agentkPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env
});

// Handle exit
child.on('exit', (code) => {
  process.exit(code || 0);
});

// Handle errors
child.on('error', (err) => {
  console.error('Failed to start agentk:', err.message);
  console.error('Make sure bash is installed and in your PATH');
  process.exit(1);
});

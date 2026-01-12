import { spawn } from 'child_process';

interface ClaudeResult {
  response: string;
  tokens: {
    input: number;
    output: number;
  };
}

export async function runClaude(
  prompt: string,
  mode: 'dev' | 'ml'
): Promise<ClaudeResult> {
  return new Promise((resolve, reject) => {
    const systemPrompt = getSystemPrompt(mode);

    // Run claude with JSON output to capture tokens
    const args = [
      '--print',
      '--output-format', 'json',
      '--system-prompt', systemPrompt,
      prompt
    ];

    const claude = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    claude.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    claude.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    claude.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Claude exited with code ${code}`));
        return;
      }

      try {
        // Try to parse as JSON
        const result = parseClaudeOutput(stdout);
        resolve(result);
      } catch (e) {
        // If not JSON, return as plain text
        resolve({
          response: stdout.trim(),
          tokens: { input: 0, output: 0 },
        });
      }
    });

    claude.on('error', (err) => {
      reject(new Error(`Failed to start Claude: ${err.message}`));
    });
  });
}

function parseClaudeOutput(output: string): ClaudeResult {
  try {
    const json = JSON.parse(output);

    // Extract response text
    let response = '';
    if (json.result) {
      response = json.result;
    } else if (json.content) {
      if (Array.isArray(json.content)) {
        response = json.content.map((c: any) => c.text || '').join('\n');
      } else {
        response = json.content;
      }
    } else if (json.text) {
      response = json.text;
    } else {
      response = output;
    }

    // Extract tokens
    const tokens = {
      input: json.usage?.input_tokens || json.inputTokens || json.stats?.input_tokens || 0,
      output: json.usage?.output_tokens || json.outputTokens || json.stats?.output_tokens || 0,
    };

    return { response, tokens };
  } catch {
    return {
      response: output.trim(),
      tokens: { input: 0, output: 0 },
    };
  }
}

function getSystemPrompt(mode: 'dev' | 'ml'): string {
  const today = new Date().toISOString().split('T')[0];

  if (mode === 'ml') {
    return `You are the Orchestrator agent in AGENT-K, a multi-agent system for ML research.
Today's date: ${today}

Your role is to:
1. Analyze ML tasks and break them into subtasks
2. Coordinate between Researcher, ML Engineer, Data Engineer, and Evaluator
3. Ensure best practices in ML development
4. Provide clear, actionable responses

Be concise and practical in your responses.`;
  }

  return `You are the Orchestrator agent in AGENT-K, a multi-agent system for software development.
Today's date: ${today}

Your role is to:
1. Analyze development tasks and break them into subtasks
2. Coordinate between Engineer, Tester, and Security agents
3. Ensure code quality and security
4. Provide clear, actionable responses

Be concise and practical in your responses.`;
}

export async function checkClaudeInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const claude = spawn('claude', ['--version'], { stdio: 'ignore' });
    claude.on('close', (code) => resolve(code === 0));
    claude.on('error', () => resolve(false));
  });
}

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
  mode: 'dev' | 'ml',
  autoAccept: boolean = false
): Promise<ClaudeResult> {
  const systemPrompt = getSystemPrompt(mode);

  return new Promise((resolve, reject) => {
    const args = [
      '--print',
      '--output-format', 'json',
      ...(autoAccept ? ['--dangerously-skip-permissions'] : []),
      '--system-prompt', systemPrompt,
      prompt,
    ];

    // Critical: Use 'inherit' for stdin and set ANTHROPIC_API_KEY to empty
    // Fixes hanging issue when spawning Claude from Node.js
    // See: https://github.com/anthropics/claude-code/issues/771
    const claude = spawn('claude', args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: '',
      },
    });

    let stdout = '';
    let stderr = '';
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        claude.kill();
        reject(new Error('Claude request timed out after 2 minutes'));
      }
    }, 120000);

    claude.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    claude.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    claude.on('close', (code: number | null) => {
      clearTimeout(timeout);
      if (resolved) return;
      resolved = true;

      if (code !== 0 && !stdout) {
        reject(new Error(stderr || `Claude exited with code ${code}`));
        return;
      }

      try {
        resolve(parseClaudeOutput(stdout));
      } catch {
        resolve({
          response: stdout.trim() || 'No response from Claude',
          tokens: { input: 0, output: 0 },
        });
      }
    });

    claude.on('error', (err: Error) => {
      clearTimeout(timeout);
      if (resolved) return;
      resolved = true;
      reject(new Error(`Failed to start Claude: ${err.message}`));
    });
  });
}

function parseClaudeOutput(output: string): ClaudeResult {
  try {
    const json = JSON.parse(output);

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

/**
 * ORCHESTRATOR SYSTEM PROMPT
 *
 * Based on comparative analysis of:
 * - Anthropic's Multi-Agent Research System (orchestrator-worker pattern)
 * - CrewAI Framework (role-goal-backstory)
 * - Microsoft Azure AI Agent Patterns (task decomposition)
 * - Claude Chain-of-Thought best practices
 *
 * Sources:
 * - https://www.anthropic.com/engineering/multi-agent-research-system
 * - https://github.com/crewAIInc/crewAI
 * - https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns
 * - https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/chain-of-thought
 */
function getSystemPrompt(mode: 'dev' | 'ml'): string {
  const today = new Date().toISOString().split('T')[0];

  const orchestratorCore = `# AGENT-K ORCHESTRATOR
Date: ${today}

## ROLE
You are the Orchestrator—the central intelligence coordinator in AGENT-K, a multi-agent system. You analyze requests, decompose complex tasks, and coordinate specialized agents.

## CORE PRINCIPLES
1. **Analyze First**: Before responding, assess task complexity and scope
2. **Decompose Intelligently**: Break complex tasks into clear subtasks
3. **Delegate Strategically**: Identify which agent(s) should handle each part
4. **Think Transparently**: Show your reasoning process
5. **Synthesize Results**: Provide cohesive, actionable outputs

## RESPONSE FORMAT

Structure your response with clear markdown headers (no XML tags in output):

### Task Analysis
| Aspect | Assessment |
|--------|------------|
| **Complexity** | Simple / Moderate / Complex |
| **Agents** | List specialists needed |

### Plan
Numbered steps for execution.

### Notes
Any clarifications or considerations.

IMPORTANT: Do NOT output raw XML tags like <thinking>, <task_analysis>, or <response> in your response. Use clean markdown formatting only.

## COMPLEXITY SCALING
- **Simple** (1 agent, direct response): Factual questions, single-file changes, explanations
- **Moderate** (2-3 agents, coordinated): Feature implementation, debugging, code review
- **Complex** (3+ agents, parallel): Architecture design, full features, multi-file refactors

## ASKING QUESTIONS

When you need clarification or user input before proceeding, use this XML format for EACH question:

<question header="ShortLabel">
Your question text here?
<options>
<option recommended="true">First option (mark recommended if applicable)</option>
<option>Second option</option>
<option>Third option</option>
<option>Fourth option</option>
</options>
</question>

Guidelines for questions:
- header: Short label (1-2 words) like "Language", "Framework", "Approach"
- question: Clear, specific question ending with ?
- options: 2-4 concrete choices (user can also provide custom answer)
- recommended: Add recommended="true" to the best default option

Example with multiple questions:
<question header="Language">
What programming language should I use?
<options>
<option recommended="true">TypeScript</option>
<option>Python</option>
<option>Go</option>
</options>
</question>

<question header="Features">
Which features do you need?
<options>
<option recommended="true">Standard validation with error messages</option>
<option>NIST guidelines compliance</option>
<option>Password strength meter</option>
</options>
</question>

IMPORTANT: Only ask questions when genuinely needed. For straightforward requests, proceed directly with analysis and recommendations.`;

  if (mode === 'ml') {
    return `${orchestratorCore}

## MODE: ML Research & Training

## SPECIALIST AGENTS

### ◆ Researcher
- **Role**: Scientific literature specialist
- **Goal**: Find and synthesize relevant research, identify SOTA approaches
- **Capabilities**: Paper analysis, benchmark comparisons, methodology review
- **Triggers**: "What's the best approach for...", architecture decisions, SOTA queries

### ◆ ML Engineer
- **Role**: Model implementation specialist
- **Goal**: Build robust, efficient ML systems
- **Capabilities**: PyTorch/JAX/TensorFlow, training loops, custom layers, distributed training
- **Triggers**: Model building, training issues, optimization, architecture implementation

### ◆ Data Engineer
- **Role**: Data pipeline specialist
- **Goal**: Ensure clean, efficient data flow
- **Capabilities**: Preprocessing, augmentation, data loading, format conversion
- **Triggers**: Data issues, pipeline optimization, dataset preparation

### ◆ Evaluator
- **Role**: Metrics and benchmarking specialist
- **Goal**: Rigorous model assessment and experiment tracking
- **Capabilities**: Metric implementation, benchmark setup, W&B/MLflow integration
- **Triggers**: Model evaluation, experiment comparison, performance analysis

### ◆ Scout
- **Role**: External research specialist
- **Goal**: Find latest implementations, papers, and resources
- **Capabilities**: arXiv search, HuggingFace Hub, GitHub implementations
- **Triggers**: "Find papers on...", implementation search, dataset discovery

## ML-SPECIFIC CONSIDERATIONS
When analyzing ML tasks, consider:
- Model architecture trade-offs (accuracy vs. efficiency)
- Data requirements and preprocessing complexity
- Training resources (GPU memory, compute time)
- Evaluation methodology and baselines
- Reproducibility and experiment tracking`;
  }

  return `${orchestratorCore}

## MODE: Software Development

## SPECIALIST AGENTS

### ◆ Engineer
- **Role**: Code implementation specialist
- **Goal**: Write clean, efficient, maintainable code
- **Capabilities**: Feature development, debugging, refactoring, optimization
- **Triggers**: "Implement...", "Fix...", "Build...", code changes

### ◆ Tester
- **Role**: Quality assurance specialist
- **Goal**: Ensure code reliability through comprehensive testing
- **Capabilities**: Unit tests, integration tests, coverage analysis, edge cases
- **Triggers**: "Test...", "Verify...", after implementations, quality checks

### ◆ Security
- **Role**: Security analysis specialist
- **Goal**: Identify and prevent vulnerabilities
- **Capabilities**: OWASP review, secrets detection, input validation, auth patterns
- **Triggers**: Auth code, user input handling, API security, before deployments

### ◆ Scout
- **Role**: External research specialist
- **Goal**: Find current best practices and solutions
- **Capabilities**: Documentation search, library comparison, Stack Overflow, GitHub
- **Triggers**: Library selection, unfamiliar patterns, error investigation

## DEV-SPECIFIC CONSIDERATIONS
When analyzing development tasks, consider:
- Code architecture and design patterns
- Testing strategy and coverage requirements
- Security implications (OWASP Top 10)
- Performance and scalability
- Dependencies and compatibility
- Error handling and edge cases`;
}

export async function checkClaudeInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const claude = spawn('claude', ['--version'], { stdio: 'ignore' });
    claude.on('close', (code) => resolve(code === 0));
    claude.on('error', () => resolve(false));
  });
}

/**
 * Council Integration for AGENT-K
 * 
 * Connects TypeScript UI to Python council backend.
 * Supports two modes:
 * - Council: Multi-LLM via LiteLLM (GPT, Gemini, Claude)
 * - Solo: Multi-Claude CLI instances with personas
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface StageUpdate {
  stage: string;
  message?: string;
  responses?: Record<string, string>;
  reviews?: Record<string, string>;
  final?: string;
}

export interface CouncilResult {
  query: string;
  mode: 'council' | 'solo';
  stages: Array<{
    stage: number;
    stage_name: string;
    responses: Record<string, string>;
    timestamp: string;
  }>;
  final_response: string;
  chairman: string;
  total_tokens: { input: number; output: number };
  timestamp: string;
}

export interface CouncilOptions {
  mode?: 'council' | 'solo';
  skipScout?: boolean;
  projectRoot?: string;
  timeout?: number;
}

/**
 * Run the council process.
 * 
 * @param query User's query
 * @param options Council options
 * @param onStage Callback for stage updates
 * @returns Promise resolving to final result
 */
export function runCouncil(
  query: string,
  options: CouncilOptions = {},
  onStage?: (update: StageUpdate) => void
): Promise<CouncilResult> {
  const {
    mode = 'council',
    skipScout = false,
    projectRoot,
    timeout = 300000, // 5 minutes
  } = options;

  return new Promise((resolve, reject) => {
    // Build Python command
    const pythonArgs = [
      '-m', 'agentk',
      '--mode', mode,
      '--json',
    ];

    if (skipScout) {
      pythonArgs.push('--skip-scout');
    }

    if (projectRoot) {
      pythonArgs.push('--project', projectRoot);
    }

    pythonArgs.push(query);

    // Get the Python directory
    const pythonDir = path.resolve(__dirname, '../../python');

    const python = spawn('python3', pythonArgs, {
      cwd: pythonDir,
      stdio: ['inherit', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONPATH: pythonDir,
      },
    });

    let stdout = '';
    let stderr = '';
    let resolved = false;


    let buffer = '';

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        python.kill();
        reject(new Error('Council request timed out'));
      }
    }, timeout);

    python.stdout?.on('data', (data: Buffer) => {
      const chunk = data.toString();
      stdout += chunk;
      buffer += chunk;

      // Handle stream fragmentation
      const lines = buffer.split('\n');
      // Keep the last partial line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const update = JSON.parse(line) as StageUpdate;
          if (update.stage && onStage) {
            onStage(update);
          }
        } catch {
          // Ignore incomplete or non-JSON lines during streaming
        }
      }
    });

    python.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    python.on('close', (code: number | null) => {
      clearTimeout(timeoutId);
      if (resolved) return;
      resolved = true;

      if (code !== 0 && !stdout) {
        reject(new Error(stderr || `Council exited with code ${code}`));
        return;
      }

      try {
        // Find the last valid JSON object (the final result)
        const lines = stdout.split('\n').filter(Boolean).reverse();
        for (const line of lines) {
          try {
            const result = JSON.parse(line);
            if (result.final_response || result.council) {
              // Handle wrapped result
              const councilResult = result.council || result;
              resolve(councilResult as CouncilResult);
              return;
            }
          } catch {
            // Try next line
          }
        }

        // Fallback: try parsing entire stdout
        const result = JSON.parse(stdout);
        resolve(result.council || result);
      } catch {
        reject(new Error(`Failed to parse council output: ${stdout.slice(0, 200)}`));
      }
    });

    python.on('error', (err: Error) => {
      clearTimeout(timeoutId);
      if (resolved) return;
      resolved = true;
      reject(new Error(`Failed to start council: ${err.message}`));
    });
  });
}

/**
 * Check if the council backend is available.
 */
export async function checkCouncilAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const python = spawn('python3', ['-c', 'import agentk; print("ok")'], {
      stdio: 'ignore',
      cwd: path.resolve(__dirname, '../../python'),
      env: {
        ...process.env,
        PYTHONPATH: path.resolve(__dirname, '../../python'),
      },
    });

    python.on('close', (code) => resolve(code === 0));
    python.on('error', () => resolve(false));
  });
}

/**
 * Get available models status from the council backend.
 */
export async function getAvailableModels(): Promise<Record<string, boolean>> {
  return new Promise((resolve) => {
    const pythonDir = path.resolve(__dirname, '../../python');
    const python = spawn(
      'python3',
      ['-c', `
import json
from agentk.llm import LLMClient
client = LLMClient()
print(json.dumps({k: v for k, v in client._available_models.items()}))
`],
      {
        stdio: ['inherit', 'pipe', 'pipe'],
        cwd: pythonDir,
        env: {
          ...process.env,
          PYTHONPATH: pythonDir,
        },
      }
    );

    let stdout = '';
    python.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0 && stdout) {
        try {
          resolve(JSON.parse(stdout.trim()));
          return;
        } catch {
          // Fall through
        }
      }
      resolve({ claude: true, gpt: false, gemini: false });
    });

    python.on('error', () => {
      resolve({ claude: true, gpt: false, gemini: false });
    });
  });
}

export default {
  runCouncil,
  checkCouncilAvailable,
  getAvailableModels,
};

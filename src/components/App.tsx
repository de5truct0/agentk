import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput, Static } from 'ink';
import { WelcomeBox } from './WelcomeBox.js';
import { ChatMessage } from './ChatMessage.js';
import { Input } from './Input.js';
import { StatusBar } from './StatusBar.js';
import { ThinkingIndicator } from './ThinkingIndicator.js';
import { AgentName } from './AgentPanel.js';
import { runClaude } from '../lib/claude.js';
import { runCouncil, checkCouncilAvailable, getAvailableModels, StageUpdate } from '../lib/council.js';
import { Confirmation, ConfirmationOption } from './Confirmation.js';

interface Message {
  id: string;
  role: 'user' | 'agent' | 'system';
  agentName?: string;
  content: string;
  tokens?: { input: number; output: number };
  timestamp: Date;
  isWelcome?: boolean;
}

interface AppProps {
  mode: 'dev' | 'ml';
  version: string;
}

type ExecutionMode = 'plan' | 'auto';
type CouncilMode = 'solo' | 'council' | 'off';

export const App: React.FC<AppProps> = ({ mode, version }) => {
  const { exit } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStartTime, setProcessingStartTime] = useState<Date | null>(null);
  const [totalTokens, setTotalTokens] = useState(0);
  const [startTime] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('plan');
  const [activeAgent, setActiveAgent] = useState<AgentName | undefined>(undefined);
  const [completedAgents, setCompletedAgents] = useState<AgentName[]>([]);
  const [confirmationState, setConfirmationState] = useState<{
    message: string;
    options: ConfirmationOption[];
    onSelect: (value: string) => void;
    onCancel: () => void;
  } | null>(null);
  const [autoAccept, setAutoAccept] = useState(false);
  const [councilMode, setCouncilMode] = useState<CouncilMode>('off');
  const [councilAvailable, setCouncilAvailable] = useState(false);
  const [availableModels, setAvailableModels] = useState<Record<string, boolean>>({});
  const [councilStage, setCouncilStage] = useState<string | null>(null);

  // Check council availability on mount
  useEffect(() => {
    checkCouncilAvailable().then(setCouncilAvailable);
    getAvailableModels().then(setAvailableModels);
  }, []);

  // Detect agents mentioned in response
  const detectMentionedAgents = (content: string): AgentName[] => {
    const agents: AgentName[] = [];
    const devAgents: AgentName[] = ['Engineer', 'Tester', 'Security', 'Scout'];
    const mlAgents: AgentName[] = ['Researcher', 'ML Engineer', 'Data Engineer', 'Evaluator'];
    const relevantAgents = mode === 'dev' ? devAgents : mlAgents;

    for (const agent of relevantAgents) {
      if (content.toLowerCase().includes(agent.toLowerCase())) {
        agents.push(agent);
      }
    }
    return agents;
  };

  // Handle input submission
  const handleSubmit = async (input: string) => {
    // Check for commands
    if (input.startsWith('/')) {
      handleCommand(input);
      return;
    }

    // Handle confirmation response
    if (confirmationState) {
      return; // Input is disabled when confirmation is active
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Use council mode if enabled
    if (councilMode !== 'off') {
      await executeCouncil(input);
    } else if (executionMode === 'plan') {
      await generatePlan(input);
    } else {
      await executeTask(input);
    }
  };

  // Execute via Council
  const executeCouncil = async (input: string) => {
    setIsProcessing(true);
    setProcessingStartTime(new Date());
    setActiveAgent('Orchestrator');
    setCompletedAgents([]);
    setError(null);
    setCouncilStage('scout');

    try {
      const result = await runCouncil(
        input,
        { mode: councilMode as 'council' | 'solo' },
        (update: StageUpdate) => {
          // Update stage indicator
          if (update.stage.startsWith('stage1')) {
            setCouncilStage('stage1');
            setActiveAgent('Orchestrator');
          } else if (update.stage.startsWith('stage2')) {
            setCouncilStage('stage2');
          } else if (update.stage.startsWith('stage3')) {
            setCouncilStage('stage3');
          }
        }
      );

      setCompletedAgents(['Orchestrator']);
      setActiveAgent(undefined);
      setCouncilStage(null);

      const councilMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        agentName: 'Council',
        content: result.final_response,
        tokens: result.total_tokens,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, councilMessage]);

      if (result.total_tokens) {
        setTotalTokens(prev => prev + result.total_tokens.input + result.total_tokens.output);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Council error');
    } finally {
      setIsProcessing(false);
      setProcessingStartTime(null);
      setCouncilStage(null);
    }
  }

  // Generate a plan for approval
  const generatePlan = async (input: string) => {
    setIsProcessing(true);
    setProcessingStartTime(new Date());
    setActiveAgent('Orchestrator');
    setError(null);

    try {
      const planPrompt = `Analyze this request and create a detailed execution plan. Do NOT execute yet - just analyze and plan.

Request: ${input}

Respond with:
1. Task Analysis (complexity, scope)
2. Agents Required (list which specialists are needed)
3. Step-by-Step Plan (numbered steps)
4. Questions (if any clarification needed)

Format your response clearly with headers.`;

      const result = await runClaude(planPrompt, mode, autoAccept);

      const mentioned = detectMentionedAgents(result.response);
      setCompletedAgents(['Orchestrator', ...mentioned]);
      setActiveAgent(undefined);

      const planMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        agentName: 'Orchestrator',
        content: result.response,
        tokens: result.tokens,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, planMessage]);

      if (result.tokens) {
        setTotalTokens(prev => prev + result.tokens.input + result.tokens.output);
      }

      setConfirmationState({
        message: 'Do you want to execute this plan?',
        options: [
          { label: 'Yes, execute plan', value: 'yes', key: 'Enter' },
          { label: 'No, cancel', value: 'no', key: 'Esc' },
        ],
        onSelect: (value) => {
          setConfirmationState(null);
          if (value === 'yes') {
            executeTask(input);
          } else {
            addSystemMessage('Plan cancelled.');
          }
        },
        onCancel: () => {
          setConfirmationState(null);
          addSystemMessage('Plan cancelled.');
        },
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
      setProcessingStartTime(null);
    }
  };

  // Execute task directly
  const executeTask = async (input: string) => {
    setIsProcessing(true);
    setProcessingStartTime(new Date());
    setActiveAgent('Orchestrator');
    setCompletedAgents([]);
    setError(null);

    try {
      const result = await runClaude(input, mode, autoAccept);

      const mentioned = detectMentionedAgents(result.response);
      setCompletedAgents(['Orchestrator', ...mentioned]);
      setActiveAgent(undefined);

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        agentName: 'Orchestrator',
        content: result.response,
        tokens: result.tokens,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, agentMessage]);

      if (result.tokens) {
        setTotalTokens(prev => prev + result.tokens.input + result.tokens.output);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
      setProcessingStartTime(null);
    }
  };

  // Add system message helper
  const addSystemMessage = (content: string) => {
    const msg: Message = {
      id: Date.now().toString(),
      role: 'system',
      agentName: 'System',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, msg]);
  };

  // Handle slash commands
  const handleCommand = (cmd: string) => {
    const [command] = cmd.slice(1).split(' ');

    switch (command) {
      case 'exit':
      case 'quit':
        exit();
        break;
      case 'clear':
        setMessages([]);
        setActiveAgent(undefined);
        setCompletedAgents([]);
        break;
      case 'plan':
        setExecutionMode('plan');
        addSystemMessage('Plan mode enabled. I will show plans for approval before executing.');
        break;
      case 'auto':
        setConfirmationState({
          message: '⚠️  Are you sure you want to enable Auto Mode? This will execute actions without further approval.',
          options: [
            { label: 'Yes, enable auto mode', value: 'yes' },
            { label: 'No, stay in plan mode', value: 'no' },
          ],
          onSelect: (value) => {
            setConfirmationState(null);
            if (value === 'yes') {
              setExecutionMode('auto');
              addSystemMessage('Auto mode enabled. I will execute tasks directly without approval.');
            } else {
              addSystemMessage('Kept in plan mode.');
            }
          },
          onCancel: () => {
            setConfirmationState(null);
            addSystemMessage('Kept in plan mode.');
          },
        });
        break;
      case 'mode':
        addSystemMessage(`Current execution mode: ${executionMode}\nUse /plan or /auto to switch.`);
        break;
      case 'agents':
        if (!activeAgent && completedAgents.length === 0) {
          addSystemMessage('No agents currently active.');
        } else {
          const status = activeAgent ? `Active: ${activeAgent}\n` : '';
          const completed = completedAgents.length > 0 ? `Completed: ${completedAgents.join(', ')}` : '';
          addSystemMessage(`Agent Status:\n${status}${completed}`);
        }
        break;
      case 'council':
        if (!councilAvailable) {
          addSystemMessage('Council backend not available. Install: pip install -e ./python');
        } else if (councilMode === 'off') {
          // Check available models and recommend mode
          const hasMultipleModels = Object.values(availableModels).filter(Boolean).length > 1;
          if (hasMultipleModels) {
            setCouncilMode('council');
            addSystemMessage('Council mode enabled (multi-LLM). Stage 1→2→3 consensus.');
          } else {
            setCouncilMode('solo');
            addSystemMessage('Council mode enabled (solo). Multi-Claude personas.');
          }
        } else {
          setCouncilMode('off');
          addSystemMessage('Council mode disabled. Using standard orchestrator.');
        }
        break;
      case 'solo':
        if (!councilAvailable) {
          addSystemMessage('Council backend not available. Install: pip install -e ./python');
        } else {
          setCouncilMode('solo');
          addSystemMessage('Solo council mode enabled. Uses Claude CLI with personas.');
        }
        break;
      case 'models':
        const modelStatus = Object.entries(availableModels)
          .map(([k, v]) => `${v ? '✓' : '✗'} ${k}`)
          .join('\n');
        addSystemMessage(`Available Models:\n${modelStatus || 'Checking...'}`);
        break;
      case 'help':
        const helpMessage: Message = {
          id: Date.now().toString(),
          role: 'agent',
          agentName: 'System',
          content: `Available commands:
/help     - Show this help
/clear    - Clear chat history
/status   - Show session status
/plan     - Enable plan mode (ask before executing)
/auto     - Enable auto mode (execute directly)
/mode     - Show current execution mode
/agents   - Show active agents
/council  - Toggle council mode (multi-LLM consensus)
/solo     - Enable solo council (multi-Claude personas)
/models   - Show available LLM models
/exit     - Exit AGENT-K

Keyboard shortcuts:
↑/↓       - Browse command history
Tab       - Autocomplete commands
Shift+Tab - Toggle auto-accept edits
Ctrl+C    - Exit
Ctrl+U    - Clear input line`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, helpMessage]);
        break;
      case 'status':
        const statusMessage: Message = {
          id: Date.now().toString(),
          role: 'agent',
          agentName: 'System',
          content: `Session Status:
◇ Mode: ${mode === 'dev' ? 'Development' : 'ML Research'}
◇ Execution: ${executionMode === 'plan' ? 'Plan (approval required)' : 'Auto (direct execution)'}
◇ Council: ${councilMode === 'off' ? 'Off' : councilMode === 'council' ? 'Multi-LLM' : 'Solo (Multi-Claude)'}
◇ Messages: ${messages.length}
◇ Total Tokens: ${totalTokens}
◇ Active Agent: ${activeAgent || 'None'}
◇ Council Stage: ${councilStage || 'N/A'}
◇ Session Time: ${formatElapsed(startTime)}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, statusMessage]);
        break;
      default:
        setError(`Unknown command: /${command}`);
    }
  };

  // Handle keyboard shortcuts
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
    }
    // Shift+Tab to toggle auto-accept
    if (key.shift && key.tab) {
      if (autoAccept) {
        // Disable silently
        setAutoAccept(false);
      } else {
        // Show confirmation prompt
        setConfirmationState({
          message: 'Enable auto-accept for code edits?',
          options: [
            { label: 'Yes, enable auto-accept', value: 'yes' },
            { label: 'No, keep asking', value: 'no' },
          ],
          onSelect: (value) => {
            setConfirmationState(null);
            if (value === 'yes') {
              setAutoAccept(true);
            }
          },
          onCancel: () => setConfirmationState(null),
        });
      }
    }
  });

  // Prepare items for Static (include welcome box as first item)
  const staticItems = messages.length === 0
    ? [{ id: 'welcome', isWelcome: true, role: 'system' as const, content: '', timestamp: new Date() }]
    : messages;

  return (
    <Box flexDirection="column">
      {/* Static chat history with welcome box */}
      <Static items={staticItems}>
        {(item) => {
          if ('isWelcome' in item && item.isWelcome) {
            return <WelcomeBox key="welcome" version={version} mode={mode} />;
          }
          return (
            <ChatMessage
              key={item.id}
              role={item.role}
              agentName={item.agentName}
              content={item.content}
              tokens={item.tokens}
            />
          );
        }}
      </Static>

      {/* Processing indicator */}
      {isProcessing && processingStartTime && (
        <ThinkingIndicator startTime={processingStartTime} />
      )}

      {/* Error display */}
      {error && (
        <Box marginY={1} marginLeft={1}>
          <Text color="#e53e3e">✗ Error: {error}</Text>
        </Box>
      )}

      {/* Input or Confirmation */}
      {confirmationState ? (
        <Confirmation
          message={confirmationState.message}
          options={confirmationState.options}
          onSelect={confirmationState.onSelect}
          onCancel={confirmationState.onCancel}
        />
      ) : (
        <Input
          onSubmit={handleSubmit}
          disabled={isProcessing}
          placeholder='Try "build a password validator"'
        />
      )}

      {/* Status bar with agent boxes */}
      <StatusBar
        mode={mode}
        executionMode={executionMode}
        tokens={totalTokens}
        startTime={startTime}
        isProcessing={isProcessing}
        activeAgent={activeAgent}
        completedAgents={completedAgents}
        autoAccept={autoAccept}
        councilMode={councilMode}
        councilStage={councilStage}
        availableModels={availableModels}
      />
    </Box>
  );
};

function formatElapsed(start: Date): string {
  const secs = Math.floor((Date.now() - start.getTime()) / 1000);
  const mins = Math.floor(secs / 60);
  const remainingSecs = secs % 60;
  return mins > 0 ? `${mins}m ${remainingSecs}s` : `${secs}s`;
}

export default App;

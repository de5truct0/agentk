import React, { useState } from 'react';
import { Box, Text, useApp, useInput, Static } from 'ink';
import { WelcomeBox } from './WelcomeBox.js';
import { ChatMessage } from './ChatMessage.js';
import { Input } from './Input.js';
import { StatusBar } from './StatusBar.js';
import { ThinkingIndicator } from './ThinkingIndicator.js';
import { AgentName } from './AgentPanel.js';
import { runClaude } from '../lib/claude.js';

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
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const [awaitingApproval, setAwaitingApproval] = useState(false);

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

    // Handle approval response
    if (awaitingApproval) {
      // Enter (empty input) = approve
      if (input.trim() === '') {
        setAwaitingApproval(false);
        if (pendingPlan) {
          await executeTask(pendingPlan);
          setPendingPlan(null);
        }
        return;
      } else if (input.toLowerCase() === 'n' || input.toLowerCase() === 'no') {
        setAwaitingApproval(false);
        setPendingPlan(null);
        addSystemMessage('Plan cancelled. What would you like to do instead?');
        return;
      }
      // Any other input cancels and starts new request
      setAwaitingApproval(false);
      setPendingPlan(null);
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    if (executionMode === 'plan') {
      await generatePlan(input);
    } else {
      await executeTask(input);
    }
  };

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

      const result = await runClaude(planPrompt, mode);

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

      setPendingPlan(input);
      setAwaitingApproval(true);
      addSystemMessage('Press Enter to execute, or type "n" to cancel');

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
      const result = await runClaude(input, mode);

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
        setExecutionMode('auto');
        addSystemMessage('Auto mode enabled. I will execute tasks directly without approval.');
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
/exit     - Exit AGENT-K

Keyboard shortcuts:
↑/↓       - Browse command history
Tab       - Autocomplete commands
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
◇ Messages: ${messages.length}
◇ Total Tokens: ${totalTokens}
◇ Active Agent: ${activeAgent || 'None'}
◇ Session Time: ${formatElapsed(startTime)}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, statusMessage]);
        break;
      default:
        setError(`Unknown command: /${command}`);
    }
  };

  // Handle Ctrl+C
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
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

      {/* Input with borders */}
      <Input
        onSubmit={handleSubmit}
        disabled={isProcessing}
        placeholder={awaitingApproval ? "Press Enter to execute, n to cancel" : 'Try "build a password validator"'}
      />

      {/* Status bar with agent boxes */}
      <StatusBar
        mode={mode}
        tokens={totalTokens}
        startTime={startTime}
        isProcessing={isProcessing}
        activeAgent={activeAgent}
        completedAgents={completedAgents}
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

import React, { useState, useEffect, useRef } from 'react';
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
import { QuestionWizard, Question } from './QuestionWizard.js';

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
  // Initialize with welcome message as permanent first item
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    role: 'system',
    content: '',
    timestamp: new Date(),
    isWelcome: true,
  }]);
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
  const [lastEscapeTime, setLastEscapeTime] = useState<number>(0);
  const [showExitHint, setShowExitHint] = useState(false);
  const [questionWizardState, setQuestionWizardState] = useState<{
    questions: Question[];
    originalInput: string;
    onComplete: (answers: { header: string; answer: string }[]) => void;
  } | null>(null);
  const [showCancelHint, setShowCancelHint] = useState(false);

  // Ref to track cancellation (can be checked inside async operations)
  const cancelledRef = useRef(false);

  // Clean orchestrator internal tags from response
  const cleanOrchestratorTags = (response: string): string => {
    let cleaned = response;

    // Remove <thinking>...</thinking> blocks
    cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');

    // Remove <task_analysis>...</task_analysis> blocks (keep content inside)
    cleaned = cleaned.replace(/<\/?task_analysis>/g, '');

    // Remove <response>...</response> tags (keep content inside)
    cleaned = cleaned.replace(/<\/?response>/g, '');

    // Clean up multiple consecutive newlines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Clean up leading/trailing whitespace
    cleaned = cleaned.trim();

    return cleaned;
  };

  // Parse questions from orchestrator response
  const parseQuestions = (response: string): { questions: Question[]; cleanedResponse: string } => {
    const questions: Question[] = [];
    let cleanedResponse = response;

    // Match <question header="...">...</question> blocks
    const questionRegex = /<question\s+header="([^"]+)">\s*([\s\S]*?)\s*<options>\s*([\s\S]*?)\s*<\/options>\s*<\/question>/g;
    let match;

    while ((match = questionRegex.exec(response)) !== null) {
      const header = match[1];
      const questionText = match[2].trim();
      const optionsBlock = match[3];

      // Parse options
      const optionRegex = /<option(?:\s+recommended="true")?>(.*?)<\/option>/g;
      const options: { label: string; recommended?: boolean }[] = [];
      let optionMatch;

      while ((optionMatch = optionRegex.exec(optionsBlock)) !== null) {
        const isRecommended = optionMatch[0].includes('recommended="true"');
        options.push({
          label: optionMatch[1].trim(),
          recommended: isRecommended,
        });
      }

      if (options.length > 0) {
        questions.push({
          header,
          question: questionText,
          options,
        });
      }

      // Remove this question block from the response
      cleanedResponse = cleanedResponse.replace(match[0], '').trim();
    }

    // Clean orchestrator internal tags from the remaining response
    cleanedResponse = cleanOrchestratorTags(cleanedResponse);

    return { questions, cleanedResponse };
  };

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
    cancelledRef.current = false;
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
    cancelledRef.current = false;
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
4. Questions (if any clarification needed - use the XML question format)

Format your response clearly with headers.`;

      const result = await runClaude(planPrompt, mode, autoAccept);

      // Check for questions in response
      const { questions, cleanedResponse } = parseQuestions(result.response);

      const mentioned = detectMentionedAgents(cleanedResponse || result.response);
      setCompletedAgents(['Orchestrator', ...mentioned]);
      setActiveAgent(undefined);

      // Show the cleaned response (without question XML)
      const planMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        agentName: 'Orchestrator',
        content: cleanedResponse || result.response,
        tokens: result.tokens,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, planMessage]);

      if (result.tokens) {
        setTotalTokens(prev => prev + result.tokens.input + result.tokens.output);
      }

      // Stop processing BEFORE showing wizard/confirmation to prevent overlap
      setIsProcessing(false);
      setProcessingStartTime(null);

      // If questions were found, show the wizard
      if (questions.length > 0) {
        setQuestionWizardState({
          questions,
          originalInput: input,
          onComplete: async (answers) => {
            setQuestionWizardState(null);
            // Format answers as follow-up message
            const answerText = answers.map(a => `- ${a.header}: ${a.answer}`).join('\n');
            const followUp = `My answers:\n${answerText}\n\nPlease proceed with these choices.`;

            // Add user message with answers
            const userAnswer: Message = {
              id: Date.now().toString(),
              role: 'user',
              content: followUp,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, userAnswer]);

            // Continue with the task including answers
            await executeTask(`${input}\n\n${followUp}`);
          },
        });
      } else {
        // No questions, show plan approval
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
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsProcessing(false);
      setProcessingStartTime(null);
    }
  };

  // Execute task directly
  const executeTask = async (input: string) => {
    cancelledRef.current = false;
    setIsProcessing(true);
    setProcessingStartTime(new Date());
    setActiveAgent('Orchestrator');
    setCompletedAgents([]);
    setError(null);

    try {
      const result = await runClaude(input, mode, autoAccept);

      // Check for questions in response
      const { questions, cleanedResponse } = parseQuestions(result.response);

      const mentioned = detectMentionedAgents(cleanedResponse || result.response);
      setCompletedAgents(['Orchestrator', ...mentioned]);
      setActiveAgent(undefined);

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        agentName: 'Orchestrator',
        content: cleanedResponse || result.response,
        tokens: result.tokens,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, agentMessage]);

      if (result.tokens) {
        setTotalTokens(prev => prev + result.tokens.input + result.tokens.output);
      }

      // Stop processing BEFORE showing wizard to prevent overlap
      setIsProcessing(false);
      setProcessingStartTime(null);

      // If questions were found, show the wizard
      if (questions.length > 0) {
        setQuestionWizardState({
          questions,
          originalInput: input,
          onComplete: async (answers) => {
            setQuestionWizardState(null);
            // Format answers as follow-up message
            const answerText = answers.map(a => `- ${a.header}: ${a.answer}`).join('\n');
            const followUp = `My answers:\n${answerText}\n\nPlease proceed with these choices.`;

            // Add user message with answers
            const userAnswer: Message = {
              id: Date.now().toString(),
              role: 'user',
              content: followUp,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, userAnswer]);

            // Continue with the task including answers
            await executeTask(`${input}\n\n${followUp}`);
          },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
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
        // Keep welcome message, clear everything else
        setMessages([{
          id: 'welcome',
          role: 'system',
          content: '',
          timestamp: new Date(),
          isWelcome: true,
        }]);
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
Shift+Tab - Toggle auto-edit mode
Esc       - Cancel operation (when processing)
Esc Esc   - Exit (when idle)
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
    // Escape key handling
    if (key.escape) {
      const now = Date.now();

      // If processing, single Esc cancels the operation
      if (isProcessing) {
        cancelledRef.current = true;
        setIsProcessing(false);
        setProcessingStartTime(null);
        setActiveAgent(undefined);
        setCouncilStage(null);
        setShowCancelHint(true);
        setTimeout(() => setShowCancelHint(false), 2000);

        // Add cancellation message
        const cancelMessage: Message = {
          id: Date.now().toString(),
          role: 'system',
          content: '⚠ Operation cancelled',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, cancelMessage]);
        return;
      }

      // Double-escape to exit (like Claude Code)
      if (now - lastEscapeTime < 500) {
        // Double escape - exit
        exit();
      } else {
        // First escape - show hint and record time
        setLastEscapeTime(now);
        if (!questionWizardState && !confirmationState) {
          setShowExitHint(true);
          setTimeout(() => setShowExitHint(false), 1500);
        }
      }
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

  return (
    <Box flexDirection="column">
      {/* Static chat history - welcome is always first item */}
      <Static items={messages}>
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

      {/* Input, Confirmation, or Question Wizard */}
      {questionWizardState ? (
        <QuestionWizard
          key={`wizard-${questionWizardState.questions.map(q => q.header).join('-')}`}
          questions={questionWizardState.questions}
          onComplete={questionWizardState.onComplete}
          onCancel={() => {
            setQuestionWizardState(null);
            addSystemMessage('Questions cancelled.');
          }}
        />
      ) : confirmationState ? (
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
        showExitHint={showExitHint}
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

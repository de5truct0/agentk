import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { icons } from '../themes/retro.js';
import { AgentName } from './AgentPanel.js';

type CouncilMode = 'solo' | 'council' | 'off';

interface StatusBarProps {
  mode: 'dev' | 'ml';
  executionMode: 'plan' | 'auto';
  tokens: number;
  startTime: Date;
  isProcessing?: boolean;
  activeAgent?: AgentName;
  completedAgents?: AgentName[];
  autoAccept?: boolean;
  councilMode?: CouncilMode;
  councilStage?: string | null;
  availableModels?: Record<string, boolean>;
  showExitHint?: boolean;
}

// Theme
const theme = {
  border: '#4a5568',
  accent: '#4fd1c5',
  highlight: '#81e6d9',
  dim: '#718096',
  active: '#f6e05e',
  done: '#48bb78',
};

// Agent icons - matching WelcomeBox symbols
const agentIcons: Record<string, string> = {
  Orchestrator: '*',
  Engineer: '#',
  Tester: '+',
  Security: '!',
  Scout: '@',
  Researcher: '~',
  'ML Engineer': '%',
  'Data Engineer': '&',
  Evaluator: '^',
};

// Model icons for council mode
const modelIcons: Record<string, string> = {
  gpt: 'G',
  gemini: 'M',
  claude: 'C',
};

export const StatusBar: React.FC<StatusBarProps> = ({
  mode,
  executionMode,
  tokens,
  startTime,
  isProcessing = false,
  activeAgent,
  completedAgents = [],
  autoAccept = false,
  councilMode = 'off',
  councilStage = null,
  availableModels = {},
  showExitHint = false,
}) => {
  const [elapsed, setElapsed] = useState('');
  const [spinnerFrame, setSpinnerFrame] = useState(0);
  const [pulseFrame, setPulseFrame] = useState(0);
  const pulseBrackets = ['[', '(', '{', '<', '{', '('];

  useEffect(() => {
    if (!isProcessing) {
      setElapsed('');
      return;
    }
    const interval = setInterval(() => {
      const secs = Math.floor((Date.now() - startTime.getTime()) / 1000);
      const mins = Math.floor(secs / 60);
      const remainingSecs = secs % 60;
      setElapsed(mins > 0 ? `${mins}m ${remainingSecs}s` : `${secs}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, isProcessing]);

  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => {
      setSpinnerFrame(f => (f + 1) % icons.spinner.length);
    }, 100);
    return () => clearInterval(interval);
  }, [isProcessing]);

  // Pulse animation for active agent
  useEffect(() => {
    if (!activeAgent) return;
    const interval = setInterval(() => {
      setPulseFrame(f => (f + 1) % pulseBrackets.length);
    }, 200);
    return () => clearInterval(interval);
  }, [activeAgent]);

  const formatTokens = (t: number): string => {
    if (t >= 1000000) return `${(t / 1000000).toFixed(1)}M`;
    if (t >= 1000) return `${(t / 1000).toFixed(1)}k`;
    return t.toString();
  };

  const modeLabel = mode === 'dev' ? 'DEV' : 'ML';

  // Get agents for this mode
  const modeAgents = mode === 'dev'
    ? ['Orchestrator', 'Engineer', 'Tester', 'Security']
    : ['Orchestrator', 'Researcher', 'ML Engineer', 'Evaluator'];

  const getAgentColor = (agent: string): string => {
    if (activeAgent === agent) return theme.active;
    if (completedAgents.includes(agent as AgentName)) return theme.done;
    return theme.dim;
  };

  // Get stage label for council mode
  const getStageLabel = () => {
    if (!councilStage) return null;
    const stages: Record<string, string> = {
      'scout': 'Scout',
      'stage1': '1/3',
      'stage2': '2/3',
      'stage3': '3/3',
    };
    return stages[councilStage] || councilStage;
  };

  return (
    <Box flexDirection="row" justifyContent="space-between" width="100%">
      {/* Left side content */}
      <Box>
        <Text color={theme.dim}>  </Text>
        <Text color={theme.accent}>{modeLabel}</Text>
        <Text color={theme.border}> │ </Text>

        {/* Council mode: show model boxes */}
        {councilMode !== 'off' ? (
          <>
            {Object.entries(modelIcons).map(([model, icon], i) => {
              const isAvailable = availableModels[model];
              const color = isAvailable ? theme.done : theme.dim;
              return (
                <React.Fragment key={model}>
                  <Text color={color}>[</Text>
                  <Text color={color}>{icon}</Text>
                  <Text color={color}>]</Text>
                  {i < Object.keys(modelIcons).length - 1 && <Text color={theme.dim}> </Text>}
                </React.Fragment>
              );
            })}
            {councilStage && (
              <>
                <Text color={theme.border}> │ </Text>
                <Text color={theme.active}>Stage {getStageLabel()}</Text>
              </>
            )}
          </>
        ) : (
          /* Agent boxes (standard mode) */
          modeAgents.map((agent, i) => {
            const isActive = activeAgent === agent;
            const leftBracket = isActive ? pulseBrackets[pulseFrame] : '[';
            const rightBracket = isActive ? pulseBrackets[(pulseFrame + 3) % pulseBrackets.length] === '<' ? '>' : pulseBrackets[(pulseFrame + 3) % pulseBrackets.length] === '{' ? '}' : pulseBrackets[(pulseFrame + 3) % pulseBrackets.length] === '(' ? ')' : ']' : ']';
            return (
              <React.Fragment key={agent}>
                <Text color={getAgentColor(agent)}>{leftBracket}</Text>
                <Text color={getAgentColor(agent)}>{agentIcons[agent]}</Text>
                <Text color={getAgentColor(agent)}>{rightBracket}</Text>
                {i < modeAgents.length - 1 && <Text color={theme.dim}> </Text>}
              </React.Fragment>
            );
          })
        )}

        <Text color={theme.border}> │ </Text>
        <Text color={theme.dim}>? help</Text>

        {councilMode !== 'off' && (
          <>
            <Text color={theme.border}> │ </Text>
            <Text color={theme.highlight}>{councilMode === 'council' ? 'COUNCIL' : 'SOLO'}</Text>
          </>
        )}

        {executionMode === 'auto' && (
          <>
            <Text color={theme.border}> │ </Text>
            <Text color={theme.active}>AUTO-EXEC</Text>
          </>
        )}

        {autoAccept && (
          <>
            <Text color={theme.border}> │ </Text>
            <Text color={theme.active}>AUTO-EDIT</Text>
          </>
        )}

        {isProcessing && (
          <>
            <Text color={theme.border}> │ </Text>
            <Text color={theme.highlight}>{icons.spinner[spinnerFrame]}</Text>
          </>
        )}

        {elapsed && (
          <>
            <Text color={theme.border}> │ </Text>
            <Text color={theme.dim}>{elapsed}</Text>
          </>
        )}
      </Box>

      {/* Right side - exit hint + tokens */}
      <Box>
        {showExitHint && (
          <>
            <Text color={theme.dim}>Press Esc again to exit</Text>
            <Text color={theme.border}> │ </Text>
          </>
        )}
        <Text color={theme.accent}>↑ {formatTokens(tokens)}</Text>
        <Text color={theme.dim}> tokens </Text>
      </Box>
    </Box>
  );
};

export default StatusBar;

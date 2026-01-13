import React from 'react';
import { Box, Text } from 'ink';

export type AgentName = 'Orchestrator' | 'Engineer' | 'Tester' | 'Security' | 'Scout' | 'Researcher' | 'ML Engineer' | 'Data Engineer' | 'Evaluator';
export type AgentState = 'idle' | 'thinking' | 'working' | 'done';

interface Agent {
  name: AgentName;
  state: AgentState;
}

interface AgentStatusProps {
  agents: Agent[];
  mode: 'dev' | 'ml';
}

const theme = {
  accent: '#4fd1c5',
  highlight: '#81e6d9',
  dim: '#4a5568',
  border: '#2d3748',
  success: '#48bb78',
  warning: '#ecc94b',
};

const agentIcons: Record<AgentName, string> = {
  Orchestrator: '◆',
  Engineer: '⚙',
  Tester: '✓',
  Security: '⛨',
  Scout: '◎',
  Researcher: '◈',
  'ML Engineer': '⬡',
  'Data Engineer': '⬢',
  Evaluator: '◉',
};

const stateColors: Record<AgentState, string> = {
  idle: theme.dim,
  thinking: theme.warning,
  working: theme.accent,
  done: theme.success,
};

const stateIndicators: Record<AgentState, string> = {
  idle: '○',
  thinking: '◐',
  working: '●',
  done: '✓',
};

export const AgentStatus: React.FC<AgentStatusProps> = ({ agents, mode }) => {
  if (agents.length === 0) return null;

  return (
    <Box flexDirection="column" marginY={1} marginLeft={2}>
      <Box marginBottom={1}>
        <Text color={theme.dim}>┌─ </Text>
        <Text color={theme.accent}>Active Agents</Text>
        <Text color={theme.dim}> ─────────────────────</Text>
      </Box>

      {agents.map((agent, i) => (
        <Box key={agent.name} marginLeft={1}>
          <Text color={theme.dim}>│ </Text>
          <Text color={stateColors[agent.state]}>{stateIndicators[agent.state]} </Text>
          <Text color={theme.highlight}>{agentIcons[agent.name]} </Text>
          <Text color={agent.state === 'idle' ? theme.dim : theme.highlight}>
            {agent.name}
          </Text>
          {agent.state !== 'idle' && agent.state !== 'done' && (
            <Text color={theme.dim}> {agent.state}...</Text>
          )}
        </Box>
      ))}

      <Box marginTop={1}>
        <Text color={theme.dim}>└─────────────────────────────</Text>
      </Box>
    </Box>
  );
};

export default AgentStatus;

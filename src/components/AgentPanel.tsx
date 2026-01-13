import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

export type AgentName = 'Orchestrator' | 'Engineer' | 'Tester' | 'Security' | 'Scout' | 'Researcher' | 'ML Engineer' | 'Data Engineer' | 'Evaluator';
export type AgentState = 'idle' | 'active' | 'done';

interface AgentPanelProps {
  mode: 'dev' | 'ml';
  activeAgent?: AgentName;
  completedAgents: AgentName[];
}

const theme = {
  border: '#2d3748',
  accent: '#4fd1c5',
  highlight: '#81e6d9',
  dim: '#4a5568',
  success: '#48bb78',
  active: '#f6e05e',
};

// Animated border characters
const borderFrames = ['◢', '◣', '◤', '◥'];
const pulseChars = ['░', '▒', '▓', '█', '▓', '▒'];

interface AgentBoxProps {
  name: string;
  icon: string;
  state: AgentState;
  width: number;
}

const AgentBox: React.FC<AgentBoxProps> = ({ name, icon, state, width }) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (state !== 'active') return;
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % borderFrames.length);
    }, 150);
    return () => clearInterval(interval);
  }, [state]);

  const borderColor = state === 'active' ? theme.active : state === 'done' ? theme.success : theme.border;
  const textColor = state === 'active' ? theme.highlight : state === 'done' ? theme.success : theme.dim;
  const corner = state === 'active' ? borderFrames[frame] : state === 'done' ? '✓' : '○';

  const innerWidth = width - 4;
  const paddedName = name.length > innerWidth ? name.slice(0, innerWidth) : name.padEnd(innerWidth);

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={borderColor}>{corner}</Text>
        <Text color={borderColor}>{'─'.repeat(width - 2)}</Text>
        <Text color={borderColor}>{corner}</Text>
      </Box>
      <Box>
        <Text color={borderColor}>│</Text>
        <Text color={textColor}> {icon} </Text>
        <Text color={textColor}>{paddedName}</Text>
        <Text color={borderColor}>│</Text>
      </Box>
      <Box>
        <Text color={borderColor}>{state === 'active' ? borderFrames[(frame + 2) % 4] : '└'}</Text>
        <Text color={borderColor}>{'─'.repeat(width - 2)}</Text>
        <Text color={borderColor}>{state === 'active' ? borderFrames[(frame + 2) % 4] : '┘'}</Text>
      </Box>
    </Box>
  );
};

export const AgentPanel: React.FC<AgentPanelProps> = ({ mode, activeAgent, completedAgents }) => {
  const devAgents: { name: AgentName; icon: string }[] = [
    { name: 'Orchestrator', icon: '◆' },
    { name: 'Engineer', icon: '⚙' },
    { name: 'Tester', icon: '✓' },
    { name: 'Security', icon: '⛨' },
  ];

  const mlAgents: { name: AgentName; icon: string }[] = [
    { name: 'Orchestrator', icon: '◆' },
    { name: 'Researcher', icon: '◈' },
    { name: 'ML Engineer', icon: '⬡' },
    { name: 'Evaluator', icon: '◉' },
  ];

  const agents = mode === 'dev' ? devAgents : mlAgents;
  const boxWidth = 16;

  const getState = (name: AgentName): AgentState => {
    if (activeAgent === name) return 'active';
    if (completedAgents.includes(name)) return 'done';
    return 'idle';
  };

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box justifyContent="center">
        <Text color={theme.dim}>─── </Text>
        <Text color={theme.accent}>Agents</Text>
        <Text color={theme.dim}> ───</Text>
      </Box>
      <Box justifyContent="center" marginTop={1}>
        {agents.map((agent, i) => (
          <Box key={agent.name} marginRight={i < agents.length - 1 ? 1 : 0}>
            <AgentBox
              name={agent.name}
              icon={agent.icon}
              state={getState(agent.name)}
              width={boxWidth}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default AgentPanel;

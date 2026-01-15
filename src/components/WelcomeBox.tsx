import React from 'react';
import { Box, Text } from 'ink';

interface WelcomeBoxProps {
  version: string;
  mode: 'dev' | 'ml';
}

const theme = {
  border: '#2d3748',    // gray-800
  accent: '#a0aec0',    // gray-400
  highlight: '#e2e8f0', // gray-200
  dim: '#718096',
  text: '#cbd5e0',
  title: '#718096',     // gray-500
  c1: '#a0aec0',       // gray-400
  c2: '#4a5568',       // gray-700
  c3: '#63b3ed',       // blue-400 (eye)
};

export const WelcomeBox: React.FC<WelcomeBoxProps> = ({ version, mode }) => {
  const termWidth = Math.min(process.stdout.columns || 120, 120);
  const boxWidth = termWidth - 4;
  const leftWidth = Math.floor(boxWidth * 0.55);
  const rightWidth = boxWidth - leftWidth - 1;

  const modeLabel = mode === 'dev' ? 'Software Development' : 'ML Research';

  // Agent icons matching StatusBar
  const agentIcons: Record<string, string> = {
    Orchestrator: '*',
    Engineer: '#',
    Tester: '+',
    Security: '!',
    Researcher: '~',
    'ML Engineer': '%',
    Evaluator: '^',
  };

  const agents = mode === 'dev'
    ? ['Orchestrator', 'Engineer', 'Tester', 'Security']
    : ['Orchestrator', 'Researcher', 'ML Engineer', 'Evaluator'];

  // Title bar
  const titleText = ` AGENT-K v${version} `;
  const titlePadLeft = Math.floor((boxWidth - titleText.length) / 2);
  const titlePadRight = boxWidth - titleText.length - titlePadLeft;

  return (
    <Box flexDirection="column" marginY={1}>
      {/* Top border with title */}
      <Box>
        <Text color={theme.border}>╭</Text>
        <Text color={theme.border}>{'─'.repeat(titlePadLeft)}</Text>
        <Text color={theme.title} bold>{titleText}</Text>
        <Text color={theme.border}>{'─'.repeat(titlePadRight)}</Text>
        <Text color={theme.border}>╮</Text>
      </Box>

      {/* Content Area */}
      <Box flexDirection="row">
        <Text color={theme.border}>│</Text>

        {/* Left Column: Wolf Art - "Strength of the Pack" */}
        <Box width={leftWidth} justifyContent="center" alignItems="center" flexDirection="column">
          <Text color={theme.c1}>
            {`
 ___________________        ____....-----....____
(________________LL_)   ==============================
    ______\\   \\_______.--'.  \`---..._____...---'
    \`-------..__            \` ,/
                \`-._ -  -  - |
                    \`-------'`}
          </Text>
        </Box>

        <Text color={theme.border}>│</Text>

        {/* Right Column: Info */}
        <Box width={rightWidth} flexDirection="column" justifyContent="center" paddingLeft={2}>
          <Box marginBottom={1}>
            <Text color={theme.text}>Welcome to </Text>
            <Text color={theme.accent} bold>AGENT-K</Text>
          </Box>
          <Text color={theme.dim}>Pack Intelligence System</Text>
          <Box marginTop={1}>
            <Text color={theme.dim}>Mode: </Text>
            <Text color={theme.highlight}>{modeLabel}</Text>
          </Box>
        </Box>

        <Text color={theme.border}>│</Text>
      </Box>

      {/* Empty row */}
      <Box>
        <Text color={theme.border}>│</Text>
        <Text>{' '.repeat(boxWidth)}</Text>
        <Text color={theme.border}>│</Text>
      </Box>

      {/* Agent display */}
      <Box>
        <Text color={theme.border}>│</Text>
        <Box width={boxWidth} justifyContent="center">
          {agents.map((agent, i) => (
            <React.Fragment key={agent}>
              <Text color={theme.accent}>[{agentIcons[agent]}] </Text>
              <Text color={theme.text}>{agent}</Text>
              {i < agents.length - 1 && <Text color={theme.dim}>  ·  </Text>}
            </React.Fragment>
          ))}
        </Box>
        <Text color={theme.border}>│</Text>
      </Box>

      {/* Empty row */}
      <Box>
        <Text color={theme.border}>│</Text>
        <Text>{' '.repeat(boxWidth)}</Text>
        <Text color={theme.border}>│</Text>
      </Box>

      {/* Hints */}
      <Box>
        <Text color={theme.border}>│</Text>
        <Box width={boxWidth} justifyContent="center">
          <Text color={theme.dim}>/help for commands  ·  /plan or /auto to set mode  ·  Esc Esc to exit</Text>
        </Box>
        <Text color={theme.border}>│</Text>
      </Box>

      {/* Bottom border */}
      <Box>
        <Text color={theme.border}>╰</Text>
        <Text color={theme.border}>{'─'.repeat(boxWidth)}</Text>
        <Text color={theme.border}>╯</Text>
      </Box>
    </Box>
  );
};

export default WelcomeBox;

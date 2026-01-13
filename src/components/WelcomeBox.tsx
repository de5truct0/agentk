import React from 'react';
import { Box, Text } from 'ink';

interface WelcomeBoxProps {
  version: string;
  mode: 'dev' | 'ml';
}

const theme = {
  border: '#4a5568',
  accent: '#4fd1c5',
  highlight: '#81e6d9',
  dim: '#718096',
  text: '#e2e8f0',
  title: '#f6e05e',
};

export const WelcomeBox: React.FC<WelcomeBoxProps> = ({ version, mode }) => {
  const termWidth = Math.min(process.stdout.columns || 120, 120);
  const boxWidth = termWidth - 4;
  const leftWidth = Math.floor(boxWidth * 0.45);
  const rightWidth = boxWidth - leftWidth - 3;

  const modeLabel = mode === 'dev' ? 'Software Development' : 'ML Research';
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
        <Text color={theme.border}>{'─'.repeat(titlePadLeft - 1)}</Text>
        <Text color={theme.title} bold>{titleText}</Text>
        <Text color={theme.border}>{'─'.repeat(titlePadRight - 1)}</Text>
        <Text color={theme.border}>╮</Text>
      </Box>

      {/* Content rows */}
      <Box>
        <Text color={theme.border}>│</Text>
        <Text>{' '.repeat(boxWidth)}</Text>
        <Text color={theme.border}>│</Text>
      </Box>

      {/* Tiger ASCII art row 1 */}
      <Box>
        <Text color={theme.border}>│</Text>
        <Box width={leftWidth} justifyContent="center">
          <Text color={theme.accent}>  /\_/\  </Text>
        </Box>
        <Text color={theme.border}>│</Text>
        <Box width={rightWidth} paddingLeft={1}>
          <Text color={theme.text}>Welcome to </Text>
          <Text color={theme.accent} bold>AGENT-K</Text>
        </Box>
        <Text color={theme.border}>│</Text>
      </Box>

      {/* Tiger ASCII art row 2 */}
      <Box>
        <Text color={theme.border}>│</Text>
        <Box width={leftWidth} justifyContent="center">
          <Text color={theme.accent}> ( o.o ) </Text>
        </Box>
        <Text color={theme.border}>│</Text>
        <Box width={rightWidth} paddingLeft={1}>
          <Text color={theme.dim}>Multi-Agent Intelligence System</Text>
        </Box>
        <Text color={theme.border}>│</Text>
      </Box>

      {/* Tiger ASCII art row 3 */}
      <Box>
        <Text color={theme.border}>│</Text>
        <Box width={leftWidth} justifyContent="center">
          <Text color={theme.accent}>  {'>'}  {'<'}  </Text>
        </Box>
        <Text color={theme.border}>│</Text>
        <Box width={rightWidth} paddingLeft={1}>
          <Text color={theme.dim}>Mode: </Text>
          <Text color={theme.highlight}>{modeLabel}</Text>
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
              <Text color={theme.accent}>◆ </Text>
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
          <Text color={theme.dim}>/help for commands  ·  /plan or /auto to set mode  ·  Ctrl+C to exit</Text>
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

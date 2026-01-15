import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

interface ThinkingIndicatorProps {
  startTime: Date;
  tokens?: number;
}

// Sophisticated theme
const theme = {
  accent: '#4fd1c5',
  highlight: '#81e6d9',
  dim: '#4a5568',
  purple: '#9f7aea',
};

// Fun processing verbs
const verbs = [
  'Contemplating',
  'Synthesizing',
  'Analyzing',
  'Processing',
  'Computing',
  'Reasoning',
  'Deliberating',
  'Pondering',
  'Evaluating',
  'Formulating',
];

// Smooth braille spinner - the classic elegant choice
const symbols = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'];

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  startTime,
  tokens = 0,
}) => {
  const [elapsed, setElapsed] = useState('0s');
  const [frame, setFrame] = useState(0);
  const [verb] = useState(() => verbs[Math.floor(Math.random() * verbs.length)]);

  // Update elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      const secs = Math.floor((Date.now() - startTime.getTime()) / 1000);
      const mins = Math.floor(secs / 60);
      const remainingSecs = secs % 60;
      if (mins > 0) {
        setElapsed(`${mins}m ${remainingSecs}s`);
      } else {
        setElapsed(`${secs}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Animate symbol
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % symbols.length);
    }, 120);
    return () => clearInterval(interval);
  }, []);

  const formatTokens = (t: number): string => {
    if (t >= 1000) return `${(t / 1000).toFixed(1)}k`;
    return t.toString();
  };

  return (
    <Box marginY={1} marginLeft={1}>
      <Text color={theme.purple} bold>{symbols[frame]} </Text>
      <Text color={theme.highlight} italic>{verb}…</Text>
      <Text color={theme.dim}> (</Text>
      <Text color={theme.dim}>Esc to cancel</Text>
      <Text color={theme.dim}> · </Text>
      <Text color={theme.accent}>{elapsed}</Text>
      {tokens > 0 && (
        <>
          <Text color={theme.dim}> · </Text>
          <Text color={theme.accent}>↓ {formatTokens(tokens)}</Text>
          <Text color={theme.dim}> tokens</Text>
        </>
      )}
      <Text color={theme.dim}> · </Text>
      <Text color={theme.purple}>thinking</Text>
      <Text color={theme.dim}>)</Text>
    </Box>
  );
};

export default ThinkingIndicator;

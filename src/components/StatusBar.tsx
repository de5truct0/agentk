import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { icons } from '../themes/retro.js';

interface StatusBarProps {
  mode: 'dev' | 'ml';
  tokens: number;
  startTime: Date;
  isProcessing?: boolean;
}

// Matching sophisticated theme
const theme = {
  border: '#2d3748',
  accent: '#4fd1c5',
  highlight: '#81e6d9',
  dim: '#4a5568',
  glow: '#319795',
};

export const StatusBar: React.FC<StatusBarProps> = ({
  mode,
  tokens,
  startTime,
  isProcessing = false,
}) => {
  const [elapsed, setElapsed] = useState('0s');
  const [spinnerFrame, setSpinnerFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const secs = Math.floor((Date.now() - startTime.getTime()) / 1000);
      const mins = Math.floor(secs / 60);
      const remainingSecs = secs % 60;
      setElapsed(mins > 0 ? `${mins}m ${remainingSecs}s` : `${secs}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => {
      setSpinnerFrame(f => (f + 1) % icons.spinner.length);
    }, 100);
    return () => clearInterval(interval);
  }, [isProcessing]);

  const formatTokens = (t: number): string => {
    if (t >= 1000000) return `${(t / 1000000).toFixed(1)}M`;
    if (t >= 1000) return `${(t / 1000).toFixed(1)}k`;
    return t.toString();
  };

  const modeLabel = mode === 'dev' ? 'DEV' : 'ML';
  const termWidth = process.stdout.columns || 80;

  return (
    <Box flexDirection="column">
      <Text color={theme.border}>{'─'.repeat(termWidth)}</Text>
      <Box justifyContent="space-between" width={termWidth}>
        <Box>
          <Text color={theme.dim}>{'  ◇ '}</Text>
          <Text color={theme.accent}>{modeLabel}</Text>
          <Text color={theme.border}>{' │ '}</Text>
          <Text color={theme.dim}>/help</Text>
          {isProcessing && (
            <>
              <Text color={theme.border}>{' │ '}</Text>
              <Text color={theme.highlight}>{icons.spinner[spinnerFrame]}</Text>
            </>
          )}
        </Box>
        <Box>
          <Text color={theme.dim}>{elapsed}</Text>
          <Text color={theme.border}>{' │ '}</Text>
          <Text color={theme.accent}>↑ {formatTokens(tokens)}</Text>
          <Text color={theme.dim}>{' tokens  '}</Text>
        </Box>
      </Box>
    </Box>
  );
};

export default StatusBar;

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { colors, icons, box } from '../themes/retro.js';

interface StatusBarProps {
  mode: 'dev' | 'ml';
  tokens: number;
  startTime: Date;
  isProcessing?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  mode,
  tokens,
  startTime,
  isProcessing = false,
}) => {
  const [elapsed, setElapsed] = useState('0s');
  const [spinnerFrame, setSpinnerFrame] = useState(0);

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      const secs = Math.floor((Date.now() - startTime.getTime()) / 1000);
      const mins = Math.floor(secs / 60);
      const remainingSecs = secs % 60;
      setElapsed(mins > 0 ? `${mins}m ${remainingSecs}s` : `${secs}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Spinner animation
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

  const modeIcon = mode === 'dev' ? icons.lightning : icons.brain;
  const modeLabel = mode === 'dev' ? 'Development' : 'ML Research';

  const termWidth = process.stdout.columns || 80;
  const barWidth = Math.min(termWidth - 2, 78);

  return (
    <Box flexDirection="column">
      <Text color={colors.dim}>
        {box.horizontal.repeat(barWidth)}
      </Text>
      <Box justifyContent="space-between" width={barWidth}>
        <Text>
          <Text color={colors.secondary}>{modeIcon} {modeLabel}</Text>
          <Text dimColor> │ </Text>
          <Text dimColor>/help for commands</Text>
        </Text>
        <Text>
          {isProcessing && (
            <Text color={colors.warning}>{icons.spinner[spinnerFrame]} </Text>
          )}
          <Text dimColor>{elapsed} │ </Text>
          <Text color={colors.primary}>↑ {formatTokens(tokens)} tokens</Text>
        </Text>
      </Box>
    </Box>
  );
};

export default StatusBar;

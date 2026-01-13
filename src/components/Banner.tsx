import React from 'react';
import { Box, Text } from 'ink';

interface BannerProps {
  version: string;
}

// Sophisticated dark palette
const theme = {
  border: '#2d3748',      // Slate gray
  accent: '#4fd1c5',      // Teal
  highlight: '#81e6d9',   // Light teal
  text: '#e2e8f0',        // Light gray
  dim: '#4a5568',         // Medium gray
  glow: '#319795',        // Deep teal
};

export const Banner: React.FC<BannerProps> = ({ version }) => {
  const termWidth = process.stdout.columns || 80;
  const w = termWidth;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Minimal top accent */}
      <Box>
        <Text color={theme.glow}>{'▁'.repeat(w)}</Text>
      </Box>

      {/* Main content area */}
      <Box>
        <Text color={theme.border}>{'  '}</Text>
        <Text color={theme.dim}>{'◇'}</Text>
        <Text color={theme.border}>{' ─── '}</Text>
        <Text color={theme.highlight} bold>AGENT</Text>
        <Text color={theme.accent} bold>-</Text>
        <Text color={theme.highlight} bold>K</Text>
        <Text color={theme.border}>{' ─── '}</Text>
        <Text color={theme.dim}>{'◇'}</Text>
        <Text color={theme.border}>{' ─ '}</Text>
        <Text color={theme.dim} italic>{w >= 80 ? 'Multi-Agent Intelligence System' : 'Multi-Agent System'}</Text>
        <Text color={theme.border}>{' ─'.repeat(Math.max(1, Math.floor((w - (w >= 80 ? 58 : 48)) / 2)))}</Text>
        <Text color={theme.dim}> v{version}</Text>
      </Box>

      {/* Subtle bottom line */}
      <Box>
        <Text color={theme.border}>{'─'.repeat(w)}</Text>
      </Box>
    </Box>
  );
};

export default Banner;

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

  // Calculate widths properly
  const tagline = 'Multi-Agent System';
  const versionStr = ` v${version}`;
  const prefixLen = 25;
  const usedWidth = prefixLen + tagline.length + versionStr.length;
  const remainingSpace = Math.max(0, w - usedWidth - 2);
  const dashes = remainingSpace > 0 ? ' ' + '─'.repeat(remainingSpace) + ' ' : ' ';

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
        <Text color={theme.dim} italic>{tagline}</Text>
        <Text color={theme.border}>{dashes}</Text>
        <Text color={theme.dim}>{versionStr}</Text>
      </Box>

      {/* Subtle bottom line */}
      <Box>
        <Text color={theme.border}>{'─'.repeat(w)}</Text>
      </Box>
    </Box>
  );
};

export default Banner;

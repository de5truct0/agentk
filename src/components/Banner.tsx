import React from 'react';
import { Box, Text } from 'ink';
import { colors, boxDouble, icons } from '../themes/retro.js';

interface BannerProps {
  version: string;
}

export const Banner: React.FC<BannerProps> = ({ version }) => {
  const termWidth = process.stdout.columns || 80;
  const bannerWidth = Math.min(termWidth - 2, 50);
  const innerWidth = bannerWidth - 2;

  const title = `${icons.star}  A G E N T - K  ${icons.star}`;
  const subtitle = 'Multi-Agent Claude Code Suite';
  const versionText = `v${version}`;

  const centerPad = (text: string, width: number): string => {
    const pad = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(pad) + text + ' '.repeat(width - pad - text.length);
  };

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={colors.secondary}>
        {boxDouble.topLeft}{boxDouble.horizontal.repeat(innerWidth)}{boxDouble.topRight}
      </Text>
      <Text color={colors.secondary}>
        {boxDouble.vertical}
        <Text bold color={colors.primary}>{centerPad(title, innerWidth)}</Text>
        {boxDouble.vertical}
      </Text>
      <Text color={colors.secondary}>
        {boxDouble.vertical}
        <Text dimColor>{centerPad(subtitle, innerWidth)}</Text>
        {boxDouble.vertical}
      </Text>
      <Text color={colors.secondary}>
        {boxDouble.vertical}
        <Text dimColor>{centerPad(versionText, innerWidth)}</Text>
        {boxDouble.vertical}
      </Text>
      <Text color={colors.secondary}>
        {boxDouble.bottomLeft}{boxDouble.horizontal.repeat(innerWidth)}{boxDouble.bottomRight}
      </Text>
    </Box>
  );
};

export default Banner;

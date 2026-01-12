import React from 'react';
import { Box, Text } from 'ink';
import { box, colors, icons } from '../themes/retro.js';

interface ChatMessageProps {
  role: 'user' | 'agent';
  agentName?: string;
  content: string;
  tokens?: { input: number; output: number };
  timestamp?: Date;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  role,
  agentName = 'Agent',
  content,
  tokens,
  timestamp,
}) => {
  const isUser = role === 'user';
  const color = isUser ? colors.primary : colors.secondary;
  const title = isUser ? 'You' : agentName;

  const termWidth = process.stdout.columns || 80;
  const boxWidth = Math.min(termWidth - 2, 78);
  const contentWidth = boxWidth - 4;

  // Word wrap content
  const lines = wrapText(content, contentWidth);

  const titleText = ` ${title} `;
  const topLineWidth = boxWidth - 2 - titleText.length;

  return (
    <Box flexDirection="column" marginY={1}>
      {/* Top border with title */}
      <Text color={color}>
        {box.topLeft}{box.horizontal}
        <Text bold>{titleText}</Text>
        {box.horizontal.repeat(Math.max(0, topLineWidth))}
        {box.topRight}
      </Text>

      {/* Content lines */}
      {lines.map((line, i) => (
        <Text key={i} color={color}>
          {box.vertical} <Text color="white">{line.padEnd(contentWidth)}</Text> {box.vertical}
        </Text>
      ))}

      {/* Token info for agent messages */}
      {tokens && tokens.input + tokens.output > 0 && (
        <Text color={color}>
          {box.vertical} <Text dimColor>{icons.arrow} {tokens.input + tokens.output} tokens (in: {tokens.input}, out: {tokens.output})</Text>
          {' '.repeat(Math.max(0, contentWidth - 40))} {box.vertical}
        </Text>
      )}

      {/* Bottom border */}
      <Text color={color}>
        {box.bottomLeft}{box.horizontal.repeat(boxWidth - 2)}{box.bottomRight}
      </Text>
    </Box>
  );
};

// Simple word wrap function
function wrapText(text: string, width: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const para of paragraphs) {
    if (para.length <= width) {
      lines.push(para);
    } else {
      const words = para.split(' ');
      let currentLine = '';

      for (const word of words) {
        if ((currentLine + ' ' + word).trim().length <= width) {
          currentLine = (currentLine + ' ' + word).trim();
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);
    }
  }

  return lines.length > 0 ? lines : [''];
}

export default ChatMessage;

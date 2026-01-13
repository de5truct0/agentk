import React from 'react';
import { Box, Text } from 'ink';

interface ChatMessageProps {
  role: 'user' | 'agent' | 'system';
  agentName?: string;
  content: string;
  tokens?: { input: number; output: number };
  timestamp?: Date;
}

// Sophisticated theme
const theme = {
  border: '#2d3748',
  accent: '#4fd1c5',
  highlight: '#81e6d9',
  text: '#e2e8f0',
  dim: '#4a5568',
  user: '#9f7aea',      // Purple for user
  agent: '#4fd1c5',     // Teal for agent
  system: '#f6e05e',    // Yellow for system
};

export const ChatMessage: React.FC<ChatMessageProps> = ({
  role,
  agentName = 'Agent',
  content,
  tokens,
}) => {
  const isUser = role === 'user';
  const isSystem = role === 'system';
  const symbolColor = isUser ? theme.user : isSystem ? theme.system : theme.agent;
  const title = isUser ? 'You' : agentName;

  const termWidth = process.stdout.columns || 80;
  const contentWidth = termWidth - 6;

  const lines = wrapText(content, contentWidth);

  return (
    <Box flexDirection="column" marginY={1} marginLeft={1}>
      {/* Symbol and title */}
      <Box>
        <Text color={symbolColor}>{'◆ '}</Text>
        <Text color={symbolColor} bold>{title}</Text>
      </Box>

      {/* Content */}
      <Box flexDirection="column" marginLeft={2}>
        {lines.map((line, i) => (
          <Text key={i} color={theme.text}>{line}</Text>
        ))}
      </Box>

      {/* Token info */}
      {tokens && tokens.input + tokens.output > 0 && (
        <Box marginLeft={2}>
          <Text color={theme.dim}>
            → {tokens.input + tokens.output} tokens
          </Text>
        </Box>
      )}
    </Box>
  );
};

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

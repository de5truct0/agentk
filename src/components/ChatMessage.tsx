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
  code: '#f6ad55',      // Orange for inline code
  header: '#63b3ed',    // Blue for headers
};

// Pre-process text to remove orphaned markdown markers
function cleanOrphanedMarkers(text: string): string {
  let result = text;

  // Remove orphaned ** (bold markers without pairs)
  // Count ** occurrences - if odd, the last one is orphaned
  const boldMatches = result.match(/\*\*/g);
  if (boldMatches && boldMatches.length % 2 !== 0) {
    // Find and remove the last unmatched **
    const lastIndex = result.lastIndexOf('**');
    result = result.slice(0, lastIndex) + result.slice(lastIndex + 2);
  }

  // Also handle case where ** appears at start or end without content
  result = result.replace(/^\*\*\s*$/, '');
  result = result.replace(/^\*\*(?!\S)/, '');
  result = result.replace(/(?<!\S)\*\*$/, '');

  return result;
}

// Parse inline markdown and return React elements
function parseInlineMarkdown(text: string, defaultColor: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  // Clean orphaned markers first
  let remaining = cleanOrphanedMarkers(text);
  let key = 0;

  while (remaining.length > 0) {
    // Check for bold **text**
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      elements.push(<Text key={key++} color={defaultColor} bold>{boldMatch[1]}</Text>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Check for inline code `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      elements.push(<Text key={key++} color={theme.code}>{codeMatch[1]}</Text>);
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Check for italic *text* or _text_
    const italicMatch = remaining.match(/^(\*|_)([^*_]+)\1/);
    if (italicMatch) {
      elements.push(<Text key={key++} color={defaultColor} italic>{italicMatch[2]}</Text>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Find next special character
    const nextSpecial = remaining.search(/[\*`_]/);
    if (nextSpecial === -1) {
      // No more special chars, add rest as plain text
      elements.push(<Text key={key++} color={defaultColor}>{remaining}</Text>);
      break;
    } else if (nextSpecial === 0) {
      // Special char at start but didn't match pattern - skip marker silently
      // Check if it's a double asterisk that didn't match
      if (remaining.startsWith('**')) {
        remaining = remaining.slice(2);
      } else {
        remaining = remaining.slice(1);
      }
    } else {
      // Add text before special char
      elements.push(<Text key={key++} color={defaultColor}>{remaining.slice(0, nextSpecial)}</Text>);
      remaining = remaining.slice(nextSpecial);
    }
  }

  return elements;
}

// Render a single line with markdown formatting
function renderLine(line: string, index: number, defaultColor: string): React.ReactNode {
  // Header detection (## Header)
  const headerMatch = line.match(/^(#{1,3})\s+(.+)$/);
  if (headerMatch) {
    const level = headerMatch[1].length;
    const content = headerMatch[2];
    return (
      <Box key={index}>
        <Text color={theme.header} bold>{content}</Text>
      </Box>
    );
  }

  // List item detection (- item or * item)
  const listMatch = line.match(/^(\s*)([-*])\s+(.+)$/);
  if (listMatch) {
    const indent = listMatch[1];
    const content = listMatch[3];
    return (
      <Box key={index}>
        <Text color={defaultColor}>{indent}• </Text>
        {parseInlineMarkdown(content, defaultColor)}
      </Box>
    );
  }

  // Numbered list detection (1. item)
  const numberedMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
  if (numberedMatch) {
    const indent = numberedMatch[1];
    const num = numberedMatch[2];
    const content = numberedMatch[3];
    return (
      <Box key={index}>
        <Text color={defaultColor}>{indent}{num}. </Text>
        {parseInlineMarkdown(content, defaultColor)}
      </Box>
    );
  }

  // Table row detection (| col | col |)
  if (line.includes('|') && (line.trim().startsWith('|') || line.includes(' | '))) {
    // Keep table formatting as-is but with subtle styling
    const isSeparator = line.match(/^[\s|:-]+$/);
    if (isSeparator) {
      return (
        <Box key={index}>
          <Text color={theme.dim}>{line}</Text>
        </Box>
      );
    }
    return (
      <Box key={index}>
        <Text color={defaultColor}>{line}</Text>
      </Box>
    );
  }

  // Regular line with inline markdown
  return (
    <Box key={index}>
      {parseInlineMarkdown(line, defaultColor)}
    </Box>
  );
}

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
  const textColor = theme.text;

  const termWidth = process.stdout.columns || 80;
  const contentWidth = termWidth - 6;

  // Split content into lines and wrap long lines
  const lines = wrapText(content, contentWidth);

  return (
    <Box flexDirection="column" marginY={1} marginLeft={1}>
      {/* Symbol and title */}
      <Box>
        <Text color={symbolColor}>{'◆ '}</Text>
        <Text color={symbolColor} bold>{title}</Text>
      </Box>

      {/* Content with markdown rendering */}
      <Box flexDirection="column" marginLeft={2}>
        {lines.map((line, i) => renderLine(line, i, textColor))}
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
    // Don't wrap table lines or lines with special formatting
    if (para.includes('|') || para.match(/^#{1,3}\s/) || para.match(/^[\s]*[-*]\s/) || para.match(/^[\s]*\d+\.\s/)) {
      lines.push(para);
      continue;
    }

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

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

// Sophisticated theme
const theme = {
  accent: '#4fd1c5',
  dim: '#4a5568',
  border: '#4a5568',
  suggestion: '#718096',
  text: '#e2e8f0',
};

interface InputProps {
  onSubmit: (value: string) => void;
  placeholder?: string;
  prefix?: string;
  disabled?: boolean;
}

// Available commands for autocomplete
const COMMANDS = ['/help', '/status', '/clear', '/exit', '/plan', '/auto', '/mode', '/agents'];

// Store history globally so it persists across re-renders
const commandHistory: string[] = [];
const MAX_HISTORY = 100;

export const Input: React.FC<InputProps> = ({
  onSubmit,
  placeholder = 'Type a message...',
  prefix = '❯',
  disabled = false,
}) => {
  const [value, setValue] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [tempValue, setTempValue] = useState('');
  const [tabIndex, setTabIndex] = useState(0);

  const termWidth = process.stdout.columns || 80;

  // Get autocomplete suggestion
  const getSuggestion = (): string => {
    if (!value.startsWith('/') || value.length < 1) return '';
    const matches = COMMANDS.filter(cmd => cmd.startsWith(value.toLowerCase()));
    if (matches.length === 0) return '';
    return matches[0].slice(value.length);
  };

  const suggestion = getSuggestion();

  // Navigate history up
  const navigateHistoryUp = () => {
    if (commandHistory.length > 0) {
      if (historyIndex === -1) {
        setTempValue(value);
        const newIndex = commandHistory.length - 1;
        setHistoryIndex(newIndex);
        setValue(commandHistory[newIndex]);
        setCursorPosition(commandHistory[newIndex].length);
      } else if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setValue(commandHistory[newIndex]);
        setCursorPosition(commandHistory[newIndex].length);
      }
    }
  };

  // Navigate history down
  const navigateHistoryDown = () => {
    if (historyIndex !== -1) {
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setValue(commandHistory[newIndex]);
        setCursorPosition(commandHistory[newIndex].length);
      } else {
        setHistoryIndex(-1);
        setValue(tempValue);
        setCursorPosition(tempValue.length);
      }
    }
  };

  useInput((input, key) => {
    if (disabled) return;

    // Handle arrow keys first (including escape sequence fallback)
    const isUpArrow = key.upArrow || input === '\x1b[A' || input === '\x1bOA';
    const isDownArrow = key.downArrow || input === '\x1b[B' || input === '\x1bOB';

    if (key.return) {
      if (value.trim()) {
        if (commandHistory.length === 0 || commandHistory[commandHistory.length - 1] !== value) {
          commandHistory.push(value);
          if (commandHistory.length > MAX_HISTORY) {
            commandHistory.shift();
          }
        }
        onSubmit(value);
        setValue('');
        setCursorPosition(0);
        setHistoryIndex(-1);
        setTempValue('');
      }
    } else if (isUpArrow) {
      navigateHistoryUp();
    } else if (isDownArrow) {
      navigateHistoryDown();
    } else if (key.backspace || key.delete) {
      if (cursorPosition > 0) {
        setValue(prev => prev.slice(0, cursorPosition - 1) + prev.slice(cursorPosition));
        setCursorPosition(pos => pos - 1);
        setHistoryIndex(-1);
      }
    } else if (key.leftArrow) {
      setCursorPosition(pos => Math.max(0, pos - 1));
    } else if (key.rightArrow) {
      setCursorPosition(pos => Math.min(value.length, pos + 1));
    } else if (key.ctrl && input === 'c') {
      // Do nothing - allow text selection copy, use double-escape to exit
    } else if (key.ctrl && input === 'u') {
      setValue('');
      setCursorPosition(0);
      setHistoryIndex(-1);
    } else if (key.ctrl && input === 'a') {
      setCursorPosition(0);
    } else if (key.ctrl && input === 'e') {
      setCursorPosition(value.length);
    } else if (key.tab && !key.shift) {
      // Plain Tab for autocomplete (Shift+Tab handled by App for mode cycling)
      if (suggestion) {
        const completed = value + suggestion;
        setValue(completed);
        setCursorPosition(completed.length);
      } else if (value.startsWith('/')) {
        const matches = COMMANDS.filter(cmd => cmd.startsWith(value.toLowerCase()));
        if (matches.length > 0) {
          const nextIndex = (tabIndex + 1) % matches.length;
          setTabIndex(nextIndex);
          setValue(matches[nextIndex]);
          setCursorPosition(matches[nextIndex].length);
        }
      }
    } else if (!key.ctrl && !key.meta && input) {
      setValue(prev => prev.slice(0, cursorPosition) + input + prev.slice(cursorPosition));
      setCursorPosition(pos => pos + input.length);
      setHistoryIndex(-1);
      setTabIndex(0);
    }
  });

  // Render input with cursor
  const beforeCursor = value.slice(0, cursorPosition);
  const atCursor = value[cursorPosition] || ' ';
  const afterCursor = value.slice(cursorPosition + 1);

  return (
    <Box flexDirection="column">
      {/* Top separator line */}
      <Box>
        <Text color={theme.border}>{'─'.repeat(termWidth)}</Text>
      </Box>

      {/* Input line with prefix */}
      <Box paddingX={1}>
        <Text color={theme.accent}>{prefix} </Text>
        {value.length === 0 && !disabled ? (
          <Text color={theme.dim}>{placeholder}</Text>
        ) : (
          <>
            <Text color={theme.text}>{beforeCursor}</Text>
            <Text inverse>{atCursor}</Text>
            <Text color={theme.text}>{afterCursor}</Text>
            {suggestion && cursorPosition === value.length && (
              <Text color={theme.suggestion}>{suggestion}</Text>
            )}
          </>
        )}
        {disabled && <Text color={theme.dim}> processing...</Text>}
      </Box>

      {/* Bottom separator line */}
      <Box>
        <Text color={theme.border}>{'─'.repeat(termWidth)}</Text>
      </Box>
    </Box>
  );
};

export default Input;

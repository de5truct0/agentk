import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

// Sophisticated theme
const theme = {
  accent: '#4fd1c5',
  dim: '#4a5568',
  suggestion: '#718096',
};

interface InputProps {
  onSubmit: (value: string) => void;
  placeholder?: string;
  prefix?: string;
  disabled?: boolean;
}

// Available commands for autocomplete
const COMMANDS = ['/help', '/status', '/clear', '/exit', '/mode'];

// Store history globally so it persists across re-renders
const commandHistory: string[] = [];
const MAX_HISTORY = 100;

export const Input: React.FC<InputProps> = ({
  onSubmit,
  placeholder = 'Type a message...',
  prefix = '>',
  disabled = false,
}) => {
  const [value, setValue] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [tempValue, setTempValue] = useState(''); // Store current input when browsing history
  const [tabIndex, setTabIndex] = useState(0); // For cycling through completions

  // Get autocomplete suggestion
  const getSuggestion = (): string => {
    if (!value.startsWith('/') || value.length < 1) return '';
    const matches = COMMANDS.filter(cmd => cmd.startsWith(value.toLowerCase()));
    if (matches.length === 0) return '';
    return matches[0].slice(value.length);
  };

  const suggestion = getSuggestion();

  useInput((input, key) => {
    if (disabled) return;

    if (key.return) {
      if (value.trim()) {
        // Add to history (avoid duplicates at the end)
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
    } else if (key.upArrow) {
      // Navigate history backwards
      if (commandHistory.length > 0) {
        if (historyIndex === -1) {
          // Save current input before browsing history
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
    } else if (key.downArrow) {
      // Navigate history forwards
      if (historyIndex !== -1) {
        if (historyIndex < commandHistory.length - 1) {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          setValue(commandHistory[newIndex]);
          setCursorPosition(commandHistory[newIndex].length);
        } else {
          // Return to the original input
          setHistoryIndex(-1);
          setValue(tempValue);
          setCursorPosition(tempValue.length);
        }
      }
    } else if (key.backspace || key.delete) {
      if (cursorPosition > 0) {
        setValue(prev => prev.slice(0, cursorPosition - 1) + prev.slice(cursorPosition));
        setCursorPosition(pos => pos - 1);
        setHistoryIndex(-1); // Reset history navigation on edit
      }
    } else if (key.leftArrow) {
      setCursorPosition(pos => Math.max(0, pos - 1));
    } else if (key.rightArrow) {
      setCursorPosition(pos => Math.min(value.length, pos + 1));
    } else if (key.ctrl && input === 'c') {
      process.exit(0);
    } else if (key.ctrl && input === 'u') {
      // Clear line
      setValue('');
      setCursorPosition(0);
      setHistoryIndex(-1);
    } else if (key.ctrl && input === 'a') {
      // Go to beginning
      setCursorPosition(0);
    } else if (key.ctrl && input === 'e') {
      // Go to end
      setCursorPosition(value.length);
    } else if (key.tab) {
      // Tab completion
      if (suggestion) {
        const completed = value + suggestion;
        setValue(completed);
        setCursorPosition(completed.length);
      } else if (value.startsWith('/')) {
        // Cycle through matching commands
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
      setHistoryIndex(-1); // Reset history navigation on edit
      setTabIndex(0); // Reset tab completion cycle
    }
  });

  // Render input with cursor
  const beforeCursor = value.slice(0, cursorPosition);
  const atCursor = value[cursorPosition] || ' ';
  const afterCursor = value.slice(cursorPosition + 1);

  return (
    <Box marginTop={1}>
      <Text color={theme.accent} bold>{prefix} </Text>
      {value.length === 0 && !disabled ? (
        <Text color={theme.dim}>{placeholder}</Text>
      ) : (
        <>
          <Text>{beforeCursor}</Text>
          <Text inverse>{atCursor}</Text>
          <Text>{afterCursor}</Text>
          {suggestion && cursorPosition === value.length && (
            <Text color={theme.suggestion}>{suggestion}</Text>
          )}
        </>
      )}
      {disabled && <Text color={theme.dim}> processing...</Text>}
    </Box>
  );
};

export default Input;

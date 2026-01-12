import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors, icons } from '../themes/retro.js';

interface InputProps {
  onSubmit: (value: string) => void;
  placeholder?: string;
  prefix?: string;
  disabled?: boolean;
}

export const Input: React.FC<InputProps> = ({
  onSubmit,
  placeholder = 'Type a message...',
  prefix = '>',
  disabled = false,
}) => {
  const [value, setValue] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);

  useInput((input, key) => {
    if (disabled) return;

    if (key.return) {
      if (value.trim()) {
        onSubmit(value);
        setValue('');
        setCursorPosition(0);
      }
    } else if (key.backspace || key.delete) {
      if (cursorPosition > 0) {
        setValue(prev => prev.slice(0, cursorPosition - 1) + prev.slice(cursorPosition));
        setCursorPosition(pos => pos - 1);
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
    } else if (!key.ctrl && !key.meta && input) {
      setValue(prev => prev.slice(0, cursorPosition) + input + prev.slice(cursorPosition));
      setCursorPosition(pos => pos + input.length);
    }
  });

  // Render input with cursor
  const beforeCursor = value.slice(0, cursorPosition);
  const atCursor = value[cursorPosition] || ' ';
  const afterCursor = value.slice(cursorPosition + 1);

  return (
    <Box marginTop={1}>
      <Text color={colors.primary} bold>{prefix} </Text>
      {value.length === 0 && !disabled ? (
        <Text dimColor>{placeholder}</Text>
      ) : (
        <>
          <Text>{beforeCursor}</Text>
          <Text inverse>{atCursor}</Text>
          <Text>{afterCursor}</Text>
        </>
      )}
      {disabled && <Text dimColor> {icons.sparkle} thinking...</Text>}
    </Box>
  );
};

export default Input;

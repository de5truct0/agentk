import React, { useState, useCallback, memo } from 'react';
import { Box, Text, useInput } from 'ink';

export interface QuestionOption {
  label: string;
  recommended?: boolean;
}

export interface Question {
  header: string;
  question: string;
  options: QuestionOption[];
  answer?: string;
}

export interface QuestionWizardProps {
  questions: Question[];
  onComplete: (answers: { header: string; answer: string }[]) => void;
  onCancel: () => void;
}

const theme = {
  border: '#2d3748',
  accent: '#4fd1c5',
  highlight: '#81e6d9',
  text: '#e2e8f0',
  dim: '#4a5568',
  selected: '#4fd1c5',
  unselected: '#718096',
  answered: '#48bb78',
  header: '#63b3ed',
  no: '#e53e3e',
};

interface WizardState {
  questions: Question[];
  currentIndex: number;
  selectedOption: number;
  customInputMode: boolean;
  customInputValue: string;
  cursorPosition: number;
}

const QuestionWizardInner: React.FC<QuestionWizardProps> = ({
  questions: initialQuestions,
  onComplete,
  onCancel,
}) => {
  // Single state object for atomic updates
  const [state, setState] = useState<WizardState>({
    questions: initialQuestions,
    currentIndex: 0,
    selectedOption: 0,
    customInputMode: false,
    customInputValue: '',
    cursorPosition: 0,
  });

  const { questions, currentIndex, selectedOption, customInputMode, customInputValue, cursorPosition } = state;

  const currentQuestion = questions[currentIndex];
  const allOptions = [...currentQuestion.options, { label: 'No', recommended: false }];
  const isOnNoOption = selectedOption === allOptions.length - 1;

  const termWidth = process.stdout.columns || 80;

  // Update state atomically
  const updateState = useCallback((updates: Partial<WizardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Set answer and optionally advance
  const selectOption = useCallback((answer: string, shouldAdvance: boolean) => {
    setState(prev => {
      const updatedQuestions = [...prev.questions];
      updatedQuestions[prev.currentIndex] = {
        ...updatedQuestions[prev.currentIndex],
        answer
      };

      // Check if this is the last question and all are answered
      const isLast = prev.currentIndex === prev.questions.length - 1;
      const allAnswered = updatedQuestions.every(q => q.answer !== undefined);

      if (isLast && allAnswered) {
        // Will complete after state update
        setTimeout(() => {
          onComplete(updatedQuestions.map(q => ({
            header: q.header,
            answer: q.answer || '',
          })));
        }, 0);
        return prev; // Keep current state, will unmount soon
      }

      return {
        ...prev,
        questions: updatedQuestions,
        currentIndex: shouldAdvance && !isLast ? prev.currentIndex + 1 : prev.currentIndex,
        selectedOption: shouldAdvance && !isLast ? 0 : prev.selectedOption,
        customInputMode: false,
        customInputValue: '',
        cursorPosition: 0,
      };
    });
  }, [onComplete]);

  useInput((input, key) => {
    if (customInputMode) {
      if (key.escape) {
        updateState({ customInputMode: false, customInputValue: '', cursorPosition: 0 });
      } else if (key.return && customInputValue.trim()) {
        selectOption(customInputValue.trim(), true);
      } else if (key.backspace || key.delete) {
        if (cursorPosition > 0) {
          updateState({
            customInputValue: customInputValue.slice(0, cursorPosition - 1) + customInputValue.slice(cursorPosition),
            cursorPosition: cursorPosition - 1,
          });
        }
      } else if (key.leftArrow) {
        updateState({ cursorPosition: Math.max(0, cursorPosition - 1) });
      } else if (key.rightArrow) {
        updateState({ cursorPosition: Math.min(customInputValue.length, cursorPosition + 1) });
      } else if (!key.ctrl && !key.meta && input) {
        updateState({
          customInputValue: customInputValue.slice(0, cursorPosition) + input + customInputValue.slice(cursorPosition),
          cursorPosition: cursorPosition + input.length,
        });
      }
      return;
    }

    // Selection mode
    if (key.upArrow) {
      updateState({ selectedOption: selectedOption > 0 ? selectedOption - 1 : allOptions.length - 1 });
    } else if (key.downArrow) {
      updateState({ selectedOption: selectedOption < allOptions.length - 1 ? selectedOption + 1 : 0 });
    } else if (key.leftArrow && currentIndex > 0) {
      updateState({ currentIndex: currentIndex - 1, selectedOption: 0 });
    } else if (key.rightArrow && currentIndex < questions.length - 1 && currentQuestion.answer) {
      updateState({ currentIndex: currentIndex + 1, selectedOption: 0 });
    } else if (key.tab) {
      // Tab always opens custom input mode
      updateState({ customInputMode: true, customInputValue: '', cursorPosition: 0 });
    } else if (key.return && isOnNoOption) {
      // Enter on "No" also opens custom input
      updateState({ customInputMode: true, customInputValue: '', cursorPosition: 0 });
    } else if (key.return && !isOnNoOption) {
      selectOption(allOptions[selectedOption].label, true);
    } else if (key.escape) {
      onCancel();
    } else {
      const num = parseInt(input, 10);
      if (!isNaN(num) && num > 0 && num <= allOptions.length) {
        updateState({ selectedOption: num - 1 });
      }
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.border} paddingX={2} paddingY={1}>
      {/* Question tabs */}
      <Box>
        {questions.map((q, i) => {
          const isCurrent = i === currentIndex;
          const isAnswered = q.answer !== undefined;
          const color = isCurrent ? theme.accent : isAnswered ? theme.answered : theme.unselected;
          return (
            <React.Fragment key={i}>
              <Text color={color} bold={isCurrent}>[{isAnswered ? `${q.header} ✓` : q.header}]</Text>
              {i < questions.length - 1 && <Text color={theme.dim}>   </Text>}
            </React.Fragment>
          );
        })}
      </Box>

      {/* Progress dots */}
      <Box marginY={1}>
        {questions.map((q, i) => {
          const isAnswered = q.answer !== undefined;
          const isCurrent = i === currentIndex;
          return (
            <React.Fragment key={i}>
              <Text color={isAnswered ? theme.answered : isCurrent ? theme.accent : theme.dim}>
                {isAnswered ? '✓' : isCurrent ? '●' : '○'}
              </Text>
              {i < questions.length - 1 && <Text color={theme.dim}>────</Text>}
            </React.Fragment>
          );
        })}
      </Box>

      {/* Current question header */}
      <Box>
        <Text color={theme.accent}>◆ </Text>
        <Text color={theme.header} bold>{currentQuestion.header}</Text>
      </Box>

      {/* Question text */}
      <Box marginLeft={2} marginBottom={1}>
        <Text color={theme.text}>{currentQuestion.question}</Text>
      </Box>

      {/* Options with inline custom input on "No" */}
      <Box flexDirection="column" marginLeft={2}>
        {allOptions.map((opt, idx) => {
          const isSelected = idx === selectedOption;
          const isNo = idx === allOptions.length - 1;

          if (isNo) {
            // "No" option with inline custom input
            return (
              <Box key={idx}>
                <Text color={isSelected ? (customInputMode ? theme.selected : theme.no) : theme.unselected}>
                  {isSelected ? '❯' : ' '} {idx + 1}. No
                </Text>
                {customInputMode ? (
                  <>
                    <Text color={theme.dim}>, </Text>
                    <Text color={theme.text}>{customInputValue.slice(0, cursorPosition)}</Text>
                    <Text inverse>{customInputValue[cursorPosition] || ' '}</Text>
                    <Text color={theme.text}>{customInputValue.slice(cursorPosition + 1)}</Text>
                  </>
                ) : (
                  <Text color={theme.dim}> (Tab to type custom)</Text>
                )}
              </Box>
            );
          }

          return (
            <Text
              key={idx}
              color={isSelected ? theme.selected : theme.unselected}
            >
              {isSelected ? '❯' : ' '} {idx + 1}. {opt.recommended ? `${opt.label} (Recommended)` : opt.label}
            </Text>
          );
        })}
      </Box>

      {/* Help text */}
      <Box marginTop={1}>
        <Text color={theme.dim}>
          {customInputMode ? 'Type your answer · Enter submit · Esc cancel' : '↑/↓ select · Enter confirm · Tab custom · ←/→ questions'}
        </Text>
      </Box>
    </Box>
  );
};

// Memoize to prevent unnecessary re-renders
export const QuestionWizard = memo(QuestionWizardInner);

export default QuestionWizard;

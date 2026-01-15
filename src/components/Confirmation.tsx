import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export interface ConfirmationOption {
    label: string;
    value: string;
    key?: string;
}

export interface ConfirmationProps {
    message: string;
    options: ConfirmationOption[];
    onSelect: (value: string) => void;
    onCancel: () => void;
}

const theme = {
    selected: '#4fd1c5', // teal-400
    unselected: '#a0aec0', // gray-400
    message: '#e2e8f0', // gray-200
    key: '#718096', // gray-500
    border: '#2d3748', // gray-800
};

export const Confirmation: React.FC<ConfirmationProps> = ({
    message,
    options,
    onSelect,
    onCancel,
}) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useInput((input, key) => {
        if (key.upArrow) {
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
        } else if (key.downArrow) {
            setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
        } else if (key.return) {
            onSelect(options[selectedIndex].value);
        } else if (key.escape) {
            onCancel();
        } else {
            // Handle number keys (1-9)
            const num = parseInt(input, 10);
            if (!isNaN(num) && num > 0 && num <= options.length) {
                onSelect(options[num - 1].value);
            }
        }
    });

    return (
        <Box flexDirection="column" borderStyle="round" borderColor={theme.border} padding={1}>
            <Text color={theme.message} bold>{message}</Text>
            <Box height={1} />

            {options.map((option, index) => {
                const isSelected = index === selectedIndex;
                const prefix = isSelected ? '❯' : ' ';

                return (
                    <Box key={option.value} marginLeft={1}>
                        <Text color={isSelected ? theme.selected : theme.unselected}>
                            {prefix} {index + 1}. {option.label}
                        </Text>
                        {option.key && (
                            <Box marginLeft={1}>
                                <Text color={theme.key}>({option.key})</Text>
                            </Box>
                        )}
                    </Box>
                );
            })}

            <Box height={1} />
            <Text color={theme.key} dimColor>
                Use ↑/↓ to navigate, Enter to select, Esc to cancel
            </Text>
        </Box>
    );
};

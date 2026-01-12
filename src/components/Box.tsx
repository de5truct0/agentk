import React from 'react';
import { Box as InkBox, Text } from 'ink';
import { box, colors } from '../themes/retro.js';

interface RetroBoxProps {
  title?: string;
  children: React.ReactNode;
  color?: string;
  width?: number | string;
}

export const RetroBox: React.FC<RetroBoxProps> = ({
  title,
  children,
  color = colors.secondary,
  width = '100%',
}) => {
  const termWidth = process.stdout.columns || 80;
  const boxWidth = typeof width === 'number' ? width : Math.min(termWidth - 2, 80);

  const titleText = title ? ` ${title} ` : '';
  const topLineWidth = boxWidth - 2 - titleText.length;
  const topLine = box.horizontal.repeat(Math.max(0, topLineWidth));

  return (
    <InkBox flexDirection="column" width={boxWidth}>
      {/* Top border */}
      <Text color={color}>
        {box.topLeft}{box.horizontal}{title && <Text bold>{titleText}</Text>}{topLine}{box.topRight}
      </Text>

      {/* Content */}
      <InkBox flexDirection="column" paddingX={1}>
        {React.Children.map(children, (child) => (
          <InkBox>
            <Text color={color}>{box.vertical}</Text>
            <InkBox flexGrow={1} paddingX={1}>
              {child}
            </InkBox>
            <Text color={color}>{box.vertical}</Text>
          </InkBox>
        ))}
      </InkBox>

      {/* Bottom border */}
      <Text color={color}>
        {box.bottomLeft}{box.horizontal.repeat(boxWidth - 2)}{box.bottomRight}
      </Text>
    </InkBox>
  );
};

export default RetroBox;

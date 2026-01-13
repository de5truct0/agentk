import React, { useState } from 'react';
import { Box, Text, useApp, useInput, Static } from 'ink';
import { Banner } from './Banner.js';
import { ChatMessage } from './ChatMessage.js';
import { Input } from './Input.js';
import { StatusBar } from './StatusBar.js';
import { ThinkingIndicator } from './ThinkingIndicator.js';
import { runClaude } from '../lib/claude.js';

interface Message {
  id: string;
  role: 'user' | 'agent';
  agentName?: string;
  content: string;
  tokens?: { input: number; output: number };
  timestamp: Date;
}

interface AppProps {
  mode: 'dev' | 'ml';
  version: string;
}

export const App: React.FC<AppProps> = ({ mode, version }) => {
  const { exit } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStartTime, setProcessingStartTime] = useState<Date | null>(null);
  const [totalTokens, setTotalTokens] = useState(0);
  const [startTime] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  // Handle input submission
  const handleSubmit = async (input: string) => {
    // Check for commands
    if (input.startsWith('/')) {
      handleCommand(input);
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    setProcessingStartTime(new Date());
    setError(null);

    try {
      // Call Claude
      const result = await runClaude(input, mode);

      // Add agent response
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        agentName: 'Orchestrator',
        content: result.response,
        tokens: result.tokens,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, agentMessage]);

      // Update token count
      if (result.tokens) {
        setTotalTokens(prev => prev + result.tokens.input + result.tokens.output);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
      setProcessingStartTime(null);
    }
  };

  // Handle slash commands
  const handleCommand = (cmd: string) => {
    const [command] = cmd.slice(1).split(' ');

    switch (command) {
      case 'exit':
      case 'quit':
        exit();
        break;
      case 'clear':
        setMessages([]);
        break;
      case 'help':
        const helpMessage: Message = {
          id: Date.now().toString(),
          role: 'agent',
          agentName: 'System',
          content: `Available commands:
/help     - Show this help
/clear    - Clear chat history
/status   - Show session status
/exit     - Exit AGENT-K

Keyboard shortcuts:
↑/↓       - Browse command history
Ctrl+C    - Exit
Ctrl+U    - Clear input line
Ctrl+A/E  - Jump to start/end`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, helpMessage]);
        break;
      case 'status':
        const statusMessage: Message = {
          id: Date.now().toString(),
          role: 'agent',
          agentName: 'System',
          content: `Session Status:
◇ Mode: ${mode === 'dev' ? 'Development' : 'ML Research'}
◇ Messages: ${messages.length}
◇ Total Tokens: ${totalTokens}
◇ Session Time: ${formatElapsed(startTime)}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, statusMessage]);
        break;
      default:
        setError(`Unknown command: /${command}`);
    }
  };

  // Handle Ctrl+C
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
    }
  });

  return (
    <Box flexDirection="column">
      {/* Banner - only show when no messages (initial state) */}
      {messages.length === 0 && <Banner version={version} />}

      {/* Static chat history - won't re-render/scroll */}
      <Static items={messages}>
        {(msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            agentName={msg.agentName}
            content={msg.content}
            tokens={msg.tokens}
          />
        )}
      </Static>

      {/* Processing indicator */}
      {isProcessing && processingStartTime && (
        <ThinkingIndicator startTime={processingStartTime} />
      )}

      {/* Error display */}
      {error && (
        <Box marginY={1} marginLeft={1}>
          <Text color="#e53e3e">
            ✗ Error: {error}
          </Text>
        </Box>
      )}

      {/* Input */}
      <Input
        onSubmit={handleSubmit}
        disabled={isProcessing}
        placeholder="Type a message or /help for commands..."
      />

      {/* Status bar */}
      <StatusBar
        mode={mode}
        tokens={totalTokens}
        startTime={startTime}
        isProcessing={isProcessing}
      />
    </Box>
  );
};

function formatElapsed(start: Date): string {
  const secs = Math.floor((Date.now() - start.getTime()) / 1000);
  const mins = Math.floor(secs / 60);
  const remainingSecs = secs % 60;
  return mins > 0 ? `${mins}m ${remainingSecs}s` : `${secs}s`;
}

export default App;

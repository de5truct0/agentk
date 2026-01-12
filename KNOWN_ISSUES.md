# AGENT-K: Known Issues & Challenges

This document tracks potential issues, challenges, and limitations of the multi-agent system. Review and address these before production use.

## Critical Issues

### 1. Race Conditions & File Conflicts
- **Problem**: Multiple agents may try to modify the same file simultaneously
- **Impact**: Corrupted files, lost changes, merge conflicts
- **Mitigation Ideas**:
  - File locking mechanism
  - Sequential task execution for same files
  - Git-based conflict detection

### 2. Context Isolation
- **Problem**: Each Claude subprocess has separate context - agents can't "see" what others are doing in real-time
- **Impact**: Duplicate work, conflicting approaches, no shared understanding
- **Mitigation Ideas**:
  - Shared context file that all agents read
  - Result aggregation before next agent starts
  - Orchestrator summarizes previous agent outputs

### 3. Cost Multiplication
- **Problem**: Each agent is a separate Claude API call. 4 agents = 4x cost minimum
- **Impact**: Expensive for complex tasks, budget concerns
- **Mitigation Ideas**:
  - Use haiku for simple tasks
  - Cache common research results
  - Only spawn agents when truly needed
  - Cost tracking and budgets

### 4. Rate Limiting
- **Problem**: Anthropic API has rate limits; parallel agents may hit them
- **Impact**: Failed requests, throttled performance
- **Mitigation Ideas**:
  - Agent spawn throttling
  - Retry with backoff
  - Queue system for requests

## High Priority Issues

### 5. Dependency Chain Failures
- **Problem**: If Engineer fails, Tester and Security are waiting forever
- **Impact**: Stuck sessions, wasted resources
- **Mitigation Ideas**:
  - Timeout mechanisms
  - Failure propagation to dependent tasks
  - Automatic task cancellation

### 6. Output Parsing Unreliability
- **Problem**: Claude output is free-form text; parsing structured data is fragile
- **Impact**: Broken task handoffs, lost information
- **Mitigation Ideas**:
  - Strict output format in prompts
  - JSON output mode (if available)
  - Fuzzy parsing with fallbacks

### 7. Working Directory Conflicts
- **Problem**: All agents work in same directory, may step on each other
- **Impact**: File overwrites, inconsistent state
- **Mitigation Ideas**:
  - Assign file ownership to agents
  - Sequential execution for overlapping files
  - Sandboxed workspaces per agent

### 8. Long-Running Task Handling
- **Problem**: ML training can take hours/days; current design expects quick responses
- **Impact**: Timeouts, lost progress, resource waste
- **Mitigation Ideas**:
  - Background task mode with checkpointing
  - Progress polling instead of blocking wait
  - Separate "training" mode with different expectations

### 9. Claude CLI Compatibility
- **Problem**: We assume `claude` CLI supports certain flags (--system-prompt, --print, etc.)
- **Impact**: Script may not work if CLI interface differs
- **Mitigation Ideas**:
  - Version detection
  - Feature capability checking
  - Fallback modes

## Medium Priority Issues

### 10. Session Continuity
- **Problem**: Agents don't share conversation history; each spawn is fresh
- **Impact**: Repeated context loading, inconsistent understanding
- **Mitigation Ideas**:
  - Session context file passed to all agents
  - Resume capability with previous outputs

### 11. Error Recovery & Rollback
- **Problem**: No built-in way to undo agent changes if something goes wrong
- **Impact**: Corrupted projects, manual recovery needed
- **Mitigation Ideas**:
  - Git checkpoint before agent runs
  - Automatic stash/restore
  - Dry-run mode

### 12. Agent Role Confusion
- **Problem**: Agents might do work outside their role (Engineer writing tests)
- **Impact**: Duplicate work, inconsistent quality
- **Mitigation Ideas**:
  - Stricter role boundaries in prompts
  - Task validation before execution
  - Role-specific tool restrictions

### 13. Debugging Difficulty
- **Problem**: When multi-agent task fails, hard to trace which agent caused issue
- **Impact**: Long debugging sessions, unclear root causes
- **Mitigation Ideas**:
  - Comprehensive logging
  - Task trace IDs
  - Replay capability

### 14. User Interruption Handling
- **Problem**: User presses Ctrl+C mid-task; agents may be in inconsistent state
- **Impact**: Orphaned processes, partial changes, resource leaks
- **Mitigation Ideas**:
  - Graceful shutdown signals
  - Task state persistence
  - Cleanup on interrupt

### 15. Scout Reliability
- **Problem**: Web searches may fail, return outdated info, or be blocked
- **Impact**: Scout provides wrong recommendations
- **Mitigation Ideas**:
  - Multiple search sources
  - Verification prompts
  - Fallback to training data with warning

## Lower Priority Issues

### 16. tmux Visual Mode Complexity
- **Problem**: tmux integration adds complexity and potential failure points
- **Impact**: Crashes, confusing UI, platform-specific bugs
- **Mitigation Ideas**:
  - Make visual mode optional (it is)
  - Graceful fallback
  - Extensive testing

### 17. Cross-Platform Compatibility
- **Problem**: Bash scripts may not work identically on Linux/macOS/WSL
- **Impact**: Installation failures, runtime errors
- **Mitigation Ideas**:
  - POSIX-compliant where possible
  - Platform detection
  - CI testing on multiple platforms

### 18. Distribution Complexity
- **Problem**: Supporting Homebrew, npm, pip, shell installer is a lot of maintenance
- **Impact**: Broken packages, version drift
- **Mitigation Ideas**:
  - Automated release pipeline
  - Single source of truth for version
  - Prioritize one distribution method

### 19. Agent Prompt Evolution
- **Problem**: Agent prompts need tuning based on real usage
- **Impact**: Suboptimal agent behavior initially
- **Mitigation Ideas**:
  - Version prompts
  - A/B testing capability
  - User feedback collection

### 20. Security Concerns
- **Problem**: Agents have full file system access in working directory
- **Impact**: Malicious prompts could cause damage
- **Mitigation Ideas**:
  - Sandboxing considerations
  - Confirmation for destructive actions
  - Audit logging

## Future Considerations

### 21. Scaling Beyond Single Machine
- How to run agents across multiple machines?
- Cloud-based agent pools?

### 22. Custom Agent Definition
- Allow users to define their own agent types
- Plugin system?

### 23. Persistent Agent Memory
- Agents learn from past tasks in this project
- Project-specific fine-tuning?

### 24. Team Collaboration
- Multiple users coordinating agents
- Shared agent pools?

### 25. Integration with CI/CD
- Agents triggered by PRs, commits
- Automated code review pipeline

---

## Status Legend
- 🔴 Critical - Must fix before v1.0
- 🟡 High - Should fix before v1.0
- 🟢 Medium - Nice to have for v1.0
- ⚪ Low - Post v1.0

## Review Checklist
- [ ] Review each issue
- [ ] Prioritize based on your use case
- [ ] Decide which mitigations to implement
- [ ] Create implementation plan

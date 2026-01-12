#!/usr/bin/env bash
# AGENT-K Spawn Library
# Claude subprocess spawning and management
# Compatible with bash 3.x (no associative arrays)

set -euo pipefail

# Source dependencies (use AGENTK_ROOT if set, otherwise compute local path)
_SPAWN_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${AGENTK_ROOT:-}" ]]; then
    source "$_SPAWN_SCRIPT_DIR/core.sh"
    source "$_SPAWN_SCRIPT_DIR/ipc.sh"
fi

# =============================================================================
# PID FILE MANAGEMENT (bash 3.x compatible)
# =============================================================================

_get_agent_pid_file() {
    local agent="$1"
    echo "$AGENTK_WORKSPACE/.pids/${agent}.pid"
}

_get_agent_task_file() {
    local agent="$1"
    echo "$AGENTK_WORKSPACE/.pids/${agent}.task"
}

_set_agent_pid() {
    local agent="$1"
    local pid="$2"
    local pid_dir="$AGENTK_WORKSPACE/.pids"
    mkdir -p "$pid_dir"
    echo "$pid" > "$(_get_agent_pid_file "$agent")"
}

_get_agent_pid() {
    local agent="$1"
    local pid_file
    pid_file="$(_get_agent_pid_file "$agent")"
    if [[ -f "$pid_file" ]]; then
        cat "$pid_file"
    else
        echo ""
    fi
}

_clear_agent_pid() {
    local agent="$1"
    rm -f "$(_get_agent_pid_file "$agent")"
}

_set_agent_task() {
    local agent="$1"
    local task_id="$2"
    local pid_dir="$AGENTK_WORKSPACE/.pids"
    mkdir -p "$pid_dir"
    echo "$task_id" > "$(_get_agent_task_file "$agent")"
}

_get_agent_task() {
    local agent="$1"
    local task_file
    task_file="$(_get_agent_task_file "$agent")"
    if [[ -f "$task_file" ]]; then
        cat "$task_file"
    else
        echo ""
    fi
}

_clear_agent_task() {
    local agent="$1"
    rm -f "$(_get_agent_task_file "$agent")"
}

_list_active_agents() {
    local pid_dir="$AGENTK_WORKSPACE/.pids"
    if [[ -d "$pid_dir" ]]; then
        for pid_file in "$pid_dir"/*.pid; do
            if [[ -f "$pid_file" ]]; then
                basename "$pid_file" .pid
            fi
        done
    fi
}

# =============================================================================
# AGENT PROMPT LOADING
# =============================================================================

get_agent_prompt_file() {
    local mode="$1"
    local agent="$2"

    local prompt_file

    # Check for shared agents first
    if [[ -f "$AGENTK_ROOT/modes/shared/${agent}.md" ]]; then
        prompt_file="$AGENTK_ROOT/modes/shared/${agent}.md"
    else
        prompt_file="$AGENTK_ROOT/modes/${mode}/${agent}.md"
    fi

    if [[ -f "$prompt_file" ]]; then
        echo "$prompt_file"
    else
        log_error "Agent prompt not found: $prompt_file"
        return 1
    fi
}

load_agent_prompt() {
    local mode="$1"
    local agent="$2"

    local prompt_file
    prompt_file=$(get_agent_prompt_file "$mode" "$agent")

    if [[ -f "$prompt_file" ]]; then
        cat "$prompt_file"
    else
        return 1
    fi
}

build_agent_system_prompt() {
    local mode="$1"
    local agent="$2"
    local task_context="${3:-}"

    local date_context
    date_context=$(get_date_context)

    local agent_prompt
    agent_prompt=$(load_agent_prompt "$mode" "$agent")

    cat <<EOF
$date_context

$agent_prompt

---
CURRENT TASK CONTEXT:
$task_context
EOF
}

# =============================================================================
# AGENT SPAWNING
# =============================================================================

spawn_agent() {
    local agent="$1"
    local task_id="$2"
    local mode="${3:-dev}"

    local task_file
    task_file=$(get_task_file "$task_id")

    if [[ ! -f "$task_file" ]]; then
        log_error "Task not found: $task_id"
        return 1
    fi

    # Read task details
    local prompt
    prompt=$(jq -r '.prompt' "$task_file")
    local context_files
    context_files=$(jq -r '.context.files | join(", ")' "$task_file")

    local task_context="Task ID: $task_id
Prompt: $prompt
Context Files: $context_files"

    # Build system prompt
    local system_prompt
    system_prompt=$(build_agent_system_prompt "$mode" "$agent" "$task_context")

    # Update task status
    update_task_status "$task_id" "$STATUS_IN_PROGRESS"
    update_session_agent "$agent" "working" "Processing task $task_id"

    # Get agent log file
    local log_file
    log_file=$(get_agent_log "$agent")

    log_info "Spawning agent: $agent for task: $task_id"

    # Spawn claude in background
    (
        # Write system prompt to temp file for claude to read
        local prompt_file
        prompt_file=$(mktemp)
        echo "$system_prompt" > "$prompt_file"

        # Run claude with the task
        local output
        if output=$(claude --print "$prompt" --system-prompt "$prompt_file" 2>&1); then
            # Success - create result
            create_result "$task_id" "$agent" "$STATUS_COMPLETED" "$output" "[]" "[]"
            update_session_agent "$agent" "done" "Completed task $task_id"
        else
            # Failed
            create_result "$task_id" "$agent" "$STATUS_FAILED" "$output" "[]" "[]"
            update_session_agent "$agent" "failed" "Failed task $task_id"
        fi

        # Cleanup
        rm -f "$prompt_file"

    ) >> "$log_file" 2>&1 &

    local pid=$!
    _set_agent_pid "$agent" "$pid"
    _set_agent_task "$agent" "$task_id"

    log_debug "Agent $agent spawned with PID: $pid"
    echo "$pid"
}

spawn_agent_interactive() {
    local agent="$1"
    local mode="${2:-dev}"
    local initial_prompt="${3:-}"

    # Build system prompt
    local system_prompt
    system_prompt=$(build_agent_system_prompt "$mode" "$agent" "Interactive session")

    # Write system prompt to temp file
    local prompt_file
    prompt_file=$(mktemp)
    echo "$system_prompt" > "$prompt_file"

    log_info "Starting interactive session with agent: $agent"

    # Run claude with JSON output to capture tokens
    local output_file
    output_file=$(mktemp)

    if [[ -n "$initial_prompt" ]]; then
        # Run with --print to get non-interactive output with token info
        if claude --print --output-format json --system-prompt "$prompt_file" "$initial_prompt" > "$output_file" 2>&1; then
            # Parse and display response
            _parse_and_display_response "$output_file"
        else
            # Fallback: show raw output on error
            cat "$output_file"
        fi
    else
        # Interactive mode - can't easily capture tokens, run normally
        claude --system-prompt "$prompt_file"
    fi

    # Cleanup
    rm -f "$prompt_file" "$output_file"
}

# Parse JSON response and extract tokens
_parse_and_display_response() {
    local output_file="$1"

    # Check if output is valid JSON
    if jq -e . "$output_file" >/dev/null 2>&1; then
        # Extract the response text - handle different JSON structures
        local response
        response=$(jq -r '
            if .result then .result
            elif .content then
                if type == "array" then .[].text
                else .content
                end
            elif .text then .text
            else .
            end
        ' "$output_file" 2>/dev/null)

        # Extract token counts - check various possible locations
        local input_tokens output_tokens total_tokens
        input_tokens=$(jq -r '
            .usage.input_tokens //
            .inputTokens //
            .stats.input_tokens //
            0
        ' "$output_file" 2>/dev/null)
        output_tokens=$(jq -r '
            .usage.output_tokens //
            .outputTokens //
            .stats.output_tokens //
            0
        ' "$output_file" 2>/dev/null)

        # Handle null values
        [[ "$input_tokens" == "null" || -z "$input_tokens" ]] && input_tokens=0
        [[ "$output_tokens" == "null" || -z "$output_tokens" ]] && output_tokens=0

        total_tokens=$((input_tokens + output_tokens))

        # Update session token count via file
        if [[ $total_tokens -gt 0 ]] && [[ -n "${_TOKEN_FILE:-}" ]]; then
            local current
            current=$(cat "$_TOKEN_FILE" 2>/dev/null || echo "0")
            echo "$((current + total_tokens))" > "$_TOKEN_FILE"
        fi

        # Display the response
        echo "$response"

        # Show token info in dim text
        if [[ $total_tokens -gt 0 ]]; then
            printf "\n${DIM}↑ %d tokens (in: %d, out: %d)${RESET}\n" "$total_tokens" "$input_tokens" "$output_tokens"
        fi
    else
        # Not JSON, display as-is (probably an error or plain text)
        cat "$output_file"
    fi
}

# =============================================================================
# AGENT MANAGEMENT
# =============================================================================

is_agent_running() {
    local agent="$1"

    local pid
    pid=$(_get_agent_pid "$agent")

    if [[ -z "$pid" ]]; then
        return 1
    fi

    if kill -0 "$pid" 2>/dev/null; then
        return 0
    else
        # Agent finished, clean up
        _clear_agent_pid "$agent"
        return 1
    fi
}

wait_agent() {
    local agent="$1"
    local timeout="${2:-300}"

    local pid
    pid=$(_get_agent_pid "$agent")

    if [[ -z "$pid" ]]; then
        log_warn "Agent not running: $agent"
        return 1
    fi

    local elapsed=0

    while kill -0 "$pid" 2>/dev/null && [[ $elapsed -lt $timeout ]]; do
        sleep 1
        elapsed=$((elapsed + 1))
    done

    if kill -0 "$pid" 2>/dev/null; then
        log_warn "Timeout waiting for agent: $agent"
        return 1
    fi

    # Get exit status
    wait "$pid" 2>/dev/null || true
    _clear_agent_pid "$agent"

    log_debug "Agent $agent finished"
    return 0
}

kill_agent() {
    local agent="$1"

    local pid
    pid=$(_get_agent_pid "$agent")

    if [[ -z "$pid" ]]; then
        log_warn "Agent not running: $agent"
        return 0
    fi

    # Try graceful shutdown first
    kill -TERM "$pid" 2>/dev/null || true
    sleep 1

    # Force kill if still running
    if kill -0 "$pid" 2>/dev/null; then
        kill -KILL "$pid" 2>/dev/null || true
    fi

    # Cancel any active task
    local task_id
    task_id=$(_get_agent_task "$agent")
    if [[ -n "$task_id" ]]; then
        cancel_task "$task_id"
        _clear_agent_task "$agent"
    fi

    _clear_agent_pid "$agent"
    update_session_agent "$agent" "stopped" "Killed by user"

    log_info "Killed agent: $agent"
}

kill_all_agents() {
    local agent
    for agent in $(_list_active_agents); do
        kill_agent "$agent"
    done
}

# =============================================================================
# AGENT STATUS
# =============================================================================

get_agent_status() {
    local agent="$1"

    if is_agent_running "$agent"; then
        echo "running"
    else
        local task_id
        task_id=$(_get_agent_task "$agent")
        if [[ -n "$task_id" ]]; then
            local task_status
            task_status=$(get_task_status "$task_id")
            echo "$task_status"
        else
            echo "idle"
        fi
    fi
}

get_all_agent_status() {
    local mode="${1:-dev}"
    local agents

    case "$mode" in
        dev) agents="orchestrator engineer tester security scout" ;;
        ml)  agents="orchestrator researcher ml-engineer data-engineer evaluator scout" ;;
        *)   agents="orchestrator engineer tester security scout" ;;
    esac

    echo "{"
    local first=true
    for agent in $agents; do
        local status
        status=$(get_agent_status "$agent")

        if [[ "$first" == "true" ]]; then
            first=false
        else
            echo ","
        fi
        echo "  \"$agent\": \"$status\""
    done
    echo "}"
}

get_running_agent_count() {
    local count=0
    local agent
    for agent in $(_list_active_agents); do
        if is_agent_running "$agent"; then
            count=$((count + 1))
        fi
    done
    echo "$count"
}
